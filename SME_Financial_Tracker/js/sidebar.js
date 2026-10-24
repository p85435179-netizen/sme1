function menus() {
  if (role === 'Super Admin') return ['Registrations', 'Users', 'My account'];
  const financial = ['Overview', 'Income', 'Expenses', 'Transactions'];
  if (role !== 'Manager') financial.push('Invoices');
  financial.push('Reports', 'Financial Summary');
  if (role === 'Business Owner') financial.push('Users', 'Activity', 'Settings');
  else if (role === 'Finance Staff') financial.push('Activity', 'My account');
  else financial.push('My account');
  return financial;
}

function go(target) {
  if (!menus().includes(target)) return;
  page = target;
  pageNumber = 1;
  history.pushState({}, '', '#' + encodeURIComponent(target));
  toggleSidebar(false);
  render();
}

function toggleSidebar(open) {
  const shown = open === undefined ? !document.body.classList.contains('sidebar-open') : open;
  document.body.classList.toggle('sidebar-open', shown);
  $('.menu-toggle').setAttribute('aria-expanded', String(shown));
}

window.addEventListener('popstate', () => {
  try {
    page = decodeURIComponent(location.hash.slice(1)) || 'Overview';
  } catch {
    page = 'Overview';
  }
  render();
});
