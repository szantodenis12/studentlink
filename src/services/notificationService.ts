import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  addDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: 'assignment' | 'grade' | 'message' | 'system';
  read: boolean;
  createdAt: any;
  link?: string;
}

export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
    callback(notifications);
  });
};

export const markAsRead = async (notificationId: string) => {
  return updateDoc(doc(db, "notifications", notificationId), {
    read: true
  });
};

export const markAllAsRead = async (notifications: Notification[]) => {
  const promises = notifications
    .filter(n => !n.read)
    .map(n => markAsRead(n.id));
  return Promise.all(promises);
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
  return addDoc(collection(db, "notifications"), {
    ...notification,
    read: false,
    createdAt: serverTimestamp()
  });
};

export const deleteNotification = async (notificationId: string) => {
  return deleteDoc(doc(db, "notifications", notificationId));
};
