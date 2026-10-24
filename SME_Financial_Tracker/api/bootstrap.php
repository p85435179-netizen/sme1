<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

ini_set('display_errors', '0');
date_default_timezone_set('Asia/Manila');
$sessionDatabaseConfig = require __DIR__ . '/../config/database.php';
$sessionFingerprint = json_encode([
    __DIR__,
    $sessionDatabaseConfig['driver'],
    $sessionDatabaseConfig['sqlite_path'],
    $sessionDatabaseConfig['host'],
    $sessionDatabaseConfig['port'],
    $sessionDatabaseConfig['database'],
]);
session_name('ledgerly_' . substr(hash('sha256', $sessionFingerprint), 0, 12));
ini_set('session.use_strict_mode', '1');
session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Strict',
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'path' => '/',
]);
session_start();
if (isset($_SESSION['last_seen']) && $_SESSION['last_seen'] < time() - 28800) {
    $_SESSION = [];
    session_regenerate_id(true);
}
$_SESSION['last_seen'] = time();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
