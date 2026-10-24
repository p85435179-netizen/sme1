function menus() {
  return roleModules[role] || [];
}

function go(target) {
  if (!menus().includes(target)) return;
  location.assign(moduleUrl(role, target));
}

function toggleSidebar(open) {
  const shown = open === undefined ? !document.body.classList.contains('sidebar-open') : open;
  document.body.classList.toggle('sidebar-open', shown);
  $('.menu-toggle').setAttribute('aria-expanded', String(shown));
}
