import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qpozgkxdzcixjkjblntd.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3pna3hkemNpeGpramJsbnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDAzMjEsImV4cCI6MjEwNDAxNjMyMX0.RYHR0XYeG6-YGI8zmird9FF-KP67_CmVsVpv5gYTS5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface UrgentAnnouncement {
  message: string;
  active: boolean;
  updatedBy: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'boombah_urgent_announcement_v1';

export function useUrgentAnnouncement() {
  const [announcement, setAnnouncement] = useState<UrgentAnnouncement>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignorar errores de lectura
    }
    return { message: '', active: false, updatedBy: '', updatedAt: '' };
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
      const { data, error } = await supabase
        .from('boombah_announcements')
        .select('message, active, updated_by, updated_at')
        .eq('id', 'global_urgent')
        .maybeSingle();

      if (!error && data) {
        syncLocalAndState({
          message: data.message || '',
          active: Boolean(data.active && (data.message || '').trim()),
          updatedBy: data.updated_by || '',
          updatedAt: data.updated_at || new Date().toISOString(),
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
      if (custom.detail) setAnnouncement(custom.detail);
    };
    window.addEventListener('boombah-urgent-updated', handleLocalEvent);

    // Suscripción en tiempo real de Supabase para todos los usuarios conectados
    const channel = supabase
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
            syncLocalAndState({
              message: row.message || '',
              active: Boolean(row.active && (row.message || '').trim()),
              updatedBy: row.updated_by || '',
              updatedAt: row.updated_at || new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    // Respaldo de polling cada 15 segundos
    const poll = setInterval(fetchAnnouncement, 15000);

    return () => {
      window.removeEventListener('boombah-urgent-updated', handleLocalEvent);
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [fetchAnnouncement, syncLocalAndState]);

  const saveAnnouncement = async (message: string, active: boolean, author: string) => {
    setIsSaving(true);
    const trimmed = message.trim();
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
      await supabase.from('boombah_announcements').upsert({
        id: 'global_urgent',
        message: trimmed,
        active: isActuallyActive,
        updated_by: author || 'ADMIN',
        updated_at: nowIso,
      });
    } catch (err) {
      console.warn('No se pudo sincronizar comunicado con Supabase:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return { announcement, saveAnnouncement, isSaving };
}
