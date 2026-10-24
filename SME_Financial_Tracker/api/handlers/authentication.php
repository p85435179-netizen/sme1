<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

if (!in_array($action, ['register', 'setup', 'login'], true)) {
    return;
}
if ($method !== 'POST') {
    respondError('Method not allowed.', 405);
}
$ip = $_SERVER['REMOTE_ADDR'] ?? 'local';
$now = time();
$attempt = queryDatabase('SELECT * FROM attempts WHERE ip=?', [$ip])->fetch();
if ($attempt && $attempt['started'] > $now - 900 && $attempt['count'] >= 10) {
    respondError('Too many attempts. Try again in 15 minutes.', 429);
}
if ($action === 'login') {
    $username = validateUsername($input['username'] ?? null);
    $account = queryDatabase('SELECT * FROM users WHERE username=?', [$username])->fetch();
    if (
        !$account ||
        !is_string($input['password'] ?? null) ||
        !password_verify($input['password'], $account['password'])
    ) {
        $query =
            $driver === 'mysql'
                ? 'INSERT INTO attempts (ip,count,started) VALUES (?,1,?) ON DUPLICATE KEY UPDATE count=IF(started<?,1,count+1),started=IF(started<?,?,started)'
                : 'INSERT INTO attempts (ip,count,started) VALUES (?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN started<? THEN 1 ELSE count+1 END,started=CASE WHEN started<? THEN ? ELSE started END';
        queryDatabase($query, [$ip, $now, $now - 900, $now - 900, $now]);
        respondError('Username or password is incorrect.', 401);
    }
    if (!$account['active'] || $account['approval_status'] !== 'Approved') {
        respondError(
            $account['approval_status'] === 'Pending'
                ? 'Your registration is awaiting approval from the Super Admin.'
                : 'Your account is unavailable. Contact your business owner.',
            403,
        );
    }
    validateChoice($account['role'], ['Super Admin', 'Business Owner', 'Finance Staff', 'Manager']);
    queryDatabase('DELETE FROM attempts WHERE ip=?', [$ip]);
    session_regenerate_id(true);
    $_SESSION['uid'] = (int) $account['id'];
    $_SESSION['auth_version'] = (int) $account['session_version'];
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $user = currentAccount();
    audit('Login', 'Signed in');
    respondJson(['ok' => true]);
}
$name = validateText($input['name'] ?? null);
$username = validateUsername($input['username'] ?? null);
$password = validatePassword($input['password'] ?? null);
if (isset($input['role']) && $input['role'] !== 'Business Owner') {
    respondError('Registration is for business owners only.');
}
$role = 'Business Owner';
$database->beginTransaction();
queryDatabase('INSERT INTO workspaces (name) VALUES (?)', [validateText($input['workspace'] ?? null)]);
$workspaceId = (int) $database->lastInsertId();
$status = 'Pending';
queryDatabase(
    'INSERT INTO users (name,username,password,role,workspace_id,active,approval_status) VALUES (?,?,?,?,?,?,?)',
    [
        $name,
        $username,
        password_hash($password, PASSWORD_DEFAULT),
        $role,
        $workspaceId,
        $status === 'Approved' ? 1 : 0,
        $status,
    ],
);
audit('Registration submitted', $name . ' registered as ' . $role, $workspaceId);
$database->commit();
respondJson([
    'ok' => true,
    'status' => $status,
    'message' =>
        $status === 'Approved'
            ? 'Business account created. You can now sign in.'
            : 'Registration submitted. The Super Admin must approve your business owner account before you can sign in.',
]);
