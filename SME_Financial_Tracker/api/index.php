<?php

declare(strict_types=1);

define('LEDGERLY_API', true);
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/helpers.php';

try {
    require __DIR__ . '/database.php';
    require __DIR__ . '/request.php';
    require __DIR__ . '/handlers/authentication.php';
    $user = currentAccount();
    if (!$user) {
        respondError('Sign in with an approved account to continue.', 401);
    }
    if (!in_array($user['role'], ['Super Admin', 'Business Owner', 'Finance Staff', 'Manager'], true)) {
        respondError('Contact the administrator to update your role.', 403);
    }
    $userId = (int) $user['id'];
    require __DIR__ . '/handlers/state.php';
    require __DIR__ . '/handlers/actions.php';
} catch (PDOException $error) {
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    error_log((string) $error);
    if ((string) $error->getCode() === '23000' || (string) $error->getCode() === '23505') {
        respondError(
            'This username already exists, or the record is linked to another record.',
            409,
        );
    }
    respondError('Database operation failed. Check the database configuration or try again.', 500);
} catch (Throwable $error) {
    if (isset($database) && $database->inTransaction()) {
        $database->rollBack();
    }
    error_log((string) $error);
    respondError('Unable to process this request. Please try again.', 500);
}
