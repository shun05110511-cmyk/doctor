import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import type { UserProfile } from '../types';
import { INITIAL_USERS } from './seedData';

const LOCAL_STORAGE_USER_KEY = 'doc_followup_current_user_v1';

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  if (!isFirebaseConfigured) {
    // デモログインモード: INITIAL_USERSから検索
    const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(found));
      return found;
    }
    // 見つからない場合は入力されたメールアドレスに基づきデフォルト管理者/スタッフでログイン
    const mockUser: UserProfile = {
      uid: `user-${Date.now()}`,
      displayName: email.split('@')[0] || '一般ユーザー',
      email: email,
      role: email.includes('doctor') ? 'doctor' : email.includes('admin') ? 'admin' : 'staff',
      active: true,
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return mockUser;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    // Firestore から users/{uid} のロール情報を取得
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return { uid: fbUser.uid, ...userDocSnap.data() } as UserProfile;
    } else {
      // ユーザーデータが存在しない場合は初期化
      const matchingInit = INITIAL_USERS.find((u) => u.email === fbUser.email);
      const newUser: UserProfile = {
        uid: fbUser.uid,
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'ユーザー',
        email: fbUser.email || '',
        role: matchingInit?.role || 'staff',
        doctorId: matchingInit?.doctorId,
        active: true,
      };
      await setDoc(userDocRef, newUser);
      return newUser;
    }
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

export function getCurrentLocalUser(): UserProfile | null {
  const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  // デフォルトで管理者としてログイン状態にする（動作確認利便性）
  const defaultUser = INITIAL_USERS[0];
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
}

export function setQuickSwitchUser(user: UserProfile): void {
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
}

export async function logoutUser(): Promise<void> {
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  if (isFirebaseConfigured) {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error(e);
    }
  }
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。';
    case 'auth/user-disabled':
      return 'このアカウントは無効化されています。';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが正しくありません。';
    default:
      return 'ログインに失敗しました。入力内容をご確認ください。';
  }
}
