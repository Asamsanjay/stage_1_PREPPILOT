/**
 * IndexedDB Storage Engine for PrepPilot Speaking Challenge Recordings
 *
 * Architecture Rule:
 * Video & audio recording blobs are strictly stored on the client device
 * in IndexedDB. Video blobs or base64 data are NEVER uploaded to Supabase
 * or stored in localStorage/sessionStorage.
 */

const DB_NAME = 'preppilot_recordings_db';
const DB_VERSION = 1;
const STORE_NAME = 'recordings';

/**
 * Open or initialize the IndexedDB instance.
 * @returns {Promise<IDBDatabase>}
 */
export function openRecordingsDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Failed to open recordings database:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save a recorded video Blob into IndexedDB.
 * @param {Object} recording
 * @param {string} recording.id - unique local_recording_id
 * @param {Blob} recording.blob - actual video/audio Blob
 * @param {string} [recording.mimeType] - MIME type string (e.g. video/webm)
 * @param {number} [recording.duration] - duration in seconds
 * @param {string} [recording.topic]
 * @param {string} [recording.difficulty]
 * @param {string} [recording.createdAt]
 * @returns {Promise<{ id: string, size: number }>}
 */
export async function saveLocalRecording({
  id,
  blob,
  mimeType = 'video/webm',
  duration = 0,
  topic = '',
  difficulty = '',
  createdAt = new Date().toISOString()
}) {
  if (!id) {
    throw new Error('A valid local_recording_id is required to save recording.');
  }
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('A valid Blob instance is required to save recording.');
  }

  const db = await openRecordingsDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record = {
        id,
        blob,
        mimeType: mimeType || blob.type || 'video/webm',
        duration,
        topic,
        difficulty,
        createdAt,
        size: blob.size
      };

      const request = store.put(record);

      request.onsuccess = () => {
        resolve({ id, size: blob.size });
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error saving recording:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    } catch (err) {
      console.error('[IndexedDB] Transaction exception in saveLocalRecording:', err);
      reject(err);
    }
  });
}

/**
 * Retrieve a recording record by its local_recording_id.
 * @param {string} id
 * @returns {Promise<{ id: string, blob: Blob, mimeType: string, duration: number, topic: string, difficulty: string, createdAt: string } | null>}
 */
export async function getLocalRecording(id) {
  if (!id) return null;

  try {
    const db = await openRecordingsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = (event) => {
        const result = event.target.result;
        resolve(result || null);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error fetching recording:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.error('[IndexedDB] Exception in getLocalRecording:', err);
    return null;
  }
}

/**
 * Check whether a local recording blob exists in IndexedDB for the given ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function hasLocalRecording(id) {
  if (!id) return false;

  try {
    const db = await openRecordingsDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count(id);

      request.onsuccess = (event) => {
        resolve(event.target.result > 0);
      };

      request.onerror = () => {
        resolve(false);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    return false;
  }
}

/**
 * Get all local recording IDs currently stored in IndexedDB on this browser.
 * @returns {Promise<string[]>}
 */
export async function getAllLocalRecordingIds() {
  try {
    const db = await openRecordingsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error reading recording IDs:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.error('[IndexedDB] Exception in getAllLocalRecordingIds:', err);
    return [];
  }
}

/**
 * Delete a local recording blob from IndexedDB.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteLocalRecording(id) {
  if (!id) return false;

  try {
    const db = await openRecordingsDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error deleting recording:', event.target.error);
        reject(event.target.error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (err) {
    console.error('[IndexedDB] Exception in deleteLocalRecording:', err);
    return false;
  }
}
