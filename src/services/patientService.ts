import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type {
  Doctor,
  Patient,
  PatientStatus,
  TimelineItem,
  UserProfile,
} from '../types';
import {
  INITIAL_DOCTORS,
  INITIAL_PATIENTS,
  INITIAL_TIMELINES,
} from './seedData';

const LOCAL_STORAGE_PATIENTS_KEY = 'doc_followup_patients_v1';
const LOCAL_STORAGE_TIMELINES_KEY = 'doc_followup_timelines_v1';
const LOCAL_STORAGE_DOCTORS_KEY = 'doc_followup_doctors_v1';

// タイムアウト付きPromiseヘルパー（Firestore接続遅延・AuthルールハングによるUIブロックの完全防止）
function withTimeout<T>(promise: Promise<T>, timeoutMs = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}

// ローカルストレージ初期化ヘルパー
function getLocalDoctors(): Doctor[] {
  const saved = localStorage.getItem(LOCAL_STORAGE_DOCTORS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_DOCTORS_KEY, JSON.stringify(INITIAL_DOCTORS));
  return INITIAL_DOCTORS;
}

export function saveLocalDoctors(doctors: Doctor[]) {
  localStorage.setItem(LOCAL_STORAGE_DOCTORS_KEY, JSON.stringify(doctors));
}

function getLocalPatients(): Patient[] {
  const saved = localStorage.getItem(LOCAL_STORAGE_PATIENTS_KEY);
  if (saved) {
    try {
      const parsed: Patient[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // テスト用初期サンプルデータ (P-001〜P-007) を自動消去
        const cleaned = parsed.filter(
          (p) => !['patient-p-001', 'patient-p-002', 'patient-p-003', 'patient-p-004', 'patient-p-005', 'patient-p-006', 'patient-p-007'].includes(p.id)
        );
        if (cleaned.length !== parsed.length) {
          saveLocalPatients(cleaned);
        }
        return cleaned;
      }
    } catch (e) {
      console.error(e);
    }
  }
  saveLocalPatients([]);
  return [];
}

function saveLocalPatients(patients: Patient[]) {
  localStorage.setItem(LOCAL_STORAGE_PATIENTS_KEY, JSON.stringify(patients));
}

function getLocalTimelines(): Record<string, TimelineItem[]> {
  const saved = localStorage.getItem(LOCAL_STORAGE_TIMELINES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_TIMELINES_KEY, JSON.stringify(INITIAL_TIMELINES));
  return INITIAL_TIMELINES;
}

function saveLocalTimelines(timelines: Record<string, TimelineItem[]>) {
  localStorage.setItem(LOCAL_STORAGE_TIMELINES_KEY, JSON.stringify(timelines));
}

// Service APIs

export async function fetchDoctors(): Promise<Doctor[]> {
  if (!isFirebaseConfigured) {
    return getLocalDoctors();
  }
  try {
    const querySnapshot = await withTimeout(getDocs(collection(db, 'doctors')), 2500);
    if (querySnapshot.empty) {
      for (const d of INITIAL_DOCTORS) {
        setDoc(doc(db, 'doctors', d.id), d).catch(() => {});
      }
      return INITIAL_DOCTORS;
    }
    const doctors: Doctor[] = [];
    querySnapshot.forEach((docSnap) => {
      doctors.push({ id: docSnap.id, ...docSnap.data() } as Doctor);
    });
    return doctors.length > 0 ? doctors.sort((a, b) => a.displayOrder - b.displayOrder) : INITIAL_DOCTORS;
  } catch (error) {
    console.warn('Firestore fetchDoctors timeout/fallback to local:', error);
    return getLocalDoctors();
  }
}

export async function fetchPatients(_userRole?: string, _doctorId?: string): Promise<Patient[]> {
  let patients: Patient[] = [];
  if (!isFirebaseConfigured) {
    patients = getLocalPatients();
  } else {
    try {
      const querySnapshot = await withTimeout(getDocs(collection(db, 'patients')), 3000);
      if (querySnapshot.empty) {
        for (const p of INITIAL_PATIENTS) {
          const { id, ...pData } = p;
          setDoc(doc(db, 'patients', id), {
            ...pData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        }
        patients = INITIAL_PATIENTS;
      } else {
        querySnapshot.forEach((docSnap) => {
          patients.push({ id: docSnap.id, ...docSnap.data() } as Patient);
        });
      }
    } catch (error) {
      console.warn('Firestore fetchPatients timeout/fallback to local:', error);
      patients = getLocalPatients();
    }
  }

  // 未確認数を計算してセット
  const timelinesMap = await fetchAllTimelinesMap();
  patients = patients.map((p) => {
    const list = timelinesMap[p.id] || [];
    const unread = list.filter((t) => !t.confirmedBy || t.confirmedBy.length === 0).length;
    return { ...p, unreadCount: unread };
  });

  return patients;
}

export async function fetchPatientById(patientId: string): Promise<Patient | null> {
  if (!isFirebaseConfigured) {
    const list = getLocalPatients();
    return list.find((p) => p.id === patientId) || null;
  }
  try {
    const docRef = doc(db, 'patients', patientId);
    const docSnap = await withTimeout(getDoc(docRef), 2500);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Patient;
    }
    return null;
  } catch (error) {
    console.warn('Firestore fetchPatientById failed:', error);
    const list = getLocalPatients();
    return list.find((p) => p.id === patientId) || null;
  }
}

export async function createPatient(
  patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'archived' | 'unreadCount'>
): Promise<Patient> {
  const newId = `patient-${Date.now()}`;
  const now = new Date().toISOString();
  const newPatient: Patient = {
    ...patientData,
    id: newId,
    archived: false,
    unreadCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 即座にローカルに保存（画面ハングを100%防止）
  const localList = getLocalPatients();
  if (localList.some((p) => p.patientCode === patientData.patientCode)) {
    throw new Error(`患者ID「${patientData.patientCode}」は既に使用されています。`);
  }
  const updatedLocal = [newPatient, ...localList];
  saveLocalPatients(updatedLocal);

  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'patients', newId);
      await withTimeout(
        setDoc(docRef, {
          ...patientData,
          id: newId,
          archived: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        3000
      );
    } catch (error: any) {
      console.warn('Firestore setDoc timed out or skipped, saved locally:', error);
    }
  }

  return newPatient;
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Patient>
): Promise<void> {
  const now = new Date().toISOString();
  const list = getLocalPatients();
  const index = list.findIndex((p) => p.id === patientId);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates, updatedAt: now };
    saveLocalPatients(list);
  }

  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'patients', patientId);
      await withTimeout(
        updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        }),
        3000
      );
    } catch (error) {
      console.warn('Firestore updatePatient timeout/fallback:', error);
    }
  }
}

export async function fetchTimeline(patientId: string): Promise<TimelineItem[]> {
  if (!isFirebaseConfigured) {
    const timelinesMap = getLocalTimelines();
    return timelinesMap[patientId] || [];
  }

  try {
    const timelineRef = collection(db, 'patients', patientId, 'timeline');
    const q = query(timelineRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await withTimeout(getDocs(q), 2500);
    
    if (querySnapshot.empty && INITIAL_TIMELINES[patientId]) {
      const initItems = INITIAL_TIMELINES[patientId];
      return initItems;
    }

    const items: TimelineItem[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, patientId, ...docSnap.data() } as TimelineItem);
    });
    return items;
  } catch (error) {
    console.warn('Firestore fetchTimeline timeout/fallback to local:', error);
    const timelinesMap = getLocalTimelines();
    return timelinesMap[patientId] || [];
  }
}

export async function fetchAllTimelinesMap(): Promise<Record<string, TimelineItem[]>> {
  const localMap = getLocalTimelines();
  if (!isFirebaseConfigured) {
    return localMap;
  }
  try {
    const patients = getLocalPatients();
    const map: Record<string, TimelineItem[]> = { ...localMap };
    await withTimeout(
      Promise.all(
        patients.map(async (p) => {
          map[p.id] = await fetchTimeline(p.id);
        })
      ),
      2500
    );
    return map;
  } catch {
    return localMap;
  }
}

export async function addTimelineItem(
  patientId: string,
  itemData: Omit<TimelineItem, 'id' | 'patientId' | 'createdAt' | 'updatedAt' | 'confirmedBy'>,
  currentPatientStatus: PatientStatus
): Promise<TimelineItem> {
  const newId = `time-${Date.now()}`;
  const now = new Date().toISOString();
  const newItem: TimelineItem = {
    ...itemData,
    id: newId,
    patientId,
    confirmedBy: [],
    createdAt: now,
    updatedAt: now,
  };

  let newStatus: PatientStatus = currentPatientStatus;
  if (itemData.type === 'doctor_question') {
    newStatus = 'waiting_doctor';
  } else if (itemData.type === 'doctor_response') {
    newStatus = 'waiting_staff';
  }

  const timelinesMap = getLocalTimelines();
  const list = timelinesMap[patientId] || [];
  timelinesMap[patientId] = [...list, newItem];
  saveLocalTimelines(timelinesMap);

  if (newStatus !== currentPatientStatus) {
    await updatePatient(patientId, { status: newStatus });
  }

  if (isFirebaseConfigured) {
    try {
      const timelineRef = doc(db, 'patients', patientId, 'timeline', newId);
      await withTimeout(
        setDoc(timelineRef, {
          ...itemData,
          id: newId,
          patientId,
          confirmedBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        3000
      );
    } catch (error) {
      console.warn('Firestore addTimelineItem timeout/fallback:', error);
    }
  }

  return newItem;
}

export async function toggleConfirmTimelineItem(
  patientId: string,
  timelineId: string,
  user: UserProfile
): Promise<TimelineItem[]> {
  const currentItems = await fetchTimeline(patientId);
  const targetIndex = currentItems.findIndex((t) => t.id === timelineId);
  if (targetIndex === -1) return currentItems;

  const item = currentItems[targetIndex];
  const existingConfirmIndex = item.confirmedBy.findIndex((c) => c.userId === user.uid);

  let updatedConfirmedBy = [...item.confirmedBy];
  if (existingConfirmIndex >= 0) {
    updatedConfirmedBy.splice(existingConfirmIndex, 1);
  } else {
    updatedConfirmedBy.push({
      userId: user.uid,
      userName: user.displayName,
      confirmedAt: new Date().toISOString(),
    });
  }

  item.confirmedBy = updatedConfirmedBy;
  currentItems[targetIndex] = item;
  const timelinesMap = getLocalTimelines();
  timelinesMap[patientId] = currentItems;
  saveLocalTimelines(timelinesMap);

  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'patients', patientId, 'timeline', timelineId);
      await withTimeout(
        updateDoc(docRef, {
          confirmedBy: updatedConfirmedBy,
          updatedAt: serverTimestamp(),
        }),
        2500
      );
    } catch (error) {
      console.warn('Firestore toggleConfirmTimelineItem timeout/fallback:', error);
    }
  }

  return currentItems;
}

export async function deletePatient(patientId: string): Promise<void> {
  const list = getLocalPatients();
  const updated = list.filter((p) => p.id !== patientId);
  saveLocalPatients(updated);

  const timelinesMap = getLocalTimelines();
  delete timelinesMap[patientId];
  saveLocalTimelines(timelinesMap);

  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'patients', patientId);
      await withTimeout(deleteDoc(docRef), 2500);
    } catch (error) {
      console.warn('Firestore deletePatient timeout/fallback:', error);
    }
  }
}

// 既存のPCローカルデータを一括でクラウド（Firebase）へ同期アップロード
export async function syncLocalDataToCloud(): Promise<number> {
  if (!isFirebaseConfigured) return 0;

  const localPatients = getLocalPatients();
  const localTimelines = getLocalTimelines();

  if (localPatients.length === 0) return 0;

  let syncedCount = 0;
  for (const p of localPatients) {
    try {
      const docRef = doc(db, 'patients', p.id);
      const { id, unreadCount, ...pData } = p;
      await withTimeout(
        setDoc(
          docRef,
          {
            ...pData,
            id: p.id,
            createdAt: p.createdAt || serverTimestamp(),
            updatedAt: p.updatedAt || serverTimestamp(),
          },
          { merge: true }
        ),
        3000
      );

      const pTimeline = localTimelines[p.id] || [];
      for (const tItem of pTimeline) {
        const tRef = doc(db, 'patients', p.id, 'timeline', tItem.id);
        const { id: tId, patientId, ...tData } = tItem;
        await withTimeout(
          setDoc(
            tRef,
            {
              ...tData,
              id: tId,
              patientId: p.id,
              createdAt: tItem.createdAt || serverTimestamp(),
              updatedAt: tItem.updatedAt || serverTimestamp(),
            },
            { merge: true }
          ),
          3000
        );
      }
      syncedCount++;
    } catch (err) {
      console.warn(`Failed to sync patient ${p.id} to cloud:`, err);
    }
  }

  return syncedCount;
}

// 他デバイス連携・データエクスポート（バックアップ出力）
export function exportAllDataJson(): string {
  const patients = getLocalPatients();
  const timelines = getLocalTimelines();
  const doctors = getLocalDoctors();
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    patients,
    timelines,
    doctors,
  };
  return JSON.stringify(data, null, 2);
}

// 他デバイス連携・データインポート（取り込み復元＆クラウド反映）
export async function importAllDataJson(jsonStr: string): Promise<{ patientCount: number }> {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('無効なデータ形式です。正しいバックアップファイルを選択してください。');
  }

  const newPatients: Patient[] = Array.isArray(parsed.patients) ? parsed.patients : [];
  const newTimelines: Record<string, TimelineItem[]> = parsed.timelines && typeof parsed.timelines === 'object' ? parsed.timelines : {};
  const newDoctors: Doctor[] = Array.isArray(parsed.doctors) ? parsed.doctors : [];

  saveLocalPatients(newPatients);
  saveLocalTimelines(newTimelines);
  if (newDoctors.length > 0) {
    saveLocalDoctors(newDoctors);
  }

  if (isFirebaseConfigured) {
    await syncLocalDataToCloud();
  }

  return { patientCount: newPatients.length };
}
