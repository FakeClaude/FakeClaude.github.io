import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB_FhE80KonoJxLpmFRMlM5POkiiYfgDlM",
  authDomain: "possmap.firebaseapp.com",
  projectId: "possmap",
  storageBucket: "possmap.firebasestorage.app",
  messagingSenderId: "260871464402",
  appId: "1:260871464402:web:086ff7022f4ba7e65ad40b",
  measurementId: "G-HTEZVQV1ZV"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { logEvent };