<?php

if (!isset($pageRole)) {
    http_response_code(404);
    exit();
}
define('LEDGERLY_API', true);
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/helpers.php';
try {
    require __DIR__ . '/database.php';
    $account = currentAccount();
    if (!$account) {
        header('Location: ../login.php');
        exit();
    }
    if ($account['role'] !== $pageRole) {
        header('Location: ../workspace.php');
        exit();
    }
} catch (Throwable $error) {
    error_log((string) $error);
    http_response_code(503);
    header('Content-Type: text/html; charset=utf-8');
    exit('<h1>Database connection unavailable</h1><p>Start MySQL in XAMPP and try again.</p>');
}
header('Content-Type: text/html; charset=utf-8');
