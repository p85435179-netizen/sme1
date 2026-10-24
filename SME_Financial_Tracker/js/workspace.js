sessionReady
  .then((info) => {
    let target;
    try {
      target = decodeURIComponent(location.hash.slice(1));
    } catch {
      target = '';
    }
    location.replace(
      info.user && moduleFiles[target]
        ? moduleUrl(info.user.role, target)
        : workspaceHomeUrl(info.user),
    );
  })
  .catch((error) => {
    document.querySelector('[role=alert]').textContent = error.message;
  });
