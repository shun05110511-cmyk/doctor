export type UserRole = 'admin' | 'staff' | 'doctor';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  doctorId?: string; // doctorロールの場合は担当ドクターのID
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Doctor {
  id: string;
  displayName: string; // 例: "白尾医師", "深谷医師", "岡田医師"
  userId?: string;
  active: boolean;
  displayOrder: number;
}

export type PatientStatus =
  | 'new'            // 新規登録
  | 'observing'      // 経過観察中
  | 'waiting_doctor' // ドクター回答待ち
  | 'waiting_staff'  // スタッフ確認待ち
  | 'in_progress'    // 対応中
  | 'completed'      // 対応完了
  | 'archived';      // アーカイブ

export interface Patient {
  id: string;
  patientCode: string;          // 例: P-001
  displayName: string;          // 例: 患者A
  patientType?: string;         // 区分 (例: 日体生, 一般)
  clubActivity?: string;        // 部活動・現在行っている運動 (例: 陸上部, 水泳など)
  age?: string;                 // 年齢 (例: 45歳)
  gender?: string;              // 性別 (例: 男性, 女性, その他)
  medicalHistory?: string;      // 既往歴
  consultationDate: string;     // 相談会実施日 (YYYY-MM-DD)
  chiefComplaint: string;       // 主な相談内容
  consultationDetails: string;  // 相談内容の詳細
  preConsultationAssessment?: string; // 事前評価所見 (相談会参加前の評価・スタッフ所見)
  doctorAssessment: string;     // ドクターからの所見 (医師診察・評価)
  doctorAdvice: string;         // ドクターからの助言
  followUpPlan: string;         // 今後の対応方針
  assignedDoctorId: string;     // ドクターID、未設定の場合は "unassigned"
  assignedDoctorName: string;   // 例: 白尾医師, 担当医未設定
  assignedStaffIds?: string[];  // 担当スタッフID
  status: PatientStatus;
  notes?: string;
  archived: boolean;
  unreadCount?: number;         // 未確認投稿数 (クライアント表示用)
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

export type TimelineItemType =
  | 'progress_report' // 経過報告
  | 'doctor_question' // ドクターへの確認依頼
  | 'doctor_response' // ドクターからの回答
  | 'action_record'   // 対応記録
  | 'other';          // その他の連絡

export type PriorityLevel = 'normal' | 'soon' | 'important'; // 「緊急」は使用せず、「通常」「早めに確認」「重要」

export interface ConfirmedUser {
  userId: string;
  userName: string;
  confirmedAt: string; // または Timestamp ISO文字列
}

export interface TimelineItem {
  id: string;
  patientId: string;
  type: TimelineItemType;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  requiresResponse: boolean;
  priority: PriorityLevel;
  relatedTimelineId?: string;
  confirmedBy: ConfirmedUser[];
  createdAt: any;
  updatedAt: any;
}
