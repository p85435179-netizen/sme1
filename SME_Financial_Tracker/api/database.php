<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

$config = require __DIR__ . '/../config/database.php';
$driver = validateChoice($config['driver'], ['sqlite', 'mysql']);
if ($driver === 'mysql') {
    if (!preg_match('/^[a-zA-Z0-9_]+$/', $config['database'])) {
        throw new RuntimeException('Invalid database name.');
    }
    $connection = 'mysql:host=' . $config['host'] . ';port=' . $config['port'] . ';charset=utf8mb4';
    $database = new PDO($connection, $config['username'], $config['password']);
    $database->exec(
        'CREATE DATABASE IF NOT EXISTS `' .
            $config['database'] .
            '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );
    $database->exec('USE `' . $config['database'] . '`');
    $database->exec("SET time_zone = '+00:00'");
    $schema = file_get_contents(__DIR__ . '/../database/database.sql');
    $schema = preg_replace(
        '/CREATE DATABASE IF NOT EXISTS[\s\S]*?;|USE\s+`?[a-zA-Z0-9_]+`?\s*;/i',
        '',
        $schema,
    );
} else {
    $database = new PDO('sqlite:' . $config['sqlite_path']);
    $database->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
    $schema = file_get_contents(__DIR__ . '/../database/ledgerly.sql');
}
$database->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$database->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
$database->exec($schema);

function columnsFor(string $table): array
{
    global $driver;
    return $driver === 'mysql'
        ? array_column(queryDatabase('DESCRIBE `' . $table . '`')->fetchAll(), 'Field')
        : array_column(queryDatabase('PRAGMA table_info(' . $table . ')')->fetchAll(), 'name');
}

$userColumns = columnsFor('users');
if (in_array('email', $userColumns, true) && !in_array('username', $userColumns, true)) {
    $database->exec(
        $driver === 'mysql'
            ? 'ALTER TABLE users CHANGE COLUMN email username VARCHAR(160) NOT NULL'
            : 'ALTER TABLE users RENAME COLUMN email TO username',
    );
}
$userColumns = columnsFor('users');
$transactionColumns = columnsFor('transactions');
$userAdditions = [
    'session_version' => 'INTEGER NOT NULL DEFAULT 1',
    'workspace_id' =>
        $driver === 'mysql' ? 'BIGINT UNSIGNED NULL' : 'INTEGER REFERENCES workspaces(id)',
    'approval_status' => "VARCHAR(20) NOT NULL DEFAULT 'Approved'",
    'approved_by' => $driver === 'mysql' ? 'BIGINT UNSIGNED NULL' : 'INTEGER REFERENCES users(id)',
    'approved_at' => 'VARCHAR(32) NULL',
    'created_at' => "VARCHAR(32) NOT NULL DEFAULT ''",
];
$transactionAdditions = [
    'source' => "VARCHAR(160) NOT NULL DEFAULT ''",
    'workspace_id' =>
        $driver === 'mysql' ? 'BIGINT UNSIGNED NULL' : 'INTEGER REFERENCES workspaces(id)',
    'version' => 'INTEGER NOT NULL DEFAULT 1',
    'reviewed_by' => $driver === 'mysql' ? 'BIGINT UNSIGNED NULL' : 'INTEGER REFERENCES users(id)',
    'reviewed_at' => 'VARCHAR(32) NULL',
    'review_note' => "VARCHAR(1000) NOT NULL DEFAULT ''",
    'created_at' => "VARCHAR(32) NOT NULL DEFAULT ''",
    'updated_at' => "VARCHAR(32) NOT NULL DEFAULT ''",
];
foreach ($userAdditions as $column => $definition) {
    if (!in_array($column, $userColumns, true)) {
        $database->exec('ALTER TABLE users ADD COLUMN ' . $column . ' ' . $definition);
    }
}
foreach ($transactionAdditions as $column => $definition) {
    if (!in_array($column, $transactionColumns, true)) {
        $database->exec('ALTER TABLE transactions ADD COLUMN ' . $column . ' ' . $definition);
    }
}
$version = queryDatabase(
    "SELECT `value` FROM settings WHERE `key`='schema_version'",
)->fetchColumn();
if ($version !== '2') {
    $database->beginTransaction();
    $legacyUsers = (int) queryDatabase(
        'SELECT COUNT(*) FROM users WHERE workspace_id IS NULL AND role<>?',
        ['Admin'],
    )->fetchColumn();
    if ($legacyUsers > 0) {
        $legacyName = json_decode(
            queryDatabase("SELECT `value` FROM settings WHERE `key`='workspace'")->fetchColumn() ?:
            '"Existing business"',
            true,
        );
        queryDatabase('INSERT INTO workspaces (name) VALUES (?)', [
            is_string($legacyName) ? $legacyName : 'Existing business',
        ]);
        $legacyWorkspace = (int) $database->lastInsertId();
        queryDatabase(
            "UPDATE users SET workspace_id=? WHERE workspace_id IS NULL AND role<>'Admin'",
            [$legacyWorkspace],
        );
        queryDatabase('UPDATE transactions SET workspace_id=? WHERE workspace_id IS NULL', [
            $legacyWorkspace,
        ]);
    }
    queryDatabase("UPDATE users SET role='Business Owner' WHERE role='Store Owner'");
    queryDatabase(
        "UPDATE users SET active=0,approval_status='Disabled' WHERE role IN ('Staff','Supplier')",
    );
    queryDatabase("UPDATE transactions SET status='Approved' WHERE status='Completed'");
    queryDatabase("UPDATE users SET created_at=CURRENT_TIMESTAMP WHERE created_at=''");
    queryDatabase(
        "UPDATE transactions SET created_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE created_at=''",
    );
    saveSetting('schema_version', 2);
    $database->commit();
}

if (!in_array('opening_balance', columnsFor('workspaces'), true)) {
    $database->exec(
        'ALTER TABLE workspaces ADD COLUMN opening_balance DECIMAL(11,2) NOT NULL DEFAULT 0',
    );
}
$financeVersion = queryDatabase(
    "SELECT `value` FROM settings WHERE `key`='finance_version'",
)->fetchColumn();
if ($financeVersion !== '1') {
    $database->beginTransaction();
    $legacyAdmins = queryDatabase(
        "SELECT id,name FROM users WHERE role='Admin' AND workspace_id IS NULL",
    )->fetchAll();
    foreach ($legacyAdmins as $admin) {
        queryDatabase('INSERT INTO workspaces (name) VALUES (?)', [$admin['name'] . ' Business']);
        queryDatabase('UPDATE users SET workspace_id=? WHERE id=?', [
            (int) $database->lastInsertId(),
            $admin['id'],
        ]);
    }
    queryDatabase("UPDATE users SET role='Business Owner' WHERE role='Admin'");
    queryDatabase("UPDATE users SET role='Finance Staff' WHERE role IN ('Accountant','Staff')");
    queryDatabase("UPDATE transactions SET source=category WHERE source='' AND type='Income'");
    queryDatabase(
        "UPDATE users SET active=1,approval_status='Approved' WHERE role='Business Owner' AND approval_status='Pending'",
    );
    saveSetting('finance_version', 1);
    $database->commit();
}


