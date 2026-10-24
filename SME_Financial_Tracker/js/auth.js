const apiBase = new URL('../api/index.php', document.currentScript.src).href;
let sessionInfo;

function workspaceHomeUrl() {
  return new URL('../workspace.php', apiBase).href;
}

function openWorkspace() {
  location.replace(workspaceHomeUrl());
}

async function api(action, data, query = {}) {
  let response;
  try {
    const url = new URL(apiBase);
    url.search = new URLSearchParams({ ...query, action }).toString();
    response = await fetch(url.href, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers:
        data === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              'X-CSRF-Token': sessionInfo?.csrf || '',
            },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  } catch {
    throw new Error('Cannot reach the server. Start Apache in XAMPP and reload this page.');
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      'The server did not return a valid response. Open this system through XAMPP Apache.',
    );
  }
  if (!response.ok) {
    if (response.status === 401 && document.body?.dataset.protected) {
      location.replace(new URL('../login.html', apiBase).href);
    }
    throw new Error(result.error || 'Request failed.');
  }
  return result;
}

const sessionReady = api('session').then((info) => {
  sessionInfo = info;
  return info;
});
sessionReady.catch(() => {});

function logout() {
  openModal('Log out?', '<p>Are you sure you want to log out?</p>', async () => {
    await api('logout', {});
    location.replace(new URL('../login.html', apiBase).href);
  }, 'Log out');
}

window.addEventListener('pageshow', async (event) => {
  if (!event.persisted) return;
  try {
    sessionInfo = await api('session');
    if (document.body?.dataset.protected) {
      if (!sessionInfo.user) {
        location.replace(new URL('../login.html', apiBase).href);
        return;
      }
      await loadState();
      render();
    } else if (sessionInfo.user && !location.pathname.endsWith('admin_setup.html')) {
      openWorkspace();
    }
  } catch {
    location.reload();
  }
});
