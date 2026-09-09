'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  saveDraftLocally,
  getAllLocalDrafts,
  deleteLocalDraft,
  markDraftAsSynced,
  clearSyncedDrafts,
  ProductListingDraft,
} from '../utils/offlineDb';

export function useOfflineDrafts(
  onSyncCallback?: (draft: ProductListingDraft) => Promise<{ serverProductId: string }>
) {
  const [drafts, setDrafts] = useState<ProductListingDraft[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDrafts = useCallback(async () => {
    try {
      const stored = await getAllLocalDrafts();
      setDrafts(stored);
    } catch (err: any) {
      console.warn('Failed to load offline drafts:', err);
    }
  }, []);

  const saveDraft = useCallback(
    async (
      draftData: Omit<ProductListingDraft, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> & {
        id?: string;
      }
    ) => {
      try {
        const saved = await saveDraftLocally(draftData);
        await refreshDrafts();
        return saved;
      } catch (err: any) {
        setError(err.message || 'Failed to save draft locally.');
        throw err;
      }
    },
    [refreshDrafts]
  );

  const deleteDraft = useCallback(
    async (id: string) => {
      try {
        await deleteLocalDraft(id);
        await refreshDrafts();
      } catch (err: any) {
        setError(err.message || 'Failed to delete draft.');
      }
    },
    [refreshDrafts]
  );

  const syncPendingDrafts = useCallback(async () => {
    if (!isOnline || isSyncing || !onSyncCallback) return;

    const allDrafts = await getAllLocalDrafts();
    const pending = allDrafts.filter((d) => d.syncStatus === 'pending');
    if (pending.length === 0) return;

    setIsSyncing(true);
    setError(null);

    for (const draft of pending) {
      try {
        const result = await onSyncCallback(draft);
        await markDraftAsSynced(draft.id, result.serverProductId);
      } catch (syncErr: any) {
        console.error(`Failed to sync draft ${draft.id}:`, syncErr);
      }
    }

    setIsSyncing(false);
    await refreshDrafts();
  }, [isOnline, isSyncing, onSyncCallback, refreshDrafts]);

  // Listen to browser online/offline events + 60s periodic polling fallback
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingDrafts();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Service Worker Background Sync registration
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then((registration: any) => {
          if (registration.sync) {
            return registration.sync.register('sync-artisan-drafts');
          }
        })
        .catch((err) => {
          console.warn('[Sync] Background sync registration failed, falling back to 60s periodic polling:', err);
        });
    }

    // Fallback Strategy: Periodic polling check every 60 seconds
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        syncPendingDrafts();
      }
    }, 60000);

    refreshDrafts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [refreshDrafts, syncPendingDrafts]);

  const pendingCount = drafts.filter((d) => d.syncStatus === 'pending').length;

  return {
    drafts,
    isOnline,
    isSyncing,
    pendingCount,
    error,
    saveDraft,
    deleteDraft,
    syncPendingDrafts,
    refreshDrafts,
    clearSynced: clearSyncedDrafts,
  };
}
