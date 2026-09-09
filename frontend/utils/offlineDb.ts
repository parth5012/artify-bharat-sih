/**
 * Artify Bharat - Offline Client Cache (IndexedDB) Utility
 * Manages local offline storage for unsubmitted artisanal product drafts
 * in `artify_offline_db` when rural network connectivity drops.
 * Features in-memory fallback for private browsing / quota constraints.
 * Zero external libraries / Native window.indexedDB.
 */

export interface ProductListingDraft {
  id: string; // Unique local draft ID (e.g., "draft_1725883200000_a8f9")
  title: string;
  description: string;
  craftCategory: string;
  rawMaterialCost: number;
  laborHours: number;
  stateCode: string;
  isGiTagged: boolean;
  calculatedPrice?: number;
  voiceTranscript?: string;
  audioBlobBase64?: string;
  imageBlobBase64?: string;
  provenanceCoordinates?: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    timestamp: string;
    formattedCoordinates: string;
  };
  syncStatus: 'pending' | 'synced' | 'failed';
  createdAt: string;
  updatedAt: string;
  serverProductId?: string;
}

const DB_NAME = 'artify_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'listing_drafts';

// In-Memory Fallback Cache for environments where IndexedDB is blocked
const memoryDraftsStore: Map<string, ProductListingDraft> = new Map();

function closeDb(db: IDBDatabase | null): void {
  if (!db) return;
  try {
    db.close();
  } catch {}
}

/**
 * Opens or upgrades the IndexedDB database instance.
 */
export function openArtifyDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db: IDBDatabase = (event.target as any)?.result || request.result;
        if (db && !db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn(`[ArtifyDB] IndexedDB open error, falling back to in-memory store:`, request.error);
        resolve(null);
      };
    } catch (e) {
      console.warn(`[ArtifyDB] IndexedDB initialization blocked:`, e);
      resolve(null);
    }
  });
}

/**
 * Saves or updates a product draft in local IndexedDB storage.
 * Resolves only from tx.oncomplete after transaction commits.
 */
export async function saveDraftLocally(
  draft: Omit<ProductListingDraft, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> & {
    id?: string;
    syncStatus?: 'pending' | 'synced' | 'failed';
  }
): Promise<ProductListingDraft> {
  const now = new Date().toISOString();
  const draftId = draft.id || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const record: ProductListingDraft = {
    ...draft,
    id: draftId,
    syncStatus: draft.syncStatus || 'pending',
    createdAt: (draft as any).createdAt || now,
    updatedAt: now,
  };

  const db = await openArtifyDB();
  if (!db) {
    memoryDraftsStore.set(draftId, record);
    return record;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(record);

      tx.oncomplete = () => {
        closeDb(db);
        resolve(record);
      };

      tx.onerror = () => {
        closeDb(db);
        memoryDraftsStore.set(draftId, record);
        resolve(record);
      };

      tx.onabort = () => {
        closeDb(db);
        memoryDraftsStore.set(draftId, record);
        resolve(record);
      };
    } catch {
      closeDb(db);
      memoryDraftsStore.set(draftId, record);
      resolve(record);
    }
  });
}

/**
 * Retrieves all stored listing drafts, ordered by most recently updated.
 */
export async function getAllLocalDrafts(): Promise<ProductListingDraft[]> {
  const db = await openArtifyDB();
  if (!db) {
    const list = Array.from(memoryDraftsStore.values());
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  }

  return new Promise((resolve) => {
    let resultList: ProductListingDraft[] | null = null;
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.getAll();

      getRequest.onsuccess = () => {
        const results: ProductListingDraft[] = getRequest.result || [];
        // Merge with any in-memory items
        for (const [id, item] of memoryDraftsStore.entries()) {
          if (!results.some((r) => r.id === id)) {
            results.push(item);
          }
        }
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resultList = results;
      };

      getRequest.onerror = () => {
        const list = Array.from(memoryDraftsStore.values());
        resultList = list;
      };

      tx.oncomplete = () => {
        closeDb(db);
        if (resultList !== null) {
          resolve(resultList);
        } else {
          const list = Array.from(memoryDraftsStore.values());
          list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(list);
        }
      };

      tx.onerror = () => {
        closeDb(db);
        const list = Array.from(memoryDraftsStore.values());
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(list);
      };

      tx.onabort = () => {
        closeDb(db);
        const list = Array.from(memoryDraftsStore.values());
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(list);
      };
    } catch {
      closeDb(db);
      const list = Array.from(memoryDraftsStore.values());
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(list);
    }
  });
}

/**
 * Retrieves a single draft by ID.
 */
export async function getDraftById(id: string): Promise<ProductListingDraft | null> {
  const db = await openArtifyDB();
  if (!db) {
    return memoryDraftsStore.get(id) || null;
  }

  return new Promise((resolve) => {
    let foundDraft: ProductListingDraft | null = null;
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        foundDraft = getRequest.result || memoryDraftsStore.get(id) || null;
      };

      getRequest.onerror = () => {
        foundDraft = memoryDraftsStore.get(id) || null;
      };

      tx.oncomplete = () => {
        closeDb(db);
        resolve(foundDraft ?? (memoryDraftsStore.get(id) || null));
      };

      tx.onerror = () => {
        closeDb(db);
        resolve(memoryDraftsStore.get(id) || null);
      };

      tx.onabort = () => {
        closeDb(db);
        resolve(memoryDraftsStore.get(id) || null);
      };
    } catch {
      closeDb(db);
      resolve(memoryDraftsStore.get(id) || null);
    }
  });
}

/**
 * Deletes a draft from IndexedDB by ID.
 */
export async function deleteLocalDraft(id: string): Promise<boolean> {
  memoryDraftsStore.delete(id);
  const db = await openArtifyDB();
  if (!db) return true;

  return new Promise((resolve) => {
    let isSuccess = false;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delRequest = store.delete(id);

      delRequest.onsuccess = () => {
        isSuccess = true;
      };

      delRequest.onerror = () => {
        isSuccess = false;
      };

      tx.oncomplete = () => {
        closeDb(db);
        resolve(isSuccess);
      };

      tx.onerror = () => {
        closeDb(db);
        resolve(false);
      };

      tx.onabort = () => {
        closeDb(db);
        resolve(false);
      };
    } catch {
      closeDb(db);
      resolve(false);
    }
  });
}

/**
 * Marks a local draft as synced with the backend server.
 */
export async function markDraftAsSynced(id: string, serverProductId: string): Promise<void> {
  const draft = await getDraftById(id);
  if (!draft) return;

  draft.syncStatus = 'synced';
  draft.serverProductId = serverProductId;
  draft.updatedAt = new Date().toISOString();

  await saveDraftLocally(draft);
}

/**
 * Clears all drafts that have already been synced.
 */
export async function clearSyncedDrafts(): Promise<number> {
  const allDrafts = await getAllLocalDrafts();
  const synced = allDrafts.filter((d) => d.syncStatus === 'synced');

  for (const draft of synced) {
    await deleteLocalDraft(draft.id);
  }

  return synced.length;
}
