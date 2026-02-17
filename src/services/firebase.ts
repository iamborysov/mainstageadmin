// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from 'firebase/auth';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Collection references
export const bookingsCollection = collection(db, 'bookings');

// Types
import type { PaymentType, MixedPayment, RoomBooking } from '@/types';

export interface FirebaseBooking {
  id?: string;
  bandName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  roomBookings?: RoomBooking[];
  isResident: boolean;
  equipment: string[];
  equipmentBookings?: { equipmentId: string; hours: number }[];
  paymentType: PaymentType;
  mixedPayment?: MixedPayment;
  totalHours: number;
  equipmentHours?: number;
  totalPrice: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  // Додаткові поля
  status?: 'active' | 'cancelled';
  cancelledAt?: string;
  cancelledBy?: string;
  telegramUserId?: number;
  telegramNotificationSent?: boolean;
}

// Bookings API
export const bookingsApi = {
  // Get all bookings (real-time)
  subscribe: (callback: (bookings: FirebaseBooking[]) => void) => {
    // Без сортування за замовчуванням, щоб не потребувати індекс
    const q = query(bookingsCollection);
    return onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseBooking[];
      // Сортуємо на клієнті
      bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(bookings);
    });
  },

  // Add new booking
  add: async (booking: Omit<FirebaseBooking, 'id'>, userId?: string | null) => {
    console.log('Adding booking to Firebase:', booking);
    // Очищаємо undefined значення перед збереженням
    const cleanBooking = JSON.parse(JSON.stringify({
      ...booking,
      createdBy: userId || null
    }));
    console.log('Clean booking data:', cleanBooking);
    try {
      const docRef = await addDoc(bookingsCollection, cleanBooking);
      console.log('Booking added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding booking:', error);
      throw error;
    }
  },

  // Update booking
  update: async (id: string, booking: Partial<FirebaseBooking>) => {
    const docRef = doc(db, 'bookings', id);
    // Очищаємо undefined значення перед оновленням
    const cleanBooking = JSON.parse(JSON.stringify(booking));
    await updateDoc(docRef, cleanBooking);
  },

  // Delete booking
  delete: async (id: string) => {
    const docRef = doc(db, 'bookings', id);
    await deleteDoc(docRef);
  }
};

// Auth API
export const authApi = {
  // Sign in with email/password
  signIn: async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  },

  // Sign out
  signOut: async () => {
    await signOut(auth);
  },

  // Subscribe to auth state
  subscribe: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get current user
  getCurrentUser: () => auth.currentUser
};

export default app;
