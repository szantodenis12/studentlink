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
  type: 'assignment' | 'grade' | 'message' | 'system' | 'booking_request' | 'booking_response';
  read: boolean;
  createdAt: any;
  link?: string;
  bookingId?: string;
}

export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));

    notifications.sort((a, b) => {
      const getTime = (val: any) => {
        if (!val) return 0;
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        if (typeof val.getTime === 'function') return val.getTime();
        if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return new Date(val).getTime();
        return 0;
      };
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    callback(notifications);
  }, (error) => {
    console.error("Error in getNotifications:", error);
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
