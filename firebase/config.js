import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth }        from 'firebase/auth';
import { getFirestore }                   from 'firebase/firestore';
import { getStorage }                     from 'firebase/storage';

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAuLdDFLj56oSwkD7EtemKzHfCDklRJMN4',
  authDomain:        'vayal-33b12.firebaseapp.com',
  projectId:         'vayal-33b12',
  storageBucket:     'vayal-33b12.firebasestorage.app',
  messagingSenderId: '881016543795',
  appId:             '1:881016543795:android:d567faf49f9def975de146',
};

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();

let _auth = null;
export const getFirebaseAuth = () => {
  if (_auth) return _auth;
  try {
    _auth = initializeAuth(app);
  } catch {
    _auth = getAuth(app);
  }
  return _auth;
};

export const db      = getFirestore(app);
export const storage = getStorage(app);
export default app;
