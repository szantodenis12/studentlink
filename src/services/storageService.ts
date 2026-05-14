import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads a file to Firebase Storage
 * @param file The file to upload
 * @param path The path in storage (e.g., 'courses/COURSE_ID/FILENAME')
 * @returns Object with downloadURL and fullPath
 */
export const uploadFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return {
    downloadURL,
    fullPath: snapshot.ref.fullPath
  };
};

/**
 * Deletes a file from Firebase Storage
 * @param path The full path or URL of the file to delete
 */
export const deleteFile = async (path: string) => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};
