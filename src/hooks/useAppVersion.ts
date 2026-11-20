import { useState, useEffect } from 'react';

const GITHUB_COMMITS_SINCE_URL =
  'https://api.github.com/repos/JyMMerk2/workspace-production-control/commits?since=2026-11-20T14:30:00Z&per_page=100';

const VERSION_STORAGE_KEY = 'boombah_dynamic_version_v4';
const BASE_MAJOR = 4;
const BASE_MINOR = 1;
const BASE_PATCH = 0;

export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(VERSION_STORAGE_KEY);
      if (saved && saved.startsWith('v4.')) return saved;
    } catch {
      // Ignorar si localStorage no está disponible
    }
    return `v${BASE_MAJOR}.${BASE_MINOR}.${BASE_PATCH}`;
  });

  useEffect(() => {
    let isMounted = true;

    const computeDynamicVersion = async () => {
      try {
        const res = await fetch(GITHUB_COMMITS_SINCE_URL, {
          headers: { Accept: 'application/vnd.github.v3+json' }
        });
        if (!res.ok) return;

        const data = await res.json();
        if (!Array.isArray(data)) return;

        // Ordenar del más antiguo al más reciente para calcular los saltos en orden cronológico
        const chronological = [...data].reverse();

        let minor = BASE_MINOR;
        let patch = BASE_PATCH;

        for (const entry of chronological) {
          const msg: string = (entry?.commit?.message || '').split('\n')[0].trim().toLowerCase();
          if (!msg) continue;

          // Si el commit inicia con feat:, nuevo: o module:, sube versión MENOR (ej. v4.2.0)
          if (
            msg.startsWith('feat:') ||
            msg.startsWith('nuevo:') ||
            msg.startsWith('module:')
          ) {
            minor += 1;
            patch = 0;
          } else {
            // Cualquier otro cambio sube versión PARCHE (ej. v4.1.1, v4.1.2)
            patch += 1;
          }
        }

        const computed = `v${BASE_MAJOR}.${minor}.${patch}`;
        if (isMounted) {
          setVersion(computed);
          try {
            localStorage.setItem(VERSION_STORAGE_KEY, computed);
          } catch {
            // Ignorar si excede cuota
          }
        }
      } catch {
        // Mantener versión en caché si no hay red
      }
    };

    computeDynamicVersion();
    const interval = setInterval(computeDynamicVersion, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return version;
}
