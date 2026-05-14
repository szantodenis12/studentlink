import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db } from "./firebase";

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  content: string;
  attachments?: { name: string; url: string }[];
  createdAt: any;
}

export interface Meeting {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  type: 'online' | 'physical';
  location: string;
  dateTime: Date;
  description: string;
  participants: string[]; // List of user IDs
}

// Posts
export const createPost = async (post: Omit<Post, 'id' | 'createdAt'>) => {
  return addDoc(collection(db, "posts"), {
    ...post,
    createdAt: serverTimestamp()
  });
};

export const getPosts = (callback: (posts: Post[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
  });
};

// Meetings
export const createMeeting = async (meeting: Omit<Meeting, 'id' | 'participants'>) => {
  return addDoc(collection(db, "meetings"), {
    ...meeting,
    participants: [meeting.creatorId],
    createdAt: serverTimestamp()
  });
};

export const getMeetings = (callback: (meetings: Meeting[]) => void) => {
  const q = query(collection(db, "meetings"), orderBy("dateTime", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      dateTime: doc.data().dateTime.toDate()
    } as any)));
  });
};

export const joinMeeting = async (meetingId: string, userId: string) => {
  return updateDoc(doc(db, "meetings", meetingId), {
    participants: arrayUnion(userId)
  });
};

export const leaveMeeting = async (meetingId: string, userId: string) => {
  return updateDoc(doc(db, "meetings", meetingId), {
    participants: arrayRemove(userId)
  });
};
