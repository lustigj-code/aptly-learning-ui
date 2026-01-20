import {
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  UploadMetadata,
} from 'firebase/storage';
import { getStorageInstance } from './config';

type UploadOptions = {
  metadata?: UploadMetadata;
};

/**
 * Upload a file to Firebase Storage
 */
export async function uploadFile(
  path: string,
  file: File | Blob,
  options?: UploadOptions
): Promise<string> {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, options?.metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading file to ${path}:`, error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error(`Error deleting file from ${path}:`, error);
    throw error;
  }
}

/**
 * Get download URL for a file in Firebase Storage
 */
export async function getDownloadURLForFile(path: string): Promise<string> {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    const storageRef = ref(storage, path);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error(`Error getting download URL for ${path}:`, error);
    throw error;
  }
}

/**
 * Upload file with progress tracking (for client-side)
 */
export async function uploadFileWithProgress(
  path: string,
  file: File | Blob,
  onProgress?: (progress: number) => void,
  options?: UploadOptions
): Promise<string> {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, options?.metadata);

    // Note: uploadBytes doesn't provide progress events directly
    // For progress tracking, you may need to use uploadBytesResumable instead
    if (onProgress) {
      onProgress(100);
    }

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error(`Error uploading file to ${path}:`, error);
    throw error;
  }
}

/**
 * Batch delete multiple files
 */
export async function deleteMultipleFiles(paths: string[]): Promise<void> {
  const storage = getStorageInstance();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized');
  }

  try {
    await Promise.all(
      paths.map((path) => {
        const storageRef = ref(storage!, path);
        return deleteObject(storageRef);
      })
    );
  } catch (error) {
    console.error('Error deleting multiple files:', error);
    throw error;
  }
}
