import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabaseClient';

export interface UrgentAnnouncement {
  message: string;
  active: boolean;
  updatedBy: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'boombah_urgent_announcement_v1';

const DEFAULT_ANNOUNCEMENT: UrgentAnnouncement = {
  message: '',
  active: false,
  updatedBy: '',
  updatedAt: '',
};

export function useUrgentAnnouncement() {
  const [announcement, setAnnouncement] = useState<UrgentAnnouncement>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            message: String(parsed.message || ''),
            active: Boolean(parsed.active),
            updatedBy: String(parsed.updatedBy || ''),
            updatedAt: String(parsed.updatedAt || ''),
          };
        }
      }
    } catch {
      // Ignorar errores de lectura o caché corrupta
    }
    return DEFAULT_ANNOUNCEMENT;
  });

  const [isSaving, setIsSaving] = useState(false);

  const syncLocalAndState = useCallback((next: UrgentAnnouncement) => {
    setAnnouncement(next);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignorar cuota
    }
    window.dispatchEvent(new CustomEvent('boombah-urgent-updated', { detail: next }));
  }, []);

  const fetchAnnouncement = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('boombah_announcements')
        .select('message, active, updated_by, updated_at')
        .eq('id', 'global_urgent')
        .maybeSingle();

      if (!error && data) {
        const msg = String(data.message || '');
        syncLocalAndState({
          message: msg,
          active: Boolean(data.active && msg.trim()),
          updatedBy: String(data.updated_by || ''),
          updatedAt: String(data.updated_at || new Date().toISOString()),
        });
      }
    } catch {
      // Mantener copia local si no hay conexión
    }
  }, [syncLocalAndState]);

  useEffect(() => {
    fetchAnnouncement();

    // Escuchar actualizaciones locales en la misma pestaña
    const handleLocalEvent = (e: Event) => {
      const custom = e as CustomEvent<UrgentAnnouncement>;
      if (custom.detail && typeof custom.detail === 'object') {
        setAnnouncement(custom.detail);
      }
    };
    window.addEventListener('boombah-urgent-updated', handleLocalEvent);

    // Suscripción en tiempo real de Supabase para todos los usuarios conectados
    let channel: any = null;
    try {
      if (supabase) {
        channel = supabase
          .channel('boombah-urgent-channel')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'boombah_announcements',
              filter: 'id=eq.global_urgent',
            },
            (payload) => {
              const row = payload.new as any;
              if (row) {
                const msg = String(row.message || '');
                syncLocalAndState({
                  message: msg,
                  active: Boolean(row.active && msg.trim()),
                  updatedBy: String(row.updated_by || ''),
                  updatedAt: String(row.updated_at || new Date().toISOString()),
                });
              }
            }
          )
          .subscribe();
      }
    } catch {
      // Ignorar si realtime no está habilitado en la tabla
    }

    // Respaldo de polling cada 15 segundos
    const poll = setInterval(fetchAnnouncement, 15000);

    return () => {
      window.removeEventListener('boombah-urgent-updated', handleLocalEvent);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      clearInterval(poll);
    };
  }, [fetchAnnouncement, syncLocalAndState]);

  const saveAnnouncement = async (message: string, active: boolean, author: string) => {
    setIsSaving(true);
    const trimmed = String(message || '').trim();
    const isActuallyActive = Boolean(active && trimmed.length > 0);
    const nowIso = new Date().toISOString();

    const next: UrgentAnnouncement = {
      message: trimmed,
      active: isActuallyActive,
      updatedBy: author || 'ADMIN',
      updatedAt: nowIso,
    };

    // Actualizar inmediatamente en el navegador actual
    syncLocalAndState(next);

    try {
      if (supabase) {
        await supabase.from('boombah_announcements').upsert({
          id: 'global_urgent',
          message: trimmed,
          active: isActuallyActive,
          updated_by: author || 'ADMIN',
          updated_at: nowIso,
        });
      }
    } catch (err) {
      console.warn('No se pudo sincronizar comunicado con Supabase:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return { announcement, saveAnnouncement, isSaving };
}
