<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

if (in_array($action, ['setup', 'login'], true)) {
    if ($method !== 'POST') {
        respondError('Method not allowed.', 405);
    }
    if ($action === 'setup') {
        $database->beginTransaction();
        if (queryDatabase('SELECT 1 FROM users LIMIT 1')->fetchColumn()) {
            respondError('Workspace already configured.', 409);
        }
        $name = validateText($input['name'] ?? null);
        $username = validateUsername($input['username'] ?? null);
        $password = validatePassword($input['password'] ?? null);
        queryDatabase('INSERT INTO users(name,username,password,role) VALUES(?,?,?,?)', [
            $name,
            $username,
            password_hash($password, PASSWORD_DEFAULT),
            'Store Owner',
        ]);
        $userId = (int) $database->lastInsertId();
        queryDatabase('INSERT INTO settings(key,value) VALUES(?,?)', [
            'workspace',
            json_encode(validateText($input['workspace'] ?? null)),
        ]);
        $database->commit();
    } else {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'local';
        $now = time();
        $attempt = queryDatabase('SELECT * FROM attempts WHERE ip=?', [$ip])->fetch(
            PDO::FETCH_ASSOC,
        );
        if ($attempt && $attempt['started'] > $now - 900 && $attempt['count'] >= 10) {
            respondError('Too many attempts. Try again in 15 minutes.', 429);
        }
        $account = queryDatabase('SELECT * FROM users WHERE username=? AND active=1', [
            (string) ($input['username'] ?? ''),
        ])->fetch(PDO::FETCH_ASSOC);
        if (
            !$account ||
            !is_string($input['password'] ?? null) ||
            !password_verify($input['password'], $account['password'])
        ) {
            queryDatabase(
                'INSERT INTO attempts(ip,count,started) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN started<? THEN 1 ELSE count+1 END, started=CASE WHEN started<? THEN ? ELSE started END',
                [$ip, $now, $now - 900, $now - 900, $now],
            );
            respondError('Username or password is incorrect.', 401);
        }
        queryDatabase('DELETE FROM attempts WHERE ip=?', [$ip]);
        $userId = (int) $account['id'];
    }
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respondJson(['ok' => true]);
}
