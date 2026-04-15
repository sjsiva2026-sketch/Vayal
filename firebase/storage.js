// firebase/storage.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

export const uploadDocument = async (uid, docType, file) => {
  const r = ref(storage, `owners/${uid}/docs/${docType}`);
  await uploadBytes(r, file);
  return getDownloadURL(r);
};

export const uploadProfilePhoto = async (uid, file) => {
  const r = ref(storage, `users/${uid}/profile`);
  await uploadBytes(r, file);
  return getDownloadURL(r);
};

export const deleteFile = (path) => deleteObject(ref(storage, path));
