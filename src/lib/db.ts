import { openDB } from 'idb';

const DB_NAME = 'scmd_patrol_db';
const VERSION = 4;
const STORES = {
  PENDING_LOCATIONS: 'pending_locations',
  PENDING_REPORTS: 'pending_reports',
  SYNC_QUEUE: 'sync_queue',
  SYNC_LOGS: 'sync_logs'
};

export interface SyncItem {
  id?: number;
  type: 'LOCATION' | 'REPORT' | 'INCIDENT';
  tenantId: string;
  data: any;
  timestamp: number;
  signature: string;
  retryCount: number;
  lastError?: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
}

export interface SyncLog {
  id?: number;
  timestamp: number;
  type: string;
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  details?: any;
}

export async function initDB() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(STORES.PENDING_LOCATIONS)) {
          db.createObjectStore(STORES.PENDING_LOCATIONS, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.PENDING_REPORTS)) {
          db.createObjectStore(STORES.PENDING_REPORTS, { keyPath: 'id', autoIncrement: true });
        }
      }
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_LOGS)) {
          db.createObjectStore(STORES.SYNC_LOGS, { keyPath: 'id', autoIncrement: true });
        }
      }
    },
  });
}

export async function addToSyncQueue(item: Omit<SyncItem, 'id'>) {
  const db = await initDB();
  return db.add(STORES.SYNC_QUEUE, item);
}

export async function getSyncQueue(): Promise<SyncItem[]> {
  const db = await initDB();
  return db.getAll(STORES.SYNC_QUEUE);
}

export async function updateSyncItem(item: SyncItem) {
  const db = await initDB();
  return db.put(STORES.SYNC_QUEUE, item);
}

export async function deleteSyncItem(id: number) {
  const db = await initDB();
  return db.delete(STORES.SYNC_QUEUE, id);
}

export async function addSyncLog(log: Omit<SyncLog, 'id'>) {
  const db = await initDB();
  return db.add(STORES.SYNC_LOGS, log);
}

export async function getSyncLogs(limit = 50): Promise<SyncLog[]> {
  const db = await initDB();
  const logs = await db.getAll(STORES.SYNC_LOGS);
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function clearSyncQueue() {
  const db = await initDB();
  await db.clear(STORES.PENDING_LOCATIONS);
  await db.clear(STORES.PENDING_REPORTS);
}
