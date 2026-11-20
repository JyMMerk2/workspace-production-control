import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabaseClient';

export type AnnouncementPriority = 'URGENTE' | 'PRIORIDAD' | 'NO OLVIDAR';

export interface AnnouncementItem {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  updatedBy: string;
  updatedAt: string;
}

export interface UrgentAnnouncement {
  items: AnnouncementItem[];
  message: string;
  active: boolean;
  priority: AnnouncementPriority;
  updatedBy: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'boombah_urgent_announcement_v3';

function normalizePriority(val: any): AnnouncementPriority {
  const upper = String(val || '').toUpperCase().trim();
  if (upper === 'PRIORIDAD') return 'PRIORIDAD';
  if (upper === 'NO OLVIDAR') return 'NO OLVIDAR';
  return 'URGENTE';
}

function buildStateFromItems(items: AnnouncementItem[]): UrgentAnnouncement {
  const validItems = Array.isArray(items)
    ? items.filter((it) => it && String(it.message || '').trim().length > 0)
    : [];
  const first = validItems[0];
  return {
    items: validItems,
    message: first ? first.message : '',
    active: validItems.length > 0,
    priority: first ? first.priority : 'URGENTE',
    updatedBy: first ? first.updatedBy : '',
    updatedAt: first ? first.updatedAt : '',
  };
}

function parseRowToItems(row: any): AnnouncementItem[] {
  if (!row || !row.active) return [];
  const rawMessage = String(row.message || '').trim();
  if (!rawMessage) return [];

  if (rawMessage.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((entry) => entry && String(entry.message || '').trim())
          .map((entry, idx) => ({
            id: String(entry.id || `item_${idx}_${Date.now()}`),
            message: String(entry.message).trim(),
            priority: normalizePriority(entry.priority),
            updatedBy: String(entry.updatedBy || row.updated_by || 'ADMIN'),
            updatedAt: String(entry.updatedAt || row.updated_at || new Date().toISOString()),
          }));
      }
    } catch {
      // Si falla el parseo JSON, tratar como texto simple
    }
  }

  return [
    {
      id: 'legacy_1',
      message: rawMessage,
      priority: normalizePriority(row.priority),
      updatedBy: String(row.updated_by || 'ADMIN'),
      updatedAt: String(row.updated_at || new Date().toISOString()),
    },
  ];
}

const DEFAULT_ANNOUNCEMENT: UrgentAnnouncement = buildStateFromItems([]);

export function useUrgentAnnouncement() {
  const [announcement, setAnnouncement] = useState<UrgentAnnouncement>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          return buildStateFromItems(parsed.items);
        }
      }
    } catch {
      // Ignorar errores de lectura o caché corrupta
    }
    return DEFAULT_ANNOUNCEMENT;
  });

  const [isSaving, setIsSaving] = useState(false);

  const syncLocalAndState = useCallback((nextItems: AnnouncementItem[]) => {
    const nextState = buildStateFromItems(nextItems);
    setAnnouncement(nextState);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // Ignorar cuota
    }
    window.dispatchEvent(new CustomEvent('boombah-urgent-updated', { detail: nextState }));
  }, []);

  const fetchAnnouncement = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('boombah_announcements')
        .select('message, active, priority, updated_by, updated_at')
        .eq('id', 'global_urgent')
        .maybeSingle();

      if (!error && data) {
        syncLocalAndState(parseRowToItems(data));
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
      if (custom.detail && Array.isArray(custom.detail.items)) {
        setAnnouncement(buildStateFromItems(custom.detail.items));
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
                syncLocalAndState(parseRowToItems(row));
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

  const persistItems = async (nextItems: AnnouncementItem[], author: string) => {
    setIsSaving(true);
    const cleanItems = nextItems.filter((it) => it && String(it.message || '').trim().length > 0);
    const isActuallyActive = cleanItems.length > 0;
    const nowIso = new Date().toISOString();

    syncLocalAndState(cleanItems);

    try {
      if (supabase) {
        await supabase.from('boombah_announcements').upsert({
          id: 'global_urgent',
          message: isActuallyActive ? JSON.stringify(cleanItems) : '',
          active: isActuallyActive,
          priority: cleanItems[0]?.priority || 'URGENTE',
          updated_by: author || 'ADMIN',
          updated_at: nowIso,
        });
      }
    } catch (err) {
      console.warn('No se pudo sincronizar comunicados con Supabase:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addAnnouncement = async (
    message: string,
    author: string,
    priority: AnnouncementPriority = 'URGENTE'
  ) => {
    const trimmed = String(message || '').trim();
    if (!trimmed) return;

    const newItem: AnnouncementItem = {
      id: `adv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      message: trimmed,
      priority: normalizePriority(priority),
      updatedBy: author || 'ADMIN',
      updatedAt: new Date().toISOString(),
    };

    const nextItems = [newItem, ...(announcement.items || [])];
    await persistItems(nextItems, author);
  };

  const removeAnnouncement = async (id: string, author: string) => {
    const nextItems = (announcement.items || []).filter((it) => it.id !== id);
    await persistItems(nextItems, author);
  };

  const clearAllAnnouncements = async (author: string) => {
    await persistItems([], author);
  };

  // Mantiene compatibilidad si algún componente antiguo llama saveAnnouncement
  const saveAnnouncement = async (
    message: string,
    active: boolean,
    author: string,
    priority: AnnouncementPriority = 'URGENTE'
  ) => {
    const trimmed = String(message || '').trim();
    if (!active || !trimmed) {
      await clearAllAnnouncements(author);
      return;
    }
    await addAnnouncement(trimmed, author, priority);
  };

  return {
    announcement,
    addAnnouncement,
    removeAnnouncement,
    clearAllAnnouncements,
    saveAnnouncement,
    isSaving,
  };
}
