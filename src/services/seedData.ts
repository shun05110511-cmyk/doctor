import type { Doctor, Patient, UserProfile, TimelineItem } from '../types';

export const INITIAL_DOCTORS: Doctor[] = [
  { id: 'doc-shirao', displayName: '白尾医師', active: true, displayOrder: 1 },
  { id: 'doc-fukaya', displayName: '深谷医師', active: true, displayOrder: 2 },
  { id: 'doc-okada', displayName: '岡田医師', active: true, displayOrder: 3 },
];

export const INITIAL_USERS: UserProfile[] = [
  {
    uid: 'user-admin-01',
    displayName: '管理者 スタッフ',
    email: 'scc@nittai.ac.jp',
    role: 'admin',
    active: true,
  },
  {
    uid: 'user-doc-shirao',
    displayName: '白尾 医師',
    email: 'shirao@nittai.ac.jp',
    role: 'doctor',
    doctorId: 'doc-shirao',
    active: true,
  },
  {
    uid: 'user-doc-fukaya',
    displayName: '深谷 医師',
    email: 'fukaya@nittai.ac.jp',
    role: 'doctor',
    doctorId: 'doc-fukaya',
    active: true,
  },
  {
    uid: 'user-doc-okada',
    displayName: '岡田 医師',
    email: 'okada@nittai.ac.jp',
    role: 'doctor',
    doctorId: 'doc-okada',
    active: true,
  },
];

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_TIMELINES: Record<string, TimelineItem[]> = {};
