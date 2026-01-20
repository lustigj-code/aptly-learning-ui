import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  getDocs,
  Query,
  QueryConstraint,
  addDoc,
  DocumentData,
  DocumentSnapshot,
  QuerySnapshot,
  writeBatch,
} from 'firebase/firestore';
import { getFirestoreInstance } from './config';

/**
 * Get a single document from Firestore
 */
export async function getDocData<T extends DocumentData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = doc(db, collectionName, docId);
    const docSnapshot: DocumentSnapshot<T> = await getDoc(docRef as Parameters<typeof getDoc>[0]) as DocumentSnapshot<T>;

    if (docSnapshot.exists()) {
      return { id: docSnapshot.id, ...docSnapshot.data() } as T & { id: string };
    }
    return null;
  } catch (error) {
    console.error(
      `Error getting document ${docId} from ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Set a document in Firestore (overwrites if exists)
 */
export async function setDocData<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T,
  merge: boolean = false
): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge });
  } catch (error) {
    console.error(
      `Error setting document ${docId} in ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Update specific fields in a document
 */
export async function updateDocData<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data as DocumentData);
  } catch (error) {
    console.error(
      `Error updating document ${docId} in ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Delete a document from Firestore
 */
export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(
      `Error deleting document ${docId} from ${collectionName}:`,
      error
    );
    throw error;
  }
}

/**
 * Query documents from a collection with conditions
 */
export async function queryDocs<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const collectionRef = collection(db, collectionName);
    const q: Query<T> = query(collectionRef, ...constraints) as Query<T>;
    const querySnapshot: QuerySnapshot<T> = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (T & { id: string })[];
  } catch (error) {
    console.error(`Error querying ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Add a new document to a collection (auto-generates ID)
 */
export async function addDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, data);
    return docRef.id;
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Batch operations helper
 */
export async function batchWrite(
  operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    docId: string;
    data?: DocumentData;
  }>
): Promise<void> {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const batch = writeBatch(db);

    for (const op of operations) {
      const docRef = doc(db, op.collection, op.docId);

      switch (op.type) {
        case 'set':
          batch.set(docRef, op.data || {});
          break;
        case 'update':
          batch.update(docRef, op.data || {});
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Error during batch write:', error);
    throw error;
  }
}
