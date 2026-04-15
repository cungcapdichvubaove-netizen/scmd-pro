import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'scmd_patrol_db';
const VERSION = 3;
const STORES = {
  PENDING_LOCATIONS: 'pending_locations',
  PENDING_REPORTS: 'pending_reports'
};

export interface PendingLocation {
  id?: number;
  tenantId: string;
  checkpointId: string;
  payload: any;
  timestamp: number;
}

export interface PendingReport {
  id?: number;
  tenantId: string;
  checkpointId: string;
  reportData: any;
  timestamp: number;
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
    },
  });
}

export async function savePendingLocation(item: Omit<PendingLocation, 'id'>) {
  const db = await initDB();
  return db.add(STORES.PENDING_LOCATIONS, item);
}

export async function savePendingReport(item: Omit<PendingReport, 'id'>) {
  const db = await initDB();
  return db.add(STORES.PENDING_REPORTS, item);
}

export async function getPendingLocations(): Promise<PendingLocation[]> {
  const db = await initDB();
  return db.getAll(STORES.PENDING_LOCATIONS);
}

export async function getPendingReports(): Promise<PendingReport[]> {
  const db = await initDB();
  return db.getAll(STORES.PENDING_REPORTS);
}

export async function deletePendingLocation(id: number) {
  const db = await initDB();
  return db.delete(STORES.PENDING_LOCATIONS, id);
}

export async function deletePendingReport(id: number) {
  const db = await initDB();
  return db.delete(STORES.PENDING_REPORTS, id);
}

export async function clearSyncQueue() {
  const db = await initDB();
  await db.clear(STORES.PENDING_LOCATIONS);
  await db.clear(STORES.PENDING_REPORTS);
}
