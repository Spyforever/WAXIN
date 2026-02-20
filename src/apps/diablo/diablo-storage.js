/**
 * Utility to interface with Diablo's IndexedDB storage (diablo_fs).
 * This allows syncing save games and configuration between ZenFS and the game's internal storage.
 */
export class DiabloStorage {
    constructor(dbName = 'diablo_fs') {
        this.dbName = dbName;
        this.storeName = null;
    }

    async _getDb() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // If the DB doesn't exist, create the default store used by idb-keyval/localForage
                if (!db.objectStoreNames.contains('keyvaluepairs')) {
                    db.createObjectStore('keyvaluepairs');
                }
            };
        });
    }

    async _getStoreName() {
        if (this.storeName) return this.storeName;
        const db = await this._getDb();

        // Try to find the store name. Most common for these ports is 'keyvaluepairs'.
        if (db.objectStoreNames.contains('keyvaluepairs')) {
            this.storeName = 'keyvaluepairs';
        } else if (db.objectStoreNames.length > 0) {
            this.storeName = db.objectStoreNames[0];
        } else {
            this.storeName = 'keyvaluepairs';
        }

        db.close();
        return this.storeName;
    }

    /**
     * Retrieves all files from Diablo's IndexedDB storage.
     * @returns {Promise<Map<string, Uint8Array>>} A map of filenames to their data.
     */
    async getFiles() {
        const storeName = await this._getStoreName();
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                const keysRequest = store.getAllKeys();

                transaction.oncomplete = () => {
                    const files = new Map();
                    for (let i = 0; i < keysRequest.result.length; i++) {
                        const key = keysRequest.result[i];
                        let value = request.result[i];

                        // Handle standard emscripten IDBFS metadata wrapper if present
                        if (value && typeof value === 'object' && value.contents && value.timestamp) {
                            value = value.contents;
                        }

                        // Ensure we only treat strings as keys and handle the data
                        if (typeof key === 'string') {
                            files.set(key, value);
                        }
                    }
                    db.close();
                    resolve(files);
                };
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error);
                };
            } catch (e) {
                db.close();
                reject(e);
            }
        });
    }

    /**
     * Writes multiple files to Diablo's IndexedDB storage in a single transaction.
     * @param {Map<string, Uint8Array>} filesMap Map of filenames to their data.
     */
    async setFiles(filesMap) {
        if (filesMap.size === 0) return;
        const storeName = await this._getStoreName();
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                for (const [name, data] of filesMap) {
                    // The game uses lower-case keys for filenames
                    store.put(data, name.toLowerCase());
                }
                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error);
                };
            } catch (e) {
                db.close();
                reject(e);
            }
        });
    }

    /**
     * Writes a single file to Diablo's IndexedDB storage.
     * @param {string} name Filename.
     * @param {Uint8Array} data File data.
     */
    async setFile(name, data) {
        const map = new Map();
        map.set(name, data);
        return this.setFiles(map);
    }

    /**
     * Clears all files from the storage.
     */
    async clear() {
        const storeName = await this._getStoreName();
        const db = await this._getDb();

        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(storeName, 'readwrite');
                const store = transaction.objectStore(storeName);
                store.clear();
                transaction.oncomplete = () => {
                    db.close();
                    resolve();
                };
                transaction.onerror = () => {
                    db.close();
                    reject(transaction.error);
                };
            } catch (e) {
                db.close();
                reject(e);
            }
        });
    }
}
