<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

$database = new PDO(
    'sqlite:' . (getenv('LEDGERLY_DB_PATH') ?: __DIR__ . '/../data/ledgerly.sqlite'),
);
$database->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$database->exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
$database->exec(file_get_contents(__DIR__ . '/../database/ledgerly.sql'));
$columns = $database->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_COLUMN, 1);
if (in_array('email', $columns, true) && !in_array('username', $columns, true)) {
    $database->exec('ALTER TABLE users RENAME COLUMN email TO username');
}
