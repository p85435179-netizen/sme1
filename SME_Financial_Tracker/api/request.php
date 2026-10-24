<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

$action = $_GET['action'] ?? 'state';
if (!is_string($action)) {
    respondError('Invalid action.');
}
$method = $_SERVER['REQUEST_METHOD'];
$input = [];
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respondError('Invalid JSON request.');
    }
} elseif ($method !== 'GET') {
    respondError('Method not allowed.', 405);
}
$csrf = $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
if ($method === 'POST' && !hash_equals($csrf, $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
    respondError('Session expired. Reload the page and try again.', 403);
}
if ($action === 'session' && $method === 'GET') {
    respondJson([
        'user' => currentAccount() ?: null,
        'csrf' => $csrf,
        'businesses' => publicBusinesses(),
    ]);
}
