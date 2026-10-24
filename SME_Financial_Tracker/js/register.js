const form = document.getElementById('register-form'),
  registerError = document.getElementById('register-error'),
  registerButton = form.querySelector('[type=submit]');
registerButton.disabled = true;
sessionReady
  .then((info) => {
    if (info.user) {
      openWorkspace(info.user);
      return;
    }
    if (!info.setup) {
      form.hidden = true;
      document.getElementById('register-note').textContent =
        'This business is already registered. Sign in with your account, or ask the owner to create one for you.';
      return;
    }
    registerButton.disabled = false;
  })
  .catch((e) => {
    registerError.textContent = e.message;
    registerError.hidden = false;
  });
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (registerButton.disabled) return;
  registerButton.disabled = true;
  registerError.hidden = true;
  try {
    const values = Object.fromEntries(new FormData(form));
    values.username = values.username.trim();
    await api('setup', values);
    sessionInfo = await api('session');
    openWorkspace(sessionInfo.user);
  } catch (e) {
    registerError.textContent = e.message;
    registerError.hidden = false;
  } finally {
    registerButton.disabled = false;
  }
});
