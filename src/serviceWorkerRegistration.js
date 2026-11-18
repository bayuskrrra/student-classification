// Registrasi service worker (PWA offline).
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    const url = `${process.env.PUBLIC_URL}/service-worker.js`;
    navigator.serviceWorker
      .register(url)
      .then((reg) => {
        if (config && config.onSuccess) config.onSuccess(reg);
      })
      .catch((err) => {
        if (isLocalhost) console.error('SW gagal:', err);
      });
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => reg.unregister());
  }
}
