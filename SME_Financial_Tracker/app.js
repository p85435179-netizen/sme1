async function refreshWorkspace() {
  try {
    await loadState();
    render();
    toast('Workspace refreshed');
  } catch (error) {
    toast(error.message);
  }
}

(async () => {
  try {
    const info = await sessionReady;
    if (!info.user) {
      location.replace('login.html');
      return;
    }
    try {
      page = decodeURIComponent(location.hash.slice(1)) || 'Overview';
    } catch {
      page = 'Overview';
    }
    await loadState();
    render();
    $('#modal').addEventListener('click', (event) => {
      if (event.target === $('#modal')) closeModal();
    });
  } catch (error) {
    $('#main').setAttribute('aria-busy', 'false');
    $('#main').innerHTML =
      `<section class="card panel"><h1>Unable to load workspace</h1><p>${esc(error.message)}</p><button onclick="location.reload()">Try again</button><a href="login.html">Sign in</a></section>`;
  }
})();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') toggleSidebar(false);
});
matchMedia('(max-width:700px)').addEventListener('change', () => toggleSidebar(false));

let dashboardRefreshPending = false;

async function refreshDashboardInBackground() {
  if (
    document.hidden ||
    dashboardRefreshPending ||
    !currentUser ||
    !['Overview', 'Financial Summary'].includes(page) ||
    $('#modal').open
  )
    return;
  dashboardRefreshPending = true;
  try {
    await loadState();
    if (!$('#modal').open) render();
  } catch {
    console.error('Unable to refresh dashboard.');
  } finally {
    dashboardRefreshPending = false;
  }
}

setInterval(refreshDashboardInBackground, 30000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshDashboardInBackground();
});

