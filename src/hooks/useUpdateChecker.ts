import { useState, useEffect, useCallback, useRef } from 'react';

const CHECK_INTERVAL_MS = 60 * 1000; // Revisar cada 60 segundos

function extractMainBundleHash(html: string): string | null {
  // Busca el archivo principal generado por Vite (ej. /assets/index-D8x9aB2c.js)
  const match = html.match(/src=["'](\/assets\/index-[^"']+\.js)["']/i);
  return match ? match[1] : null;
}

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const initialAssetRef = useRef<string | null>(null);

  const checkForNewBuild = useCallback(async () => {
    try {
      // Solicitar index.html saltándose por completo la caché del navegador
      const res = await fetch(`/?_vcheck=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) return;

      const html = await res.text();
      const latestAsset = extractMainBundleHash(html);
      if (!latestAsset) return;

      if (!initialAssetRef.current) {
        // Guardar el bundle con el que el usuario abrió la página
        initialAssetRef.current = latestAsset;
      } else if (initialAssetRef.current !== latestAsset) {
        // Vercel ya desplegó un bundle nuevo distinto al que está en pantalla
        setUpdateAvailable(true);
      }
    } catch {
      // Ignorar fallos temporales de red
    }
  }, []);

  useEffect(() => {
    // Capturar primero el script actual cargado en el DOM si existe
    const currentScript = document.querySelector('script[type="module"][src*="/assets/index-"]');
    if (currentScript) {
      const src = currentScript.getAttribute('src');
      if (src) initialAssetRef.current = src;
    }

    checkForNewBuild();
    const interval = setInterval(checkForNewBuild, CHECK_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForNewBuild();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForNewBuild]);

  // Equivalente al botón "Relaunch" de Google Chrome (limpia caché y recarga la nueva versión)
  const applyUpdate = useCallback(async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((reg) => reg.unregister()));
      }
    } catch {
      // Continuar con recarga forzada aunque falle la limpieza de Cache API
    }

    // Recarga limpia saltándose caché del navegador (sin borrar sesión ni preferencias de usuario)
    const url = new URL(window.location.href);
    url.searchParams.set('updated', String(Date.now()));
    window.location.replace(url.toString());
  }, []);

  return { updateAvailable, applyUpdate };
}
