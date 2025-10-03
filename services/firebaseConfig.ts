// services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDyFImY0QArFvFEhoS2ZIQ0d_zdKB82Zsw",
  authDomain: "ticket-snipper-a02e4.firebaseapp.com",
  projectId: "ticket-snipper-a02e4",
  storageBucket: "ticket-snipper-a02e4.firebasestorage.app",
  messagingSenderId: "553385463777",
  appId: "1:553385463777:android:9a7ec66174ddaba624cca0",
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: inMemoryPersistence,
});

const db = getFirestore(app);

export { auth, db };
export default app;