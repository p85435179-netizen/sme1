function render() {
  if (!menus().includes(page)) page = menus()[0];
  $('#person').textContent = currentUser.name;
  $('#initials').textContent = currentUser.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
  $('#job').textContent = role === 'Business Owner' ? 'Business Owner (Admin)' : role;
  $('#role-label').textContent = role === 'Business Owner' ? 'Owner / Admin' : role;
  $('#business-name').textContent = currentUser.business || 'System Administration';
  $('#business-initial').textContent = (currentUser.business || 'B')[0].toUpperCase();
  $('#workspace-description').textContent =
    role === 'Super Admin' ? 'Business registration approvals' : 'Business financial tracker';
  $('#crumb').textContent = page;
  const icons = {
    Registrations: '♙',
    Overview: '▦',
    Income: '↗',
    Expenses: '↘',
    Transactions: '⇄',
    Invoices: '▤',
    Reports: '▥',
    'Financial Summary': '₱',
    Users: '♙',
    Activity: '◷',
    Settings: '⚙',
    'My account': '♙',
  };
  $('#nav').innerHTML = menus()
    .map(
      (item) =>
        `<button class="nav ${page === item ? 'active' : ''}" ${page === item ? 'aria-current="page"' : ''} onclick="go('${item}')">${icons[item]}<span>${item}</span></button>`,
    )
    .join('');
  const pages = {
    Registrations: registrationsPage,
    Overview: overview,
    Income: transactionsPage,
    Expenses: transactionsPage,
    Transactions: transactionsPage,
    Invoices: invoicesPage,
    Reports: reportsPage,
    'Financial Summary': financialSummaryPage,
    Users: usersPage,
    Activity: activityPage,
    Settings: settingsPage,
    'My account': settingsPage,
  };
  $('#main').innerHTML = pages[page]();
  $('#main').setAttribute('aria-busy', 'false');
  document.title = `${page} | SME Financial Tracker`;
}
