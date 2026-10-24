<?php

if (!defined('LEDGERLY_API')) {
    http_response_code(404);
    exit();
}
if ($action === 'business_team' && $method === 'GET') {
    requireRole('Super Admin');
    $ownerId = validateId($_GET['owner_id'] ?? null);
    $owner = queryDatabase("SELECT u.id,u.name,u.username,u.workspace_id,w.name AS business FROM users u JOIN workspaces w ON w.id=u.workspace_id WHERE u.id=? AND u.role='Business Owner' AND u.approval_status<>'Deleted'", [$ownerId])->fetch();
    if (!$owner) {
        respondError('Business owner not found.', 404);
    }
    $team = queryDatabase("SELECT id,name,username,role,active,approval_status,created_at FROM users WHERE workspace_id=? AND role IN ('Finance Staff','Manager') AND approval_status<>'Deleted' ORDER BY role,name,id", [$owner['workspace_id']])->fetchAll();
    respondJson(['owner' => $owner, 'team' => $team]);
}
if ($action !== 'state' || $method !== 'GET') {
    return;
}
$workspaceId = $user['workspace_id'];
if ($user['role'] === 'Super Admin') {
    respondJson([
        'user' => $user,
        'transactions' => [],
        'users' => queryDatabase("SELECT u.id,u.name,u.username,u.role,u.active,u.approval_status,u.workspace_id,u.created_at,w.name AS business FROM users u LEFT JOIN workspaces w ON w.id=u.workspace_id WHERE u.role='Business Owner' AND u.approval_status<>'Deleted' ORDER BY u.id DESC")->fetchAll(),
        'invoices' => [],
        'payments' => [],
        'activities' => [],
        'database_driver' => $driver,
    ]);
}
$records = queryDatabase(
    'SELECT t.*,u.name AS created_by,p.invoice_id FROM transactions t JOIN users u ON u.id=t.user_id LEFT JOIN invoice_payments p ON p.transaction_id=t.id WHERE t.workspace_id=? ORDER BY t.date DESC,t.id DESC',
    [$workspaceId],
)->fetchAll();
$team =
    $user['role'] === 'Business Owner'
        ? queryDatabase(
            "SELECT u.id,u.name,u.username,u.role,u.active,u.approval_status,u.workspace_id,u.created_at,a.name AS approved_by_name FROM users u LEFT JOIN users a ON a.id=u.approved_by WHERE u.workspace_id=? AND u.approval_status<>'Deleted' ORDER BY u.id DESC",
            [$workspaceId],
        )->fetchAll()
        : [];
$invoices =
    $user['role'] === 'Manager'
        ? []
        : queryDatabase(
            'SELECT i.*,u.name AS creator FROM billing_invoices i JOIN users u ON u.id=i.created_by WHERE i.workspace_id=? ORDER BY i.date DESC,i.id DESC',
            [$workspaceId],
        )->fetchAll();
$payments =
    $user['role'] === 'Manager'
        ? []
        : queryDatabase(
            'SELECT p.*,u.name AS recorded_by FROM invoice_payments p JOIN billing_invoices i ON i.id=p.invoice_id JOIN users u ON u.id=p.user_id WHERE i.workspace_id=? ORDER BY p.id DESC',
            [$workspaceId],
        )->fetchAll();
$activities =
    $user['role'] === 'Manager'
        ? []
        : queryDatabase(
            'SELECT * FROM activity_logs WHERE workspace_id=? ORDER BY id DESC LIMIT 100',
            [$workspaceId],
        )->fetchAll();
respondJson([
    'user' => $user,
    'transactions' => $records,
    'users' => $team,
    'invoices' => $invoices,
    'payments' => $payments,
    'activities' => $activities,
    'database_driver' => $driver,
]);
