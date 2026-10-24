<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

function respondError(string $message, int $code = 400): never
{
    global $database;
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit();
}

function respondJson($value): never
{
    echo json_encode($value);
    exit();
}

function queryDatabase(string $query, array $values = []): PDOStatement
{
    global $database;
    $statement = $database->prepare($query);
    $statement->execute($values);
    return $statement;
}

function validateText($value, int $max = 160): string
{
    if (!is_string($value) || trim($value) === '' || mb_strlen(trim($value)) > $max) {
        respondError('Enter a value between 1 and ' . $max . ' characters.');
    }
    return trim($value);
}

function validateUsername($value): string
{
    $username = validateText($value);
    if (!preg_match('/^[a-zA-Z0-9._@+\-]{3,160}$/', $username)) {
        respondError(
            'Use 3–160 letters, numbers, dots, underscores, @, + or hyphens for your username.',
        );
    }
    return strtolower($username);
}

function validatePassword($value): string
{
    if (!is_string($value) || strlen($value) < 10 || strlen($value) > 200) {
        respondError('Use a password of 10–200 characters.');
    }
    return $value;
}

function validateChoice($value, array $choices): string
{
    if (!in_array($value, $choices, true)) {
        respondError('Invalid selection.');
    }
    return $value;
}

function validateId($value): int
{
    if (!is_scalar($value) || !ctype_digit((string) $value) || (int) $value < 1) {
        respondError('Select a valid record.');
    }
    return (int) $value;
}

function validateAmount($value): float
{
    if (
        !is_numeric($value) ||
        !is_finite((float) $value) ||
        $value < 0.01 ||
        $value > 999999999 ||
        abs((float) $value - round((float) $value, 2)) > 0.000001
    ) {
        respondError('Enter a positive amount up to 999,999,999 with at most two decimal places.');
    }
    return round((float) $value, 2);
}

function validateDate($value): string
{
    if (!is_string($value)) {
        respondError('Enter a valid date.');
    }
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        respondError('Enter a valid date.');
    }
    return $value;
}

function requireRole(string ...$roles): void
{
    global $user;
    if (!in_array($user['role'], $roles, true)) {
        respondError('You do not have permission to perform this action.', 403);
    }
}

function saveSetting(string $key, $value): void
{
    global $driver;
    $query =
        $driver === 'mysql'
            ? 'INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)'
            : 'INSERT INTO settings (`key`,`value`) VALUES (?,?) ON CONFLICT(`key`) DO UPDATE SET `value`=excluded.`value`';
    queryDatabase($query, [$key, json_encode($value)]);
}

function currentAccount(): array|false
{
    if (!isset($_SESSION['uid'])) {
        return false;
    }
    $account = queryDatabase(
        "SELECT u.id,u.name,u.username,u.role,u.workspace_id,u.approval_status,u.session_version,w.name AS business,w.opening_balance FROM users u LEFT JOIN workspaces w ON w.id=u.workspace_id WHERE u.id=? AND u.active=1 AND u.approval_status='Approved'",
        [$_SESSION['uid']],
    )->fetch(PDO::FETCH_ASSOC);
    if (!$account || (int) ($_SESSION['auth_version'] ?? 0) !== (int) $account['session_version']) {
        return false;
    }
    unset($account['session_version']);
    return $account;
}

function audit(string $action, string $details, ?int $workspaceId = null): void
{
    global $user;
    queryDatabase(
        'INSERT INTO activity_logs (user_id,workspace_id,actor_name,action,details) VALUES (?,?,?,?,?)',
        [
            $user['id'] ?? null,
            $workspaceId ?? ($user['workspace_id'] ?? null),
            $user['name'] ?? 'Registration',
            $action,
            $details,
        ],
    );
}

function publicBusinesses(): array
{
    return queryDatabase(
        "SELECT DISTINCT w.id,w.name FROM workspaces w JOIN users u ON u.workspace_id=w.id WHERE u.role='Business Owner' AND u.active=1 AND u.approval_status='Approved' ORDER BY w.name,w.id",
    )->fetchAll(PDO::FETCH_ASSOC);
}

function transactionRecord(int $id): array
{
    global $user;
    $record = queryDatabase('SELECT * FROM transactions WHERE id=? AND workspace_id=?', [
        $id,
        $user['workspace_id'],
    ])->fetch(PDO::FETCH_ASSOC);
    if (!$record) {
        respondError('Record not found in your business.', 404);
    }
    return $record;
}

function validateNonnegativeAmount($value): float
{
    if (is_numeric($value) && (float) $value === 0.0) {
        return 0.0;
    }
    return validateAmount($value);
}

function invoiceRecord(int $id): array
{
    global $user;
    $invoice = queryDatabase('SELECT * FROM billing_invoices WHERE id=? AND workspace_id=?', [
        $id,
        $user['workspace_id'],
    ])->fetch();
    if (!$invoice) {
        respondError('Invoice not found in your business.', 404);
    }
    return $invoice;
}

function requireUnlinkedRecord(int $id): void
{
    if (
        queryDatabase('SELECT id FROM invoice_payments WHERE transaction_id=?', [
            $id,
        ])->fetchColumn()
    ) {
        respondError('This record comes from an invoice payment. Manage the invoice instead.');
    }
}
