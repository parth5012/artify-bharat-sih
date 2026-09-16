import { openDB, type IDBPDatabase } from 'idb';
import type { OfflineDraft } from '../types';

const DB_NAME = 'artifact_offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('drafts')) {
          const store = db.createObjectStore('drafts', { keyPath: 'id' });
          store.createIndex('by-synced', 'synced');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveOfflineDraft(draft: OfflineDraft): Promise<void> {
  const db = await getDB();
  await db.put('drafts', draft);
}

export async function updateOfflineDraft(id: string, updates: Partial<OfflineDraft>): Promise<void> {
  const db = await getDB();
  const draft = await db.get('drafts', id);
  if (draft) {
    await db.put('drafts', { ...draft, ...updates });
  }
}

export async function getAllOfflineDrafts(): Promise<OfflineDraft[]> {
  const db = await getDB();
  return db.getAll('drafts');
}

export async function deleteOfflineDraft(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('drafts', id);
}

export async function syncOfflineDrafts(
  onSyncSuccess?: (draft: OfflineDraft) => void
): Promise<{ syncedCount: number; remainingCount: number }> {
  const db = await getDB();
  const allDrafts: OfflineDraft[] = await db.getAll('drafts');
  const unsynced = allDrafts.filter((d) => !d.synced);

  let syncedCount = 0;
  for (const draft of unsynced) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    draft.synced = true;
    await db.put('drafts', draft);
    syncedCount++;
    if (onSyncSuccess) onSyncSuccess(draft);
  }

  const remainingList: OfflineDraft[] = await db.getAll('drafts');
  const remaining = remainingList.filter((d) => !d.synced).length;
  return { syncedCount, remainingCount: remaining };
}
