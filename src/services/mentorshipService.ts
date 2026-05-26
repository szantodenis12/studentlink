import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  onSnapshot,
  updateDoc
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
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
}

export interface Review {
  id: string;
  mentorId: string;
  studentId: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export const getMentors = async (subject?: string) => {
  let q = query(
    collection(db, "users"), 
    where("role", "==", "professor"),
    where("isMentor", "==", true)
  );
  
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

export const getStudentBookings = (studentId: string, callback: (bookings: Booking[]) => void) => {
  const q = query(collection(db, "bookings"), where("studentId", "==", studentId));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateTime: data.dateTime?.toDate?.() || new Date(data.dateTime)
      } as Booking;
    });
    callback(bookings);
  });
};

export const getProfessorBookings = (professorId: string, callback: (bookings: Booking[]) => void) => {
  const q = query(collection(db, "bookings"), where("mentorId", "==", professorId));
  return onSnapshot(q, (snapshot) => {
    const bookings = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dateTime: data.dateTime?.toDate?.() || new Date(data.dateTime)
      } as Booking;
    });
    callback(bookings);
  });
};

export const updateBookingStatus = async (bookingId: string, status: 'pending' | 'confirmed' | 'rejected' | 'completed') => {
  return updateDoc(doc(db, "bookings", bookingId), {
    status
  });
};

export const updateBookingDateTime = async (bookingId: string, dateTime: Date) => {
  return updateDoc(doc(db, "bookings", bookingId), {
    dateTime
  });
};

// Get reviews for a specific mentor
export const getMentorReviews = (mentorId: string, callback: (reviews: Review[]) => void) => {
  const qSafe = query(collection(db, "reviews"), where("mentorId", "==", mentorId));
  return onSnapshot(qSafe, (snapshot) => {
    const reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
    reviews.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
    callback(reviews);
  });
};

// Create a review for a mentor
export const addMentorReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, "reviews"), {
    ...review,
    createdAt: serverTimestamp()
  });
  
  // Recalculate average rating
  const snapshot = await getDocs(query(collection(db, "reviews"), where("mentorId", "==", review.mentorId)));
  const reviews = snapshot.docs.map(doc => doc.data() as Review);
  
  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : "5.0";
  
  await updateDoc(doc(db, "users", review.mentorId), {
    rating: parseFloat(averageRating)
  });
  
  return docRef;
};

export const updateMentorProfile = async (
  userId: string,
  isMentor: boolean,
  subjects: string[],
  price: number,
  bio: string
) => {
  return updateDoc(doc(db, "users", userId), {
    isMentor,
    mentorshipSubjects: subjects,
    mentorshipPrice: price,
    bio
  });
};
