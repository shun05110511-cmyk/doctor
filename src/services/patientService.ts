import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
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

// ローカルストレージ初期化ヘルパー
function getLocalDoctors(): Doctor[] {
  const saved = localStorage.getItem(LOCAL_STORAGE_DOCTORS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
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
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS));
  return INITIAL_PATIENTS;
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
    const querySnapshot = await getDocs(collection(db, 'doctors'));
    if (querySnapshot.empty) {
      // 初期ドクターデータをFirestoreに投入
      for (const d of INITIAL_DOCTORS) {
        await setDoc(doc(db, 'doctors', d.id), d);
      }
      return INITIAL_DOCTORS;
    }
    const doctors: Doctor[] = [];
    querySnapshot.forEach((docSnap) => {
      doctors.push({ id: docSnap.id, ...docSnap.data() } as Doctor);
    });
    return doctors.sort((a, b) => a.displayOrder - b.displayOrder);
  } catch (error) {
    console.warn('Firestore fetchDoctors failed, fallback to local:', error);
    return getLocalDoctors();
  }
}

export async function fetchPatients(userRole?: string, doctorId?: string): Promise<Patient[]> {
  let patients: Patient[] = [];
  if (!isFirebaseConfigured) {
    patients = getLocalPatients();
  } else {
    try {
      const querySnapshot = await getDocs(collection(db, 'patients'));
      if (querySnapshot.empty) {
        // シードデータの投入
        for (const p of INITIAL_PATIENTS) {
          const { id, ...pData } = p;
          await setDoc(doc(db, 'patients', id), {
            ...pData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        patients = INITIAL_PATIENTS;
      } else {
        querySnapshot.forEach((docSnap) => {
          patients.push({ id: docSnap.id, ...docSnap.data() } as Patient);
        });
      }
    } catch (error) {
      console.warn('Firestore fetchPatients failed, fallback to local:', error);
      patients = getLocalPatients();
    }
  }

  // ドクター権限の場合は自分の担当患者のみ閲覧できるようにフィルター
  if (userRole === 'doctor' && doctorId) {
    patients = patients.filter((p) => p.assignedDoctorId === doctorId);
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
    const docSnap = await getDoc(docRef);
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

  if (!isFirebaseConfigured) {
    const list = getLocalPatients();
    // 患者ID重複チェック
    if (list.some((p) => p.patientCode === patientData.patientCode)) {
      throw new Error(`患者ID「${patientData.patientCode}」は既に使用されています。`);
    }
    const updated = [newPatient, ...list];
    saveLocalPatients(updated);
    return newPatient;
  }

  try {
    // ID重複チェック
    const q = query(collection(db, 'patients'), where('patientCode', '==', patientData.patientCode));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`患者ID「${patientData.patientCode}」は既に使用されています。`);
    }

    const docRef = doc(db, 'patients', newId);
    await setDoc(docRef, {
      ...patientData,
      id: newId,
      archived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newPatient;
  } catch (error: any) {
    if (error.message.includes('既に使用されています')) {
      throw error;
    }
    console.warn('Firestore createPatient fallback to local:', error);
    const list = getLocalPatients();
    const updated = [newPatient, ...list];
    saveLocalPatients(updated);
    return newPatient;
  }
}

export async function updatePatient(
  patientId: string,
  updates: Partial<Patient>
): Promise<void> {
  const now = new Date().toISOString();
  if (!isFirebaseConfigured) {
    const list = getLocalPatients();
    const index = list.findIndex((p) => p.id === patientId);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updatedAt: now };
      saveLocalPatients(list);
    }
    return;
  }

  try {
    const docRef = doc(db, 'patients', patientId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Firestore updatePatient fallback:', error);
    const list = getLocalPatients();
    const index = list.findIndex((p) => p.id === patientId);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updatedAt: now };
      saveLocalPatients(list);
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
    const querySnapshot = await getDocs(q);
    
    // Firestoreにデータが未作成の場合は初期データをセット
    if (querySnapshot.empty && INITIAL_TIMELINES[patientId]) {
      const initItems = INITIAL_TIMELINES[patientId];
      for (const item of initItems) {
        await setDoc(doc(db, 'patients', patientId, 'timeline', item.id), item);
      }
      return initItems;
    }

    const items: TimelineItem[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, patientId, ...docSnap.data() } as TimelineItem);
    });
    return items;
  } catch (error) {
    console.warn('Firestore fetchTimeline fallback to local:', error);
    const timelinesMap = getLocalTimelines();
    return timelinesMap[patientId] || [];
  }
}

export async function fetchAllTimelinesMap(): Promise<Record<string, TimelineItem[]>> {
  if (!isFirebaseConfigured) {
    return getLocalTimelines();
  }
  try {
    const patients = getLocalPatients();
    const map: Record<string, TimelineItem[]> = {};
    for (const p of patients) {
      map[p.id] = await fetchTimeline(p.id);
    }
    return map;
  } catch {
    return getLocalTimelines();
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

  // ステータス自動更新判定
  let newStatus: PatientStatus = currentPatientStatus;
  if (itemData.type === 'doctor_question') {
    newStatus = 'waiting_doctor'; // ドクター回答待ちに自動変更
  } else if (itemData.type === 'doctor_response') {
    newStatus = 'waiting_staff';  // スタッフ確認待ちに自動変更
  }

  if (!isFirebaseConfigured) {
    const timelinesMap = getLocalTimelines();
    const list = timelinesMap[patientId] || [];
    timelinesMap[patientId] = [...list, newItem];
    saveLocalTimelines(timelinesMap);

    if (newStatus !== currentPatientStatus) {
      await updatePatient(patientId, { status: newStatus });
    }
    return newItem;
  }

  try {
    const timelineRef = doc(db, 'patients', patientId, 'timeline', newId);
    await setDoc(timelineRef, {
      ...itemData,
      id: newId,
      patientId,
      confirmedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (newStatus !== currentPatientStatus) {
      await updatePatient(patientId, { status: newStatus });
    }
    return newItem;
  } catch (error) {
    console.warn('Firestore addTimelineItem fallback:', error);
    const timelinesMap = getLocalTimelines();
    const list = timelinesMap[patientId] || [];
    timelinesMap[patientId] = [...list, newItem];
    saveLocalTimelines(timelinesMap);

    if (newStatus !== currentPatientStatus) {
      await updatePatient(patientId, { status: newStatus });
    }
    return newItem;
  }
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
    // 取り消し
    updatedConfirmedBy.splice(existingConfirmIndex, 1);
  } else {
    // 確認済追加
    updatedConfirmedBy.push({
      userId: user.uid,
      userName: user.displayName,
      confirmedAt: new Date().toISOString(),
    });
  }

  if (!isFirebaseConfigured) {
    item.confirmedBy = updatedConfirmedBy;
    currentItems[targetIndex] = item;
    const timelinesMap = getLocalTimelines();
    timelinesMap[patientId] = currentItems;
    saveLocalTimelines(timelinesMap);
    return currentItems;
  }

  try {
    const docRef = doc(db, 'patients', patientId, 'timeline', timelineId);
    await updateDoc(docRef, {
      confirmedBy: updatedConfirmedBy,
      updatedAt: serverTimestamp(),
    });
    item.confirmedBy = updatedConfirmedBy;
    currentItems[targetIndex] = item;
    return currentItems;
  } catch (error) {
    console.warn('Firestore toggleConfirmTimelineItem fallback:', error);
    item.confirmedBy = updatedConfirmedBy;
    currentItems[targetIndex] = item;
    const timelinesMap = getLocalTimelines();
    timelinesMap[patientId] = currentItems;
    saveLocalTimelines(timelinesMap);
    return currentItems;
  }
}

export async function deletePatient(patientId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const list = getLocalPatients();
    const updated = list.filter((p) => p.id !== patientId);
    saveLocalPatients(updated);

    const timelinesMap = getLocalTimelines();
    delete timelinesMap[patientId];
    saveLocalTimelines(timelinesMap);
    return;
  }

  try {
    const docRef = doc(db, 'patients', patientId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn('Firestore deletePatient fallback:', error);
    const list = getLocalPatients();
    const updated = list.filter((p) => p.id !== patientId);
    saveLocalPatients(updated);

    const timelinesMap = getLocalTimelines();
    delete timelinesMap[patientId];
    saveLocalTimelines(timelinesMap);
  }
}

