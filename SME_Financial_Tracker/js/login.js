const form = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginButton = form.querySelector('[type=submit]');
loginButton.disabled = true;

sessionReady
  .then((info) => {
    if (info.user) {
      openWorkspace();
      return;
    }
    loginButton.disabled = false;
  })
  .catch((error) => {
    loginError.textContent = error.message;
    loginError.hidden = false;
  });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (loginButton.disabled || !form.reportValidity()) return;
  loginButton.disabled = true;
  loginError.hidden = true;
  try {
    const values = Object.fromEntries(new FormData(form));
    values.username = values.username.trim();
    await api('login', values);
    openWorkspace();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally {
    loginButton.disabled = false;
  }
});
