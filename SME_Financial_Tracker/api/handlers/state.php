<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}

if ($action === 'state' && $method === 'GET') {
    $transactions = $isSupplier
        ? []
        : queryDatabase(
            'SELECT t.*,u.role AS "by" FROM transactions t JOIN users u ON u.id=t.user_id' .
                ($isOwner ? '' : ' WHERE user_id=?') .
                ' ORDER BY date DESC,t.id DESC',
            $isOwner ? [] : [$userId],
        )->fetchAll(PDO::FETCH_ASSOC);
    $orders =
        $isOwner || $isSupplier
            ? queryDatabase(
                'SELECT o.*,u.name AS supplier FROM orders o JOIN users u ON u.id=o.supplier_id' .
                    ($isOwner ? '' : ' WHERE supplier_id=?') .
                    ' ORDER BY o.id DESC',
                $isOwner ? [] : [$userId],
            )->fetchAll(PDO::FETCH_ASSOC)
            : [];
    $invoices =
        $isOwner || $isSupplier
            ? queryDatabase(
                'SELECT i.*,o.name AS order_name FROM invoices i JOIN orders o ON o.id=i.order_id' .
                    ($isOwner ? '' : ' WHERE i.supplier_id=?') .
                    ' ORDER BY i.id DESC',
                $isOwner ? [] : [$userId],
            )->fetchAll(PDO::FETCH_ASSOC)
            : [];
    $settings = [];
    foreach (queryDatabase('SELECT * FROM settings')->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $settings[$row['key']] = json_decode($row['value'], true);
    }
    if (!$isOwner) {
        $settings = array_intersect_key($settings, ['workspace' => true]);
    }
    respondJson([
        'user' => $user,
        'transactions' => $transactions,
        'orders' => $orders,
        'invoices' => $invoices,
        'settings' => $settings,
        'team' => $isOwner
            ? queryDatabase('SELECT id,name,username,role,active FROM users ORDER BY id')->fetchAll(
                PDO::FETCH_ASSOC,
            )
            : [],
    ]);
}
