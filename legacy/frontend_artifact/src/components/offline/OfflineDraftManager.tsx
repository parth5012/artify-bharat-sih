import React, { useState, useEffect } from 'react';
import { HardDrive, RefreshCw, CloudOff, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { getAllOfflineDrafts, syncOfflineDrafts, deleteOfflineDraft } from '../../services/db';
import type { OfflineDraft } from '../../types';

export const OfflineDraftManager: React.FC = () => {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const loadDrafts = async () => {
    try {
      const stored = await getAllOfflineDrafts();
      setDrafts(stored);
    } catch (err) {
      console.error('Failed to load IndexedDB drafts:', err);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Syncing drafts to Artifact backend...');
    try {
      const result = await syncOfflineDrafts();
      setSyncStatusMsg(`Successfully synced ${result.syncedCount} draft(s) to Artifact cloud!`);
      await loadDrafts();
    } catch (err) {
      setSyncStatusMsg('Sync failed. Will retry automatically when network returns.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteOfflineDraft(id);
    await loadDrafts();
  };

  const unsyncedCount = drafts.filter((d) => !d.synced).length;

  return (
    <Card className="max-w-2xl mx-auto border-terracotta-200 shadow-warm">
      <div className="flex items-center justify-between border-b border-terracotta-200 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-terracotta-500" />
          <div>
            <h3 className="text-lg font-bold font-heading text-charcoal-800">
              Offline Draft Storage (IndexedDB)
            </h3>
            <p className="text-xs text-charcoal-700">
              Database: <code className="font-mono bg-cream-200 px-1 py-0.5 rounded">artifact_offline</code>
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />}
          isLoading={isSyncing}
          disabled={unsyncedCount === 0}
          onClick={handleSyncAll}
        >
          Sync Now ({unsyncedCount})
        </Button>
      </div>

      {syncStatusMsg && (
        <div className="mb-4 p-3 bg-terracotta-50 border border-terracotta-200 rounded-xl text-xs text-terracotta-900 font-medium">
          {syncStatusMsg}
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="p-8 text-center bg-cream-100 rounded-2xl border border-dashed border-terracotta-200 text-charcoal-700 text-xs">
          <CloudOff className="w-8 h-8 text-terracotta-400 mx-auto mb-2" />
          <p className="font-semibold text-charcoal-800 text-sm">No Offline Drafts Pending</p>
          <p className="mt-1 text-charcoal-700">All craft captures and voice recordings are synchronized with Artifact cloud.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="p-4 bg-cream-100 rounded-2xl border border-terracotta-200/80 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                {draft.wipPhotoDataUrl ? (
                  <img
                    src={draft.wipPhotoDataUrl}
                    alt={draft.title}
                    className="w-12 h-12 object-cover rounded-xl border border-terracotta-200"
                  />
                ) : (
                  <div className="w-12 h-12 bg-terracotta-100 text-terracotta-600 rounded-xl flex items-center justify-center font-bold text-xs">
                    Draft
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-bold text-charcoal-800">{draft.title}</h4>
                  <p className="text-xs text-charcoal-700">
                    {draft.craftType} • {new Date(draft.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase border ${
                    draft.synced
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {draft.synced ? 'Synced' : 'Saved Locally'}
                </span>

                <button
                  onClick={() => handleDelete(draft.id)}
                  className="p-1.5 text-charcoal-700 hover:text-red-600 hover:bg-cream-200 rounded-lg"
                  aria-label="Delete draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
