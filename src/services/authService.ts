import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import type { UserProfile } from '../types';
import { INITIAL_USERS } from './seedData';

// セッションストレージを使用（Webタブ・ブラウザを閉じる度にログイン情報がクリアされ、再訪問時にログインが必須となる）
const SESSION_STORAGE_USER_KEY = 'doc_followup_session_user_v2';
const LEGACY_LOCAL_STORAGE_KEY = 'doc_followup_current_user_v1';

export const OFFICIAL_ACCOUNTS_MAP: Record<string, { password: string; role: 'admin' | 'doctor'; doctorId?: string; name: string }> = {
  'scc@nittai.ac.jp': {
    password: 'scc62625353',
    role: 'admin',
    name: '管理者 スタッフ',
  },
  'shirao@nittai.ac.jp': {
    password: 'shirao1000',
    role: 'doctor',
    doctorId: 'doc-shirao',
    name: '白尾 医師',
  },
  'fukaya@nittai.ac.jp': {
    password: 'fukaya2000',
    role: 'doctor',
    doctorId: 'doc-fukaya',
    name: '深谷 医師',
  },
  'okada@nittai.ac.jp': {
    password: 'okada3000',
    role: 'doctor',
    doctorId: 'doc-okada',
    name: '岡田 医師',
  },
};

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const normEmail = email.toLowerCase().trim();
  const official = OFFICIAL_ACCOUNTS_MAP[normEmail];

  // 以前の永続localStorageログイン情報をクリア
  localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);

  if (official) {
    if (pass !== official.password) {
      throw new Error('パスワードが正しくありません。');
    }
    const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === normEmail);
    if (found) {
      sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(found));
      return found;
    }
    const customUser: UserProfile = {
      uid: `user-${normEmail.replace(/[^a-z0-9]/g, '')}`,
      displayName: official.name,
      email: normEmail,
      role: official.role,
      doctorId: official.doctorId,
      active: true,
    };
    sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(customUser));
    return customUser;
  }

  // デモ用互換・新規メールアドレス
  if (!isFirebaseConfigured) {
    const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === normEmail);
    if (found) {
      sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(found));
      return found;
    }
    throw new Error('メールアドレスまたはパスワードが正しくありません。');
  }

  try {
    // Firebase Auth の保持設定をブラウザセッション（タブ/ウィンドウ閉じで破棄）に設定
    await setPersistence(auth, browserSessionPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;
    
    const userDocRef = doc(db, 'users', fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const u = { uid: fbUser.uid, ...userDocSnap.data() } as UserProfile;
      sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(u));
      return u;
    } else {
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
      sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(newUser));
      return newUser;
    }
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

export function getCurrentLocalUser(): UserProfile | null {
  // 旧方式のlocalStorage保存をクリア（必ずセッションごとにログインを要求するため）
  if (localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY)) {
    localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
  }

  const saved = sessionStorage.getItem(SESSION_STORAGE_USER_KEY);
  if (saved) {
    try {
      const parsed: UserProfile = JSON.parse(saved);
      return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  // セッションストレージになければ未ログイン (null) を返す
  return null;
}

export function setQuickSwitchUser(user: UserProfile): void {
  sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(user));
}

export function getPortalPath(user: UserProfile | null): string {
  if (!user) return '/login';
  if (user.role === 'admin' || user.role === 'staff') return '/admin';
  if (user.role === 'doctor') {
    const slug = user.doctorId?.replace('doc-', '') || 'shirao';
    return `/doctor/${slug}`;
  }
  return '/admin';
}

export async function logoutUser(): Promise<void> {
  sessionStorage.removeItem(SESSION_STORAGE_USER_KEY);
  localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
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
