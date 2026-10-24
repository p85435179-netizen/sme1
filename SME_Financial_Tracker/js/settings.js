function settingsPage() {
  return (
    heading(
      role === 'Business Owner' ? 'Business settings' : 'My account',
      'Manage your account securely.',
    ) +
    `<section class="card panel"><div class="settingrow"><div><strong>Your account</strong><p>${esc(currentUser.name)} · ${esc(currentUser.username)} · ${esc(role)}</p></div><button onclick="changePassword()">Change password</button></div>${role === 'Business Owner' ? `<div class="settingrow"><div><strong>Business name</strong><p>${esc(currentUser.business)}</p></div><button onclick="editBusiness()">Edit business / cash</button></div><div class="settingrow"><div><strong>Opening cash balance</strong><p>The cash available before your first logged transaction.</p></div><b>${money(currentUser.opening_balance)}</b></div><div class="settingrow"><div><strong>Current cash balance</strong><p>Opening balance + recorded income − recorded expenses.</p></div><b>${money(cashBalance())}</b></div>` : ''}<div class="settingrow"><div><strong>Currency</strong><p>Philippine peso (PHP)</p></div><b>₱</b></div></section>`
  );
}
function editBusiness() {
  openModal(
    'Business and opening cash',
    input('Business name', 'name', 'text', currentUser.business) +
      input(
        'Opening cash balance (before recorded transactions)',
        'opening_balance',
        'number',
        currentUser.opening_balance || 0,
      ).replace('min="0.01"', 'min="0"'),
    async (data) =>
      saveAndRefresh('workspace_update', Object.fromEntries(data), 'Business settings updated'),
  );
}
function changePassword() {
  openModal(
    'Change password',
    input('Current password', 'current', 'password')
      .replace('minlength="10"', 'minlength="1"')
      .replace('autocomplete="new-password"', 'autocomplete="current-password"') +
      input('New password', 'password', 'password'),
    async (data) => saveAndRefresh('password', Object.fromEntries(data), 'Password updated'),
  );
}
function activityPage() {
  return (
    heading('Activity history', 'Latest 100 recorded events for your business.') +
    `<section class="card panel"><div class="tablewrap"><table><thead><tr><th>WHEN</th><th>USER</th><th>ACTION</th><th>DETAILS</th></tr></thead><tbody>${activities.map((event) => `<tr><td>${esc(formatTimestamp(event.created_at))}</td><td>${esc(event.actor_name)}</td><td>${esc(event.action)}</td><td class="wrap-note">${esc(event.details)}</td></tr>`).join('')}</tbody></table></div>${activities.length ? '' : '<div class="empty">No activity recorded.</div>'}</section>`
  );
}
