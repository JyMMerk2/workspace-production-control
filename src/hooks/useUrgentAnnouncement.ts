import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../data/supabaseClient';

export type AnnouncementPriority = 'URGENTE' | 'PRIORIDAD' | 'NO OLVIDAR' | 'AVISO';
export type AnnouncementDisplayMode = 'rotativo' | 'cintillo';

export interface AnnouncementItem {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  updatedBy: string;
  updatedAt: string;
}

export interface UrgentAnnouncement {
  items: AnnouncementItem[];
  displayMode: AnnouncementDisplayMode;
  message: string;
  active: boolean;
  priority: AnnouncementPriority;
  updatedBy: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'boombah_urgent_announcement_v4';

function normalizePriority(val: any): AnnouncementPriority {
  const upper = String(val || '').toUpperCase().trim();
  if (upper === 'PRIORIDAD') return 'PRIORIDAD';
  if (upper === 'NO OLVIDAR') return 'NO OLVIDAR';
  if (upper === 'AVISO') return 'AVISO';
  return 'URGENTE';
}

function normalizeDisplayMode(val: any): AnnouncementDisplayMode {
  return val === 'cintillo' ? 'cintillo' : 'rotativo';
}

function buildStateFromData(
  items: AnnouncementItem[],
  displayMode: AnnouncementDisplayMode = 'rotativo'
): UrgentAnnouncement {
  const validItems = Array.isArray(items)
    ? items.filter((it) => it && String(it.message || '').trim().length > 0)
    : [];
  const first = validItems[0];
  return {
    items: validItems,
    displayMode: normalizeDisplayMode(displayMode),
    message: first ? first.message : '',
    active: validItems.length > 0,
    priority: first ? first.priority : 'URGENTE',
    updatedBy: first ? first.updatedBy : '',
    updatedAt: first ? first.updatedAt : '',
  };
}

function parseRowToData(row: any): {
  items: AnnouncementItem[];
  displayMode: AnnouncementDisplayMode;
} {
  if (!row || !row.active) {
    return { items: [], displayMode: 'rotativo' };
  }

  const rawMessage = String(row.message || '').trim();
  if (!rawMessage) {
    return { items: [], displayMode: 'rotativo' };
  }

  // Formato objeto v4: { displayMode: 'rotativo' | 'cintillo', items: [...] }
  if (rawMessage.startsWith('{')) {
    try {
      const parsedObj = JSON.parse(rawMessage);
      if (parsedObj && Array.isArray(parsedObj.items)) {
        const items = parsedObj.items
          .filter((entry: any) => entry && String(entry.message || '').trim())
          .map((entry: any, idx: number) => ({
            id: String(entry.id || `item_${idx}_${Date.now()}`),
            message: String(entry.message).trim(),
            priority: normalizePriority(entry.priority),
            updatedBy: String(entry.updatedBy || row.updated_by || 'ADMIN'),
            updatedAt: String(entry.updatedAt || row.updated_at || new Date().toISOString()),
          }));
        return {
          items,
          displayMode: normalizeDisplayMode(parsedObj.displayMode),
        };
      }
    } catch {
      // Continuar con fallback
    }
  }

  // Formato arreglo v3: [...]
  if (rawMessage.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (Array.isArray(parsed)) {
        const items = parsed
          .filter((entry) => entry && String(entry.message || '').trim())
          .map((entry, idx) => ({
            id: String(entry.id || `item_${idx}_${Date.now()}`),
            message: String(entry.message).trim(),
            priority: normalizePriority(entry.priority),
            updatedBy: String(entry.updatedBy || row.updated_by || 'ADMIN'),
            updatedAt: String(entry.updatedAt || row.updated_at || new Date().toISOString()),
          }));
        return { items, displayMode: 'rotativo' };
      }
    } catch {
      // Continuar con fallback
    }
  }

  // Formato texto simple v1/v2
  return {
    items: [
      {
        id: 'legacy_1',
        message: rawMessage,
        priority: normalizePriority(row.priority),
        updatedBy: String(row.updated_by || 'ADMIN'),
        updatedAt: String(row.updated_at || new Date().toISOString()),
      },
    ],
    displayMode: 'rotativo',
  };
}

const DEFAULT_ANNOUNCEMENT: UrgentAnnouncement = buildStateFromData([], 'rotativo');

export function useUrgentAnnouncement() {
  const [announcement, setAnnouncement] = useState<UrgentAnnouncement>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.items)) {
          return buildStateFromData(parsed.items, parsed.displayMode);
        }
      }
    } catch {
      // Ignorar errores de lectura o caché corrupta
    }
    return DEFAULT_ANNOUNCEMENT;
  });

  const [isSaving, setIsSaving] = useState(false);

  const syncLocalAndState = useCallback(
    (nextItems: AnnouncementItem[], nextMode: AnnouncementDisplayMode) => {
      const nextState = buildStateFromData(nextItems, nextMode);
      setAnnouncement(nextState);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextState));
      } catch {
        // Ignorar cuota
      }
      window.dispatchEvent(new CustomEvent('boombah-urgent-updated', { detail: nextState }));
    },
    []
  );

  const fetchAnnouncement = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('boombah_announcements')
        .select('message, active, priority, updated_by, updated_at')
        .eq('id', 'global_urgent')
        .maybeSingle();

      if (!error && data) {
        const parsed = parseRowToData(data);
        syncLocalAndState(parsed.items, parsed.displayMode);
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
        setAnnouncement(buildStateFromData(custom.detail.items, custom.detail.displayMode));
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
                const parsed = parseRowToData(row);
                syncLocalAndState(parsed.items, parsed.displayMode);
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

  const persistPayload = async (
    nextItems: AnnouncementItem[],
    nextMode: AnnouncementDisplayMode,
    author: string
  ) => {
    setIsSaving(true);
    const cleanItems = nextItems.filter((it) => it && String(it.message || '').trim().length > 0);
    const cleanMode = normalizeDisplayMode(nextMode);
    const isActuallyActive = cleanItems.length > 0;
    const nowIso = new Date().toISOString();

    syncLocalAndState(cleanItems, cleanMode);

    try {
      if (supabase) {
        const serialized = isActuallyActive
          ? JSON.stringify({ displayMode: cleanMode, items: cleanItems })
          : '';

        await supabase.from('boombah_announcements').upsert({
          id: 'global_urgent',
          message: serialized,
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
    priority: AnnouncementPriority = 'URGENTE',
    displayMode?: AnnouncementDisplayMode
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
    const modeToUse = displayMode ?? announcement.displayMode ?? 'rotativo';
    await persistPayload(nextItems, modeToUse, author);
  };

  const setDisplayMode = async (mode: AnnouncementDisplayMode, author: string) => {
    const cleanMode = normalizeDisplayMode(mode);
    await persistPayload(announcement.items || [], cleanMode, author);
  };

  const removeAnnouncement = async (id: string, author: string) => {
    const nextItems = (announcement.items || []).filter((it) => it.id !== id);
    await persistPayload(nextItems, announcement.displayMode || 'rotativo', author);
  };

  const clearAllAnnouncements = async (author: string) => {
    await persistPayload([], announcement.displayMode || 'rotativo', author);
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
    setDisplayMode,
    removeAnnouncement,
    clearAllAnnouncements,
    saveAnnouncement,
    isSaving,
  };
}
