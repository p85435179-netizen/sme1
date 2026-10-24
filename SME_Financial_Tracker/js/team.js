function filteredUsers() {
  return users.filter(
    (user) =>
      (userRole === 'All' || user.role === userRole) &&
      (userStatus === 'All' || user.approval_status === userStatus) &&
      `${user.name} ${user.username}`.toLowerCase().includes(userQuery.toLowerCase()),
  );
}
function userRows(records) {
  return `<div class="tablewrap"><table><thead><tr><th>USER</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${records.map((user) => `<tr><td><strong>${esc(user.name)}</strong><small>${esc(user.username)}</small></td><td>${user.role === 'Business Owner' ? 'Business Owner (Admin)' : esc(user.role)}</td><td><span class="pill ${user.approval_status === 'Pending' ? 'pending' : user.approval_status === 'Approved' ? '' : 'rejected'}">${esc(user.approval_status)}</span></td><td class="row-actions">${['Finance Staff', 'Manager'].includes(user.role) ? `<button onclick="editUser(${user.id})">Edit</button>${user.approval_status === 'Approved' ? `<button ${Number(user.id) === Number(currentUser.id) ? 'disabled' : ''} onclick="setUserStatus(${user.id},'Disabled')">Disable</button>` : `<button onclick="setUserStatus(${user.id},'Approved')">Approve / Enable</button>${user.approval_status === 'Pending' ? `<button onclick="setUserStatus(${user.id},'Rejected')">Reject</button>` : ''}`}${Number(user.id) !== Number(currentUser.id) ? `<button onclick="resetUserPassword(${user.id})">Reset password</button><button class="danger-text" onclick="deleteUser(${user.id})">Delete</button>` : ''}` : '<span class="section-note">Owner account</span>'}</td></tr>`).join('')}</tbody></table></div>${records.length ? '' : '<div class="empty">No users found.</div>'}`;
}
function usersPage() {
  if (role === 'Super Admin') return ownerDirectoryPage();
  return (
    heading(
      'User Management',
      'Add and manage Finance Staff and Manager accounts for your business.',
      '<button class="primary" onclick="editUser()">＋ Add user</button>',
    ) +
    `<section class="card panel"><div class="filters"><input aria-label="Search users" placeholder="Search name or username" value="${esc(userQuery)}" oninput="userQuery=this.value;updateUsers()"><select aria-label="Role" onchange="userRole=this.value;updateUsers()">${['All', 'Business Owner', 'Finance Staff', 'Manager'].map((value) => `<option ${userRole === value ? 'selected' : ''}>${value}</option>`).join('')}</select><select aria-label="Account status" onchange="userStatus=this.value;updateUsers()">${['All', 'Pending', 'Approved', 'Rejected', 'Disabled'].map((value) => `<option ${userStatus === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div id="user-results">${userRows(filteredUsers())}</div></section>`
  );
}
function updateUsers() {
  $('#user-results').innerHTML = userRows(filteredUsers());
}
function editUser(id) {
  const account = id ? users.find((user) => Number(user.id) === id) : null;
  if (account && !['Finance Staff', 'Manager'].includes(account.role)) return;
  openModal(
    account ? 'Edit user' : 'Add user',
    input('Full name', 'name', 'text', account?.name || '') +
      input('Username', 'username', 'text', account?.username || '') +
      selectField(
        'Role',
        'role',
        [
          ['Finance Staff', 'Finance Staff'],
          ['Manager', 'Manager'],
        ],
        ['Finance Staff', 'Manager'].includes(account?.role)
          ? account.role
          : 'Finance Staff',
      ) +
      (account
        ? '<p class="section-note">Editing a pending user does not approve them. Use Approve / Enable after saving.</p>'
        : input('Initial password', 'password', 'password')),
    async (data) => {
      const values = Object.fromEntries(data);
      if (account) values.id = account.id;
      await saveAndRefresh('user_save', values, account ? 'User updated' : 'User created');
    },
  );
}
function setUserStatus(id, status) {
  const account = users.find((user) => Number(user.id) === id);
  openModal(
    'Update account access',
    `<p>${esc(account.name)} · ${esc(account.username)}</p><p>Set this account to ${esc(status.toLowerCase())}?</p>`,
    async () => saveAndRefresh('user_status', { id, status }, 'Account access updated'),
    'Confirm',
  );
}
function resetUserPassword(id) {
  const account = users.find((user) => Number(user.id) === id);
  openModal(
    'Reset password',
    `<p>Set a new password for ${esc(account.username)}.</p>` +
      input('New password', 'password', 'password'),
    async (data) =>
      saveAndRefresh('user_password', { id, password: data.get('password') }, 'Password reset'),
  );
}
function deleteUser(id) {
  const account = users.find((user) => Number(user.id) === id);
  openModal(
    'Remove user?',
    `<p>Remove ${esc(account.name)} from your team? Sign-in access is deleted. Their financial records and activity history are retained.</p>`,
    async () => saveAndRefresh('user_delete', { id, confirm: true }, 'User removed'),
    'Remove user',
  );
}
function registrationsPage() {
  const pending = users.filter((account) => account.approval_status === 'Pending');
  const records = filteredUsers();
  return heading('Business registrations', 'Review business owner applications before allowing sign-in.') +
    `<div class="stats">${stat('Pending registrations', pending.length, 'Awaiting your review')}${stat('Approved owners', users.filter((account) => account.approval_status === 'Approved').length, 'Accounts with business access')}</div>` +
    `<section class="card panel"><div class="filters"><input aria-label="Search registrations" placeholder="Search owner or username" value="${esc(userQuery)}" oninput="userQuery=this.value;updateRegistrations()"><select aria-label="Registration status" onchange="userStatus=this.value;updateRegistrations()">${['All','Pending','Approved','Rejected'].map((value) => `<option ${userStatus === value ? 'selected' : ''}>${value}</option>`).join('')}</select></div><div id="registration-results">${registrationRows(records)}</div></section>`;
}
function registrationRows(records) {
  return `<div class="tablewrap"><table><thead><tr><th>OWNER</th><th>BUSINESS</th><th>SUBMITTED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${records.map((account) => `<tr><td><strong>${esc(account.name)}</strong><small>${esc(account.username)}</small></td><td>${esc(account.business)}</td><td>${esc(formatTimestamp(account.created_at))}</td><td><span class="pill ${account.approval_status === 'Pending' ? 'pending' : account.approval_status === 'Approved' ? '' : 'rejected'}">${esc(account.approval_status)}</span></td><td class="row-actions">${account.approval_status === 'Pending' ? `<button onclick="reviewRegistration(${Number(account.id)},'Approved')">Approve</button><button class="danger-text" onclick="reviewRegistration(${Number(account.id)},'Rejected')">Reject</button>` : 'Reviewed'}</td></tr>`).join('')}</tbody></table></div>${records.length ? '' : '<div class="empty">No registrations found.</div>'}`;
}
function updateRegistrations() {
  $('#registration-results').innerHTML = registrationRows(filteredUsers());
}
function reviewRegistration(id, status) {
  const account = users.find((entry) => Number(entry.id) === id);
  openModal(status === 'Approved' ? 'Approve registration?' : 'Reject registration?',
    `<p>${esc(account.name)} · ${esc(account.business)}</p><p>${status === 'Approved' ? 'Allow this owner to sign in and manage their business?' : 'Reject this application? This owner will not be able to sign in.'}</p>`,
    async () => saveAndRefresh('registration_review', {id, status}, 'Registration ' + status.toLowerCase()),
    status === 'Approved' ? 'Approve' : 'Reject');
}
function ownerDirectoryPage() {
  return heading('User Management', 'Create accounts for any role, or select an owner to view their business team.', '<button class="primary" onclick="createAdminUser()">＋ Add user</button>') +
    `<section class="card panel"><div class="filters"><input aria-label="Search business owners" placeholder="Search owner, username or business" value="${esc(userQuery)}" oninput="userQuery=this.value;updateOwnerDirectory()"></div><div id="owner-directory">${ownerDirectoryRows()}</div></section>` +
    `<section class="card panel"><h2>Super Admins</h2><div class="tablewrap"><table><thead><tr><th>NAME</th><th>USERNAME</th><th>STATUS</th></tr></thead><tbody>${systemAdmins.map((account) => `<tr><td>${esc(account.name)}</td><td>${esc(account.username)}</td><td>${esc(account.approval_status)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function ownerDirectoryRows() {
  const records = users.filter((account) => `${account.name} ${account.username} ${account.business}`.toLowerCase().includes(userQuery.toLowerCase()));
  return `<div class="tablewrap"><table><thead><tr><th>BUSINESS OWNER</th><th>BUSINESS</th><th>STATUS</th><th>TEAM</th></tr></thead><tbody>${records.map((account) => `<tr><td><button class="owner-name-button" onclick="viewBusinessTeam(${Number(account.id)})">${esc(account.name)}</button><small>${esc(account.username)}</small></td><td>${esc(account.business)}</td><td><span class="pill ${account.approval_status === 'Pending' ? 'pending' : account.approval_status === 'Approved' ? '' : 'rejected'}">${esc(account.approval_status)}</span></td><td><button onclick="viewBusinessTeam(${Number(account.id)})">View staff &amp; managers</button></td></tr>`).join('')}</tbody></table></div>${records.length ? '' : '<div class="empty">No business owners found.</div>'}`;
}
function updateOwnerDirectory() {
  $('#owner-directory').innerHTML = ownerDirectoryRows();
}
async function viewBusinessTeam(id) {
  try {
    const result = await api('business_team', undefined, { owner_id: id });
    openModal('Business team', businessTeamDetails(result), async () => closeModal(), 'Done');
  } catch (error) {
    toast(error.message);
  }
}
function businessTeamDetails({ owner, team }) {
  return `<p><strong>${esc(owner.business)}</strong></p><p>Owner: ${esc(owner.name)} · ${esc(owner.username)}</p><p>${team.filter((account) => account.role === 'Finance Staff').length} Finance Staff · ${team.filter((account) => account.role === 'Manager').length} Managers</p><div class="tablewrap"><table><thead><tr><th>NAME</th><th>ROLE</th><th>STATUS</th></tr></thead><tbody>${team.map((account) => `<tr><td><strong>${esc(account.name)}</strong><small>${esc(account.username)}</small></td><td>${esc(account.role)}</td><td>${esc(account.approval_status)}</td></tr>`).join('')}</tbody></table></div>${team.length ? '' : '<div class="empty">This business has no Finance Staff or Managers yet.</div>'}`;
}
function createAdminUser() {
  const businesses = [...new Map(users.filter((account) => account.approval_status === 'Approved' && Number(account.active) === 1).map((account) => [Number(account.workspace_id), account.business])).entries()];
  openModal('Create user',
    input('Full name', 'name') + input('Username', 'username') +
    selectField('Role', 'role', ['Business Owner', 'Finance Staff', 'Manager', 'Super Admin'].map((value) => [value, value]), 'Business Owner') +
    `<div id="new-owner-business">${input('Business name', 'workspace')}</div>` +
    `<div id="new-team-business" hidden>${selectField('Business', 'workspace_id', [['', 'Select a business'], ...businesses], '')}<p class="section-note">Select the business this staff member or manager belongs to.</p></div>` +
    input('Initial password', 'password', 'password') +
    '<p class="section-note">Accounts created by Super Admin are approved immediately.</p>',
    async (data) => saveAndRefresh('admin_user_create', Object.fromEntries(data), 'User created'),
    'Create user');
  $('#field-role').addEventListener('change', updateAdminUserRole);
  updateAdminUserRole();
}
function updateAdminUserRole() {
  const selected = $('#field-role').value;
  const owner = selected === 'Business Owner';
  const team = ['Finance Staff', 'Manager'].includes(selected);
  $('#new-owner-business').hidden = !owner;
  $('#field-workspace').disabled = !owner;
  $('#field-workspace').required = owner;
  $('#new-team-business').hidden = !team;
  $('#field-workspace_id').disabled = !team;
  $('#field-workspace_id').required = team;
}
