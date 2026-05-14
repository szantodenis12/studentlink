import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "../hooks/useAuth";

export interface Booking {
  id: string;
  mentorId: string;
  mentorName: string;
  studentId: string;
  studentName: string;
  subject: string;
  dateTime: Date;
  price: number;
  status: 'pending' | 'confirmed' | 'completed';
}

export const getMentors = async (subject?: string) => {
  let q = query(collection(db, "users"), where("role", "==", "professor"));
  
  const snapshot = await getDocs(q);
  const mentors = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
  
  if (subject) {
    return mentors.filter(m => m.mentorshipSubjects?.some(s => s.toLowerCase().includes(subject.toLowerCase())));
  }
  
  return mentors;
};

export const bookSession = async (booking: Omit<Booking, 'id' | 'status'>) => {
  return addDoc(collection(db, "bookings"), {
    ...booking,
    status: 'pending',
    createdAt: serverTimestamp()
  });
};
