const apiBase = new URL('../api/index.php', document.currentScript.src).href;
let sessionInfo;

const roleDirectories = {
  'Super Admin': 'superadmin',
  'Business Owner': 'business_owner',
  'Finance Staff': 'finance_staff',
  Manager: 'manager',
};
const moduleFiles = {
  Overview: 'dashboard',
  Income: 'income',
  Expenses: 'expenses',
  Transactions: 'transactions',
  Invoices: 'invoices',
  Reports: 'reports',
  'Financial Summary': 'financial_summary',
  Users: 'user_management',
  Activity: 'activity',
  Settings: 'settings',
  'My account': 'my_account',
  Registrations: 'registrations',
};
const roleModules = {
  'Super Admin': ['Registrations', 'Users', 'My account'],
  'Business Owner': [
    'Overview',
    'Income',
    'Expenses',
    'Transactions',
    'Invoices',
    'Reports',
    'Financial Summary',
    'Users',
    'Activity',
    'Settings',
  ],
  'Finance Staff': [
    'Overview',
    'Income',
    'Expenses',
    'Transactions',
    'Invoices',
    'Reports',
    'Financial Summary',
    'Activity',
    'My account',
  ],
  Manager: [
    'Overview',
    'Income',
    'Expenses',
    'Transactions',
    'Reports',
    'Financial Summary',
    'My account',
  ],
};
function moduleUrl(userRole, module) {
  const directory = roleDirectories[userRole];
  if (!directory) return new URL('../login.php', apiBase).href;
  if (!roleModules[userRole].includes(module)) module = roleModules[userRole][0];
  return new URL('../' + directory + '/' + moduleFiles[module] + '.php', apiBase).href;
}
function workspaceHomeUrl(account = sessionInfo?.user) {
  if (!account) return new URL('../login.php', apiBase).href;
  return moduleUrl(account.role, account.role === 'Super Admin' ? 'Registrations' : 'Overview');
}
async function openWorkspace() {
  try {
    sessionInfo = await api('session');
    location.replace(workspaceHomeUrl());
  } catch (error) {
    const output = document.querySelector('[role=alert]');
    if (output) {
      output.textContent = error.message;
      output.hidden = false;
    }
  }
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
      location.replace(new URL('../login.php', apiBase).href);
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
  openModal(
    'Log out?',
    '<p>Are you sure you want to log out?</p>',
    async () => {
      await api('logout', {});
      location.replace(new URL('../login.php', apiBase).href);
    },
    'Log out',
  );
}

window.addEventListener('pageshow', async (event) => {
  if (!event.persisted) return;
  try {
    sessionInfo = await api('session');
    if (document.body?.dataset.protected) {
      if (!sessionInfo.user) {
        location.replace(new URL('../login.php', apiBase).href);
        return;
      }
      if (document.body.dataset.role !== sessionInfo.user.role) {
        location.replace(workspaceHomeUrl(sessionInfo.user));
        return;
      }
      await loadState();
      render();
    } else if (sessionInfo.user && !location.pathname.endsWith('admin_setup.php')) {
      openWorkspace();
    }
  } catch {
    location.reload();
  }
});
