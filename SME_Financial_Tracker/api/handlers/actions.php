<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}
if ($method !== 'POST') {
    respondError('Method not allowed.', 405);
}
$workspaceId = (int) $user['workspace_id'];
if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    respondJson(['ok' => true]);
}
if ($action === 'password') {
    $hash = queryDatabase('SELECT password FROM users WHERE id=?', [$userId])->fetchColumn();
    if (!is_string($input['current'] ?? null) || !password_verify($input['current'], $hash)) {
        respondError('Current password is incorrect.');
    }
    $password = validatePassword($input['password'] ?? null);
    queryDatabase('UPDATE users SET password=?,session_version=session_version+1 WHERE id=?', [
        password_hash($password, PASSWORD_DEFAULT),
        $userId,
    ]);
    $_SESSION['auth_version']++;
    session_regenerate_id(true);
    audit('Password changed', 'Account password updated');
    respondJson(['ok' => true]);
}
if ($action === 'registration_review') {
    requireRole('Super Admin');
    $id = validateId($input['id'] ?? null);
    $status = validateChoice($input['status'] ?? null, ['Approved', 'Rejected']);
    $database->beginTransaction();
    $statement = queryDatabase("UPDATE users SET approval_status=?,active=?,approved_by=?,approved_at=CURRENT_TIMESTAMP,session_version=session_version+1 WHERE id=? AND role='Business Owner' AND approval_status='Pending'", [$status, $status === 'Approved' ? 1 : 0, $userId, $id]);
    if (!$statement->rowCount()) {
        respondError('This registration has already been reviewed or does not exist.', 409);
    }
    audit('Registration ' . strtolower($status), 'Business owner account #' . $id);
    $database->commit();
    respondJson(['ok' => true]);
}
if ($user['role'] === 'Super Admin') {
    respondError('Super Admin can review business registrations and manage their own password.', 403);
}
if (in_array($action, ['transaction_create', 'transaction_update'], true)) {
    requireRole('Business Owner', 'Finance Staff');
    $date = validateDate($input['date'] ?? null);
    if ($date > date('Y-m-d')) {
        respondError('Record transactions on or before today.');
    }
    $type = validateChoice($input['type'] ?? null, ['Income', 'Expense']);
    $sourceValue = $input['source'] ?? '';
    if (!is_string($sourceValue)) {
        respondError('Source must be text.');
    }
    $source = $type === 'Income' ? validateText($sourceValue) : trim($sourceValue);
    if (mb_strlen($source) > 160) {
        respondError('Source must be at most 160 characters.');
    }
    $values = [
        $date,
        validateText($input['name'] ?? null),
        validateChoice($input['category'] ?? null, [
            'Sales',
            'Services',
            'Other income',
            'Rent',
            'Electricity',
            'Internet',
            'Salary',
            'Supplies',
            'Transportation',
            'Utilities',
            'Marketing',
            'Operations',
            'Payroll',
            'Refunds',
            'Other',
        ]),
        $type,
        validateAmount($input['amount'] ?? null),
        $source,
    ];
    $database->beginTransaction();
    if ($action === 'transaction_create') {
        queryDatabase(
            "INSERT INTO transactions (date,name,category,type,amount,source,status,user_id,workspace_id) VALUES (?,?,?,?,?,?,'Approved',?,?)",
            [...$values, $userId, $workspaceId],
        );
        $id = (int) $database->lastInsertId();
    } else {
        $id = validateId($input['id'] ?? null);
        transactionRecord($id);
        requireUnlinkedRecord($id);
        $statement = queryDatabase(
            "UPDATE transactions SET date=?,name=?,category=?,type=?,amount=?,source=?,status='Approved',reviewed_by=NULL,reviewed_at=NULL,review_note='',updated_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=? AND workspace_id=? AND version=?",
            [...$values, $id, $workspaceId, validateId($input['version'] ?? null)],
        );
        if (!$statement->rowCount()) {
            respondError('This record changed. Refresh and try again.', 409);
        }
    }
    audit(
        $action === 'transaction_create' ? 'Transaction created' : 'Transaction updated',
        'Record #' . $id . ': ' . $values[1],
    );
    $database->commit();
    respondJson(['ok' => true, 'id' => $id]);
}
if (in_array($action, ['transaction_delete', 'transaction_post'], true)) {
    requireRole('Business Owner');
    $id = validateId($input['id'] ?? null);
    $database->beginTransaction();
    $record = transactionRecord($id);
    requireUnlinkedRecord($id);
    $version = validateId($input['version'] ?? null);
    if ($action === 'transaction_delete') {
        if (($input['confirm'] ?? false) !== true) {
            respondError('Confirm deletion first.');
        }
        $statement = queryDatabase(
            'DELETE FROM transactions WHERE id=? AND workspace_id=? AND version=?',
            [$id, $workspaceId, $version],
        );
    } else {
        $statement = queryDatabase(
            "UPDATE transactions SET status='Approved',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND workspace_id=? AND version=?",
            [$id, $workspaceId, $version],
        );
    }
    if (!$statement->rowCount()) {
        respondError('This record changed. Refresh and try again.', 409);
    }
    audit(
        $action === 'transaction_delete' ? 'Transaction deleted' : 'Legacy transaction posted',
        'Record #' . $id . ': ' . $record['name'] . ' (PHP ' . $record['amount'] . ')',
    );
    $database->commit();
    respondJson(['ok' => true]);
}
if ($action === 'workspace_update') {
    requireRole('Business Owner');
    $name = validateText($input['name'] ?? null);
    $opening = validateNonnegativeAmount($input['opening_balance'] ?? 0);
    queryDatabase('UPDATE workspaces SET name=?,opening_balance=? WHERE id=?', [
        $name,
        $opening,
        $workspaceId,
    ]);
    audit('Business updated', 'Business name and opening cash balance updated');
    respondJson(['ok' => true]);
}
if (in_array($action, ['user_save', 'user_status', 'user_password', 'user_delete'], true)) {
    requireRole('Business Owner');
    $id = isset($input['id']) && $input['id'] !== '' ? validateId($input['id']) : null;
    $target = $id
        ? queryDatabase(
            "SELECT * FROM users WHERE id=? AND workspace_id=? AND approval_status<>'Deleted'",
            [$id, $workspaceId],
        )->fetch()
        : null;
    if ($id && !$target) {
        respondError('User not found in your business.', 404);
    }
    if ($target && !in_array($target['role'], ['Finance Staff', 'Manager'], true)) {
        respondError('You can manage Finance Staff and Manager accounts only.', 403);
    }
    if ($action !== 'user_save' && !$target) {
        respondError('Select a user.');
    }
    if ($action === 'user_password') {
        if ($id === $userId) {
            respondError('Use Change password for your own account.');
        }
        queryDatabase('UPDATE users SET password=?,session_version=session_version+1 WHERE id=?', [
            password_hash(validatePassword($input['password'] ?? null), PASSWORD_DEFAULT),
            $id,
        ]);
        audit('Password reset', 'Reset password for ' . $target['username']);
        respondJson(['ok' => true]);
    }
    $database->beginTransaction();
    if ($action === 'user_status' || $action === 'user_delete') {
        $status =
            $action === 'user_delete'
                ? 'Deleted'
                : validateChoice($input['status'] ?? null, ['Approved', 'Rejected', 'Disabled']);
        if ($action === 'user_delete' && ($input['confirm'] ?? false) !== true) {
            respondError('Confirm user removal first.');
        }
        if ($id === $userId && $status !== 'Approved') {
            respondError('You cannot remove or disable your own account.');
        }
        if (
            $target['role'] === 'Business Owner' &&
            $status !== 'Approved' &&
            !queryDatabase(
                "SELECT id FROM users WHERE workspace_id=? AND role='Business Owner' AND active=1 AND approval_status='Approved' AND id<>?",
                [$workspaceId, $id],
            )->fetchColumn()
        ) {
            respondError('Keep at least one active business owner.');
        }
        if ($status === 'Approved') {
            validateChoice($target['role'], ['Business Owner', 'Finance Staff', 'Manager']);
        }
        queryDatabase(
            'UPDATE users SET approval_status=?,active=?,approved_by=?,approved_at=CURRENT_TIMESTAMP,session_version=session_version+1 WHERE id=?',
            [$status, $status === 'Approved' ? 1 : 0, $userId, $id],
        );
        if ($id === $userId) {
            $_SESSION['auth_version']++;
        }
        audit('User ' . strtolower($status), $target['username']);
    } else {
        $name = validateText($input['name'] ?? null);
        $username = validateUsername($input['username'] ?? null);
        $newRole = validateChoice($input['role'] ?? null, [
            'Finance Staff',
            'Manager',
        ]);
        if ($id === $userId && $newRole !== 'Business Owner') {
            respondError('You cannot change your own owner role.');
        }
        if (
            $target &&
            $target['role'] === 'Business Owner' &&
            $newRole !== 'Business Owner' &&
            !queryDatabase(
                "SELECT id FROM users WHERE workspace_id=? AND role='Business Owner' AND active=1 AND approval_status='Approved' AND id<>?",
                [$workspaceId, $id],
            )->fetchColumn()
        ) {
            respondError('Keep at least one active owner.');
        }
        if ($target) {
            queryDatabase(
                'UPDATE users SET name=?,username=?,role=?,session_version=session_version+1 WHERE id=?',
                [$name, $username, $newRole, $id],
            );
            if ($id === $userId) {
                $_SESSION['auth_version']++;
            }
        } else {
            queryDatabase(
                "INSERT INTO users (name,username,password,role,workspace_id,active,approval_status,approved_by,approved_at) VALUES (?,?,?,?,?,1,'Approved',?,CURRENT_TIMESTAMP)",
                [
                    $name,
                    $username,
                    password_hash(validatePassword($input['password'] ?? null), PASSWORD_DEFAULT),
                    $newRole,
                    $workspaceId,
                    $userId,
                ],
            );
            $id = (int) $database->lastInsertId();
        }
        audit($target ? 'User updated' : 'User created', $username . ' (' . $newRole . ')');
    }
    $database->commit();
    respondJson(['ok' => true, 'id' => $id]);
}
require __DIR__ . '/invoices.php';
respondError('Unknown action.', 404);
