<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

if ($method !== 'POST') {
    respondError('Method not allowed.', 405);
}
switch ($action) {
    case 'logout':
        $_SESSION = [];
        session_destroy();
        respondJson(['ok' => true]);
    case 'transaction':
        if ($isSupplier) {
            respondError('Access denied.', 403);
        }
        queryDatabase(
            'INSERT INTO transactions(date,name,category,type,amount,status,user_id) VALUES(?,?,?,?,?,?,?)',
            [
                validateDate($input['date'] ?? null),
                validateText($input['name'] ?? null),
                validateChoice($input['category'] ?? null, [
                    'Sales',
                    'Operations',
                    'Marketing',
                    'Payroll',
                    'Other',
                ]),
                validateChoice($input['type'] ?? null, ['Income', 'Expense']),
                validateAmount($input['amount'] ?? null),
                $isOwner ? 'Completed' : 'Pending',
                $userId,
            ],
        );
        break;
    case 'review':
        requireOwner();
        $status = validateChoice($input['status'] ?? null, ['Completed', 'Rejected']);
        $statement = queryDatabase('UPDATE transactions SET status=? WHERE id=? AND status=?', [
            $status,
            $input['id'] ?? 0,
            'Pending',
        ]);
        if (!$statement->rowCount()) {
            respondError('Submission already reviewed or missing.', 409);
        }
        break;
    case 'settings':
        requireOwner();
        $key = validateChoice($input['key'] ?? null, ['workspace', 'budgets', 'checklist']);
        $value = $input['value'] ?? null;
        if ($key === 'workspace') {
            $value = validateText($value);
        }
        if ($key === 'budgets') {
            if (!is_array($value) || count($value) !== 4) {
                respondError('Four budgets required.');
            }
            $value = array_map(
                fn($v) => $v === 0 || $v === '0' ? 0 : validateAmount($v),
                array_values($value),
            );
        }
        if ($key === 'checklist') {
            if (!is_array($value) || count($value) !== 3) {
                respondError('Invalid checklist.');
            }
            $value = array_map(fn($v) => (bool) $v, array_values($value));
        }
        queryDatabase(
            'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
            [$key, json_encode($value)],
        );
        break;
    case 'user':
        requireOwner();
        $username = validateUsername($input['username'] ?? null);
        $password = validatePassword($input['password'] ?? null);
        queryDatabase('INSERT INTO users(name,username,password,role) VALUES(?,?,?,?)', [
            validateText($input['name'] ?? null),
            $username,
            password_hash($password, PASSWORD_DEFAULT),
            validateChoice($input['role'] ?? null, ['Staff', 'Supplier']),
        ]);
        break;
    case 'access':
        requireOwner();
        $statement = queryDatabase('UPDATE users SET active=? WHERE id=? AND role<>?', [
            (int) (bool) ($input['active'] ?? false),
            $input['id'] ?? 0,
            'Store Owner',
        ]);
        if (!$statement->rowCount()) {
            respondError('Account not found.');
        }
        break;
    case 'password':
        $hash = queryDatabase('SELECT password FROM users WHERE id=?', [$userId])->fetchColumn();
        if (!password_verify((string) ($input['current'] ?? ''), $hash)) {
            respondError('Current password is incorrect.');
        }
        $password = validatePassword($input['password'] ?? null);
        queryDatabase('UPDATE users SET password=? WHERE id=?', [
            password_hash($password, PASSWORD_DEFAULT),
            $userId,
        ]);
        session_regenerate_id(true);
        break;
    case 'order':
        requireOwner();
        if (
            !queryDatabase('SELECT id FROM users WHERE id=? AND role=? AND active=1', [
                $input['supplier_id'] ?? 0,
                'Supplier',
            ])->fetchColumn()
        ) {
            respondError('Select an active supplier.');
        }
        queryDatabase('INSERT INTO orders(name,amount,date,status,supplier_id) VALUES(?,?,?,?,?)', [
            validateText($input['name'] ?? null),
            validateAmount($input['amount'] ?? null),
            validateDate($input['date'] ?? null),
            'Awaiting confirmation',
            $input['supplier_id'],
        ]);
        break;
    case 'order_status':
        if (!$isSupplier) {
            respondError('Supplier access required.', 403);
        }
        $status = validateChoice($input['status'] ?? null, ['Confirmed', 'Delivered']);
        $prior = $status === 'Confirmed' ? 'Awaiting confirmation' : 'Confirmed';
        $statement = queryDatabase(
            'UPDATE orders SET status=? WHERE id=? AND supplier_id=? AND status=?',
            [$status, $input['id'] ?? 0, $userId, $prior],
        );
        if (!$statement->rowCount()) {
            respondError('Order is missing or its status changed.', 409);
        }
        break;
    case 'invoice':
        if (!$isSupplier) {
            respondError('Supplier access required.', 403);
        }
        $order = queryDatabase('SELECT * FROM orders WHERE id=? AND supplier_id=? AND status=?', [
            $input['order_id'] ?? 0,
            $userId,
            'Delivered',
        ])->fetch(PDO::FETCH_ASSOC);
        if (!$order) {
            respondError('Choose one of your delivered orders.');
        }
        queryDatabase(
            'INSERT INTO invoices(ref,order_id,amount,status,supplier_id) VALUES(?,?,?,?,?)',
            [
                validateText($input['ref'] ?? null),
                $order['id'],
                $order['amount'],
                'Under review',
                $userId,
            ],
        );
        break;
    case 'pay':
        requireOwner();
        $database->beginTransaction();
        $invoice = queryDatabase(
            'SELECT i.*,o.name FROM invoices i JOIN orders o ON o.id=i.order_id WHERE i.id=? AND i.status=?',
            [$input['id'] ?? 0, 'Under review'],
        )->fetch(PDO::FETCH_ASSOC);
        if (!$invoice) {
            respondError('Invoice is missing or already paid.', 409);
        }
        $date = validateDate($input['date'] ?? null);
        queryDatabase('UPDATE invoices SET status=?,paid_date=? WHERE id=?', [
            'Paid',
            $date,
            $invoice['id'],
        ]);
        queryDatabase('UPDATE orders SET status=? WHERE id=?', ['Paid', $invoice['order_id']]);
        queryDatabase(
            'INSERT INTO transactions(date,name,category,type,amount,status,user_id) VALUES(?,?,?,?,?,?,?)',
            [
                $date,
                'Supplier payment: ' . $invoice['ref'] . ' · ' . $invoice['name'],
                'Operations',
                'Expense',
                $invoice['amount'],
                'Completed',
                $userId,
            ],
        );
        $database->commit();
        break;
    default:
        respondError('Unknown action.', 404);
}
respondJson(['ok' => true]);
