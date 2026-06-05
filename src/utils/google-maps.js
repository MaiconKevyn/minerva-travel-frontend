let googleMapsLoaderPromise = null;

const runtimeConfig = () => globalThis.__MINERVA_CONFIG__ || {};

export const googleMapsBrowserKey = () => (
  import.meta.env?.VITE_GOOGLE_MAPS_BROWSER_KEY ||
  runtimeConfig().VITE_GOOGLE_MAPS_BROWSER_KEY ||
  ''
);

export const googleMapsMapId = () => (
  import.meta.env?.VITE_GOOGLE_MAPS_MAP_ID ||
  runtimeConfig().VITE_GOOGLE_MAPS_MAP_ID ||
  ''
);

export const loadGoogleMaps = (apiKey) => {
  if (globalThis.google?.maps?.importLibrary) {
    return Promise.resolve(globalThis.google);
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('minerva-google-maps-js');
      if (existing) {
        existing.addEventListener('load', () => resolve(globalThis.google), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = 'minerva-google-maps-js';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=marker&loading=async`;
      script.async = true;
      script.onload = () => resolve(globalThis.google);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  return googleMapsLoaderPromise;
};

export const clearGoogleMarkers = (markers = []) => {
  markers.filter(Boolean).forEach((marker) => {
    if ('map' in marker) {
      marker.map = null;
    } else if (typeof marker.setMap === 'function') {
      marker.setMap(null);
    }
  });
};
