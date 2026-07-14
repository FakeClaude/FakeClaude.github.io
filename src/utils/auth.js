import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase.js";

const auth = getAuth(app);

let currentUser = null;
let authInitPromise = null;

export function initAuth() {
  if (authInitPromise) return authInitPromise;
  authInitPromise = new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (user) {
        currentUser = user;
        resolve(user);
      } else {
        try {
          const result = await signInAnonymously(auth);
          currentUser = result.user;
          resolve(result.user);
        } catch (err) {
          console.error("匿名登录失败:", err);
          resolve(null);
        }
      }
    });
  });
  return authInitPromise;
}

// 获取当前 uid，供其他模块使用
export function getCurrentUser() {
  return currentUser;
}

export { auth };