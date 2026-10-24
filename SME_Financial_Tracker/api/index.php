<?php

declare(strict_types=1);

define('LEDGERLY_API', true);
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/helpers.php';

try {
    require __DIR__ . '/database.php';
    require __DIR__ . '/request.php';
    require __DIR__ . '/handlers/authentication.php';
    $user = isset($_SESSION['uid'])
        ? queryDatabase('SELECT id,name,username,role FROM users WHERE id=? AND active=1', [
            $_SESSION['uid'],
        ])->fetch(PDO::FETCH_ASSOC)
        : false;
    if (!$user) {
        respondError('Sign in to continue.', 401);
    }
    $isOwner = $user['role'] === 'Store Owner';
    $isSupplier = $user['role'] === 'Supplier';
    $userId = (int) $user['id'];

    require __DIR__ . '/handlers/state.php';
    require __DIR__ . '/handlers/actions.php';
} catch (PDOException $error) {
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    if ($error->getCode() === '23000') {
        respondError('This username, invoice number, or order invoice already exists.', 409);
    }
    error_log((string) $error);
    respondError('Database operation failed. Please try again.', 500);
} catch (Throwable $error) {
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    error_log((string) $error);
    respondError('Unable to process request.', 500);
}
