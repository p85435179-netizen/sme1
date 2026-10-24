const form = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const registerButton = form.querySelector('[type=submit]');
registerButton.disabled = true;

sessionReady
  .then((info) => {
    if (info.user) {
      openWorkspace();
      return;
    }
    registerButton.disabled = false;
  })
  .catch((error) => {
    registerError.textContent = error.message;
    registerError.hidden = false;
  });

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (registerButton.disabled || !form.reportValidity()) return;
  registerButton.disabled = true;
  registerError.hidden = true;
  try {
    const values = Object.fromEntries(new FormData(form));
    values.username = values.username.trim();
    values.name = values.name.trim();
    if (!values.name || !values.workspace?.trim()) {
      throw new Error('Enter your name and business name.');
    }
    const result = await api('register', values);
    form.hidden = true;
    document.getElementById('register-note').hidden = true;
    const message = document.getElementById('registration-success');
    message.textContent = result.message;
    message.hidden = false;
  } catch (error) {
    registerError.textContent = error.message;
    registerError.hidden = false;
  } finally {
    registerButton.disabled = false;
  }
});
