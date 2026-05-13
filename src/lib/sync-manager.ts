import { 
  getSyncQueue, 
  updateSyncItem, 
  deleteSyncItem, 
  addSyncLog, 
  SyncItem 
} from './db.js';
import { apiFetch } from './api.js';

const MAX_RETRY_ATTEMPTS = 5;

export class SyncManager {
  private static isSyncing = false;
  private static syncListeners: ((status: { pending: number; syncing: boolean; lastError?: string }) => void)[] = [];

  static subscribe(callback: (status: { pending: number; syncing: boolean; lastError?: string }) => void) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== callback);
    };
  }

  private static notify(pending: number, syncing: boolean, lastError?: string) {
    this.syncListeners.forEach(l => l({ pending, syncing, lastError }));
  }

  static async triggerSync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    const queue = await getSyncQueue();
    this.notify(queue.length, true);

    if (queue.length === 0) {
      this.isSyncing = false;
      this.notify(0, false);
      return;
    }

    console.log(`[SyncManager] Starting sync for ${queue.length} items`);
    
    for (const item of queue) {
      if (item.status === 'SYNCING') continue; // Skip if already being processed

      try {
        await this.processItem(item);
      } catch (err) {
        console.error(`[SyncManager] Failed to process item ${item.id}`, err);
      }
    }

    const remainingQueue = await getSyncQueue();
    this.isSyncing = false;
    this.notify(remainingQueue.length, false);
  }

  private static async processItem(item: SyncItem) {
    item.status = 'SYNCING';
    await updateSyncItem(item);

    let endpoint = '';
    if (item.type === 'LOCATION') endpoint = '/api/security/patrol/scan-qr';
    else if (item.type === 'REPORT') endpoint = '/api/security/patrol/complete';
    else if (item.type === 'INCIDENT') endpoint = '/api/security/incidents';

    const payload = { ...item.data, _signature: item.signature, _timestamp: item.timestamp };

    // Handle offline photos: Detect Base64 and upload before processing report
    if (item.type === 'REPORT' && Array.isArray(payload.checkItemsData)) {
      for (const checkItem of payload.checkItemsData) {
        if (checkItem.type === 'photo' && typeof checkItem.value === 'string' && checkItem.value.startsWith('data:image')) {
          try {
            const formData = new FormData();
            const blob = await (await fetch(checkItem.value)).blob();
            formData.append('photo', blob, `offline_photo_${Date.now()}.jpg`);
            formData.append('type', 'PATROL');

            const uploadResult = await apiFetch('/api/tenant/patrol/upload-photo', {
              method: 'POST',
              body: formData
            });

            if (uploadResult.url) {
              checkItem.value = uploadResult.url; // Replace Base64 with real URL
            }
          } catch (uploadErr) {
            console.error("[SyncManager] Failed to upload offline photo", uploadErr);
            // We'll keep retrying the whole item on next sync
            throw new Error(`Kế hoạch đồng bộ ảnh thất bại: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`);
          }
        }
      }
    }

    try {
      await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await deleteSyncItem(item.id!);
      await addSyncLog({
          timestamp: Date.now(),
          type: item.type,
          status: 'SUCCESS',
          message: `Successfully synced ${item.type} for tenant ${item.tenantId}`
      });
    } catch (err: any) {
      item.retryCount++;
      item.lastError = err.message;
      
      if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
        item.status = 'FAILED';
        await addSyncLog({
          timestamp: Date.now(),
          type: item.type,
          status: 'FAILURE',
          message: `Max retries reached for ${item.type}`,
          details: { error: err.message, retryCount: item.retryCount }
        });
      } else {
        item.status = 'PENDING';
      }
      
      await updateSyncItem(item);
      throw err;
    }
  }

  static async getPendingCount(): Promise<number> {
    const queue = await getSyncQueue();
    return queue.length;
  }
}
