<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

$action = $_GET['action'] ?? 'state';
$method = $_SERVER['REQUEST_METHOD'];
$input = [];
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respondError('Invalid JSON.');
    }
} elseif ($method !== 'GET') {
    respondError('Method not allowed.', 405);
}
$csrf = $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
if ($method === 'POST' && !hash_equals($csrf, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
    respondError('Session expired. Reload the page.', 403);
}
if ($action === 'session' && $method === 'GET') {
    $account = isset($_SESSION['uid'])
        ? queryDatabase('SELECT id,name,username,role FROM users WHERE id=? AND active=1', [
            $_SESSION['uid'],
        ])->fetch(PDO::FETCH_ASSOC)
        : false;
    respondJson([
        'user' => $account ?: null,
        'csrf' => $csrf,
        'setup' => !(bool) queryDatabase('SELECT 1 FROM users LIMIT 1')->fetchColumn(),
    ]);
}
