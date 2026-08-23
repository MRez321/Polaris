// Service Worker Registration for PWA
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Prevent registration inside embedded iframes to avoid security and constructor exceptions
  try {
    if (window.self !== window.top) {
      // In an iframe (such as sandbox/preview), skip service worker registration
      return;
    }
  } catch {
    // Cross-origin iframe access restriction also indicates an iframe
    return;
  }

  try {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('[PWA] Service Worker registered with scope:', registration?.scope);

            if (registration) {
              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                if (installingWorker) {
                  installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                      if (navigator.serviceWorker.controller) {
                        console.log('[PWA] New content is available; please refresh.');
                      } else {
                        console.log('[PWA] Content is cached for offline use.');
                      }
                    }
                  };
                }
              };
            }
          })
          .catch((error) => {
            console.warn('[PWA] Service Worker registration skipped:', error);
          });
      } catch (err) {
        console.warn('[PWA] SW register invocation error:', err);
      }
    });
  } catch (err) {
    console.warn('[PWA] Service worker listener error:', err);
  }
}

