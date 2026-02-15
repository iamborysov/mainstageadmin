// Система ролей користувачів через Firebase Firestore
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  query
} from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'owner' | 'admin';

export interface UserRoleData {
  email: string;
  role: UserRole;
  createdAt: string;
  createdBy?: string;
}

const USER_ROLES_COLLECTION = 'userRoles';

// Отримання ролі користувача з Firestore
export const getUserRole = async (email: string): Promise<UserRole> => {
  if (!email) return 'admin';
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const roleDoc = await getDoc(doc(db, USER_ROLES_COLLECTION, normalizedEmail));
    
    if (roleDoc.exists()) {
      const data = roleDoc.data() as UserRoleData;
      return data.role;
    }
    
    // За замовчуванням - admin
    return 'admin';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'admin';
  }
};

// Отримання ролі користувача (синхронна версія - перевіряє кеш)
export const getUserRoleSync = (email: string, rolesCache: Map<string, UserRole>): UserRole => {
  if (!email) return 'admin';
  const normalizedEmail = email.toLowerCase().trim();
  return rolesCache.get(normalizedEmail) || 'admin';
};

// Встановлення ролі користувача (тільки для owner)
export const setUserRole = async (
  email: string, 
  role: UserRole, 
  currentUserId?: string
): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const roleData: UserRoleData = {
    email: normalizedEmail,
    role,
    createdAt: new Date().toISOString(),
    createdBy: currentUserId,
  };
  
  await setDoc(doc(db, USER_ROLES_COLLECTION, normalizedEmail), roleData);
};

// Видалення ролі користувача
export const removeUserRole = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  await deleteDoc(doc(db, USER_ROLES_COLLECTION, normalizedEmail));
};

// Отримання всіх ролей
export const getAllUserRoles = async (): Promise<UserRoleData[]> => {
  const snapshot = await getDocs(collection(db, USER_ROLES_COLLECTION));
  return snapshot.docs.map(doc => doc.data() as UserRoleData);
};

// Підписка на зміни ролей (для real-time оновлення)
export const subscribeToUserRoles = (
  callback: (roles: Map<string, UserRole>) => void
) => {
  const q = query(collection(db, USER_ROLES_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const roles = new Map<string, UserRole>();
    snapshot.docs.forEach(doc => {
      const data = doc.data() as UserRoleData;
      roles.set(data.email, data.role);
    });
    callback(roles);
  });
};

// Перевірка чи є користувач owner
export const isOwner = async (email: string | null | undefined): Promise<boolean> => {
  if (!email) return false;
  const role = await getUserRole(email);
  return role === 'owner';
};

// Перевірка чи є користувач admin
export const isAdmin = async (email: string | null | undefined): Promise<boolean> => {
  if (!email) return false;
  const role = await getUserRole(email);
  return role === 'admin' || role === 'owner';
};

// Ініціалізація користувача при вході
// - Якщо користувач вже є в Firestore - нічого не робимо
// - Якщо користувача немає в Firestore і немає жодного owner - робимо його owner
// - Якщо користувача немає в Firestore але є owner - робимо його admin
export const initializeUserRole = async (
  email: string, 
  currentUserId?: string
): Promise<UserRole> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Перевіряємо чи вже є роль для цього користувача
  const existingRole = await getUserRole(normalizedEmail);
  const roleDoc = await getDoc(doc(db, USER_ROLES_COLLECTION, normalizedEmail));
  
  if (roleDoc.exists()) {
    // Користувач вже ініціалізований
    return existingRole;
  }
  
  // Перевіряємо чи є вже хоч один owner в системі
  const allRoles = await getAllUserRoles();
  const hasOwner = allRoles.some(r => r.role === 'owner');
  
  let role: UserRole;
  if (!hasOwner) {
    // Якщо немає жодного owner - робимо поточного користувача owner
    role = 'owner';
    console.log('First owner initialized:', normalizedEmail);
  } else {
    // Якщо є owner - новий користувач отримує роль admin
    role = 'admin';
    console.log('New user initialized as admin:', normalizedEmail);
  }
  
  await setUserRole(normalizedEmail, role, currentUserId);
  return role;
};

// Для сумісності зі старим кодом
export const initializeFirstOwner = initializeUserRole;
