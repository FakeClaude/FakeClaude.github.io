const DB_NAME = "AppDatabase";
const DB_VERSION = 1;
const STORE_NAME = "create";
const STORE_PROPOSITIONS = "propositions";

/**
 * 初始化 IndexedDB 数据库并创建对象仓库
 */
export function initDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {keyPath: "key"});
            }
            if (!db.objectStoreNames.contains(STORE_PROPOSITIONS)) {
                db.createObjectStore(STORE_PROPOSITIONS, {keyPath: "key"});
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * 存储数据
 * @param {string} key
 * @param {any} value
 */
export async function setDBItem(key, value) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * 读取数据
 * @param {string} key
 * @returns {Promise<any>}
 */
export async function getDBItem(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
        request.onerror = (e) => reject(e.target.error);
    });
}

export async function setPropositionsCache(data, sortBy = "best") {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PROPOSITIONS, "readwrite");
    const store = transaction.objectStore(STORE_PROPOSITIONS);
    const request = store.put({ key: `home_${sortBy}`, value: data });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getPropositionsCache(sortBy = "best") {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PROPOSITIONS, "readonly");
    const store = transaction.objectStore(STORE_PROPOSITIONS);
    const request = store.get(`home_${sortBy}`);
    request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : null);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getFollowingCache() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PROPOSITIONS, "readonly");
    const store = transaction.objectStore(STORE_PROPOSITIONS);
    const request = store.get("home_following");
    request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : []);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function setFollowingCache(list) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PROPOSITIONS, "readwrite");
    const store = transaction.objectStore(STORE_PROPOSITIONS);
    const request = store.put({ key: "home_following", value: list });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function addToFollowing(item) {
  const list = await getFollowingCache();
  const exists = list.some(p => p.id === item.id);
  if (exists) return;
  const newList = [{ ...item, followedAt: Date.now() }, ...list];
  followingMemory = newList;
  await setFollowingCache(newList);
}

export async function removeFromFollowing(itemId) {
  const list = await getFollowingCache();
  const newList = list.filter(p => p.id !== itemId);
  followingMemory = newList;
  await setFollowingCache(newList);
}

export async function isFollowingItem(itemId) {
  const list = await getFollowingCache();
  return list.some(p => p.id === itemId);
}

// 模块级内存缓存，存 home_following 列表
let followingMemory = [];

export async function loadFollowingToMemory() {
  const list = await getFollowingCache();
  followingMemory = list || [];
}

export function isFollowingItemSync(itemId) {
  return followingMemory.some(p => p.id === itemId);
}

export function updateFollowingMemory(list) {
  followingMemory = list || [];
}

export async function getLastSyncAt(sortBy = "best") {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROPOSITIONS, "readonly");
      const store = transaction.objectStore(STORE_PROPOSITIONS);
      const request = store.get(`lastSyncAt_${sortBy}`);
      request.onsuccess = (e) => resolve(e.target.result ? e.target.result.value : 0);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch {
    return 0;
  }
}

export async function setLastSyncAt(sortBy = "best", ts) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_PROPOSITIONS, "readwrite");
    const store = transaction.objectStore(STORE_PROPOSITIONS);
    const request = store.put({ key: `lastSyncAt_${sortBy}`, value: ts });
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
}