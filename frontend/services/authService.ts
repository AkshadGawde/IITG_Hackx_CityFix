import { User } from '../types';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";


export const login = async (email, password, role: 'user' | 'admin'): Promise<User | null> => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // After successful login, check their role from Firestore
  const userDocRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists() && userDoc.data().role === role) {
    const userData = userDoc.data();
    return {
      id: user.uid,
      email: user.email!,
      role: userData.role
    };
  } else {
    // If roles don't match, sign them out and reject login
    await signOut(auth);
    throw new Error("Invalid credentials or role selection.");
  }
};

export const signUp = async (email, password, role: 'user' | 'admin'): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Create a user profile document in Firestore to store their role
  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    email: user.email,
    role: role,
    createdAt: new Date().toISOString()
  });

  return {
    id: user.uid,
    email: user.email!,
    role
  };
};

export const logout = (): Promise<void> => {
  return signOut(auth);
};