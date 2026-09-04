import React, { useState, useEffect } from 'react';
import type { Patient, PatientStatus } from '../types';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { INITIAL_DOCTORS } from '../services/seedData';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { STATUS_CONFIG } from './StatusBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Patient | null; // 編集時は既存患者データ
}

export const PatientModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
  const { createPatient, updatePatient, doctors } = usePatients();
  const { user } = useAuth();

  const availableDoctors = (doctors && doctors.length > 0) ? doctors : INITIAL_DOCTORS;

  const [patientCode, setPatientCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [patientType, setPatientType] = useState('日体生');
  const [clubActivity, setClubActivity] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('未回答');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [consultationDate, setConsultationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [consultationDetails, setConsultationDetails] = useState('');
  const [preConsultationAssessment, setPreConsultationAssessment] = useState('');
  const [doctorAssessment, setDoctorAssessment] = useState('');
  const [followUpPlan, setFollowUpPlan] = useState('');
  const [assignedDoctorId, setAssignedDoctorId] = useState('doc-shirao');
  const [status, setStatus] = useState<PatientStatus>('new');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // モーダルが開いた時だけ初期化
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setPatientCode(initialData.patientCode);
      setDisplayName(initialData.displayName);
      setPatientType(initialData.patientType || '日体生');
      setClubActivity(initialData.clubActivity || '');
      setAge(initialData.age || '');
      setGender(initialData.gender || '未回答');
      setMedicalHistory(initialData.medicalHistory || '');
      setConsultationDate(initialData.consultationDate);
      setChiefComplaint(initialData.chiefComplaint);
      setConsultationDetails(initialData.consultationDetails || '');
      setPreConsultationAssessment(initialData.preConsultationAssessment || '');
      setDoctorAssessment(initialData.doctorAssessment || '');
      setFollowUpPlan(initialData.followUpPlan || '');
      setAssignedDoctorId(initialData.assignedDoctorId || 'unassigned');
      setStatus(initialData.status);
      setNotes(initialData.notes || '');
    } else {
      // 初期新規作成時
      setPatientCode(`P-00${Math.floor(Math.random() * 900 + 100)}`);
      setDisplayName('');
      setPatientType('日体生');
      setClubActivity('');
      setAge('');
      setGender('未回答');
      setMedicalHistory('');
      setConsultationDate(new Date().toISOString().split('T')[0]);
      setChiefComplaint('');
      setConsultationDetails('');
      setPreConsultationAssessment('');
      setDoctorAssessment('');
      setFollowUpPlan('');
      const defaultDoc = (user?.role === 'doctor' && user?.doctorId) ? user.doctorId : (availableDoctors[0]?.id || 'doc-shirao');
      setAssignedDoctorId(defaultDoc);
      setStatus('new');
      setNotes('');
    }
    setErrorMsg('');
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!patientCode.trim()) {
      setErrorMsg('患者IDを入力してください。');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('表示用仮名を入力してください。');
      return;
    }
    if (!chiefComplaint.trim()) {
      setErrorMsg('主な相談内容を入力してください。');
      return;
    }

    const selectedDocObj = availableDoctors.find((d) => d.id === assignedDoctorId);
    const assignedDoctorName =
      assignedDoctorId === 'unassigned'
        ? '担当医未設定'
        : selectedDocObj
        ? selectedDocObj.displayName
        : '担当医未設定';

    setSubmitting(true);

    try {
      if (initialData) {
        // 編集
        await updatePatient(initialData.id, {
          patientCode: patientCode.trim(),
          displayName: displayName.trim(),
          patientType,
          clubActivity: clubActivity.trim(),
          age: age.trim(),
          gender,
          medicalHistory: medicalHistory.trim(),
          consultationDate,
          chiefComplaint: chiefComplaint.trim(),
          consultationDetails: consultationDetails.trim(),
          preConsultationAssessment: preConsultationAssessment.trim(),
          doctorAssessment: doctorAssessment.trim(),
          followUpPlan: followUpPlan.trim(),
          assignedDoctorId,
          assignedDoctorName,
          status,
          notes: notes.trim(),
        });
      } else {
        // 新規登録
        await createPatient({
          patientCode: patientCode.trim(),
          displayName: displayName.trim(),
          patientType,
          clubActivity: clubActivity.trim(),
          age: age.trim(),
          gender,
          medicalHistory: medicalHistory.trim(),
          consultationDate,
          chiefComplaint: chiefComplaint.trim(),
          consultationDetails: consultationDetails.trim(),
          preConsultationAssessment: preConsultationAssessment.trim(),
          doctorAssessment: doctorAssessment.trim(),
          followUpPlan: followUpPlan.trim(),
          assignedDoctorId,
          assignedDoctorName,
          status,
          notes: notes.trim(),
          createdBy: user?.uid || 'unknown',
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '患者情報の保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* モーダルヘッダー */}
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <span>{initialData ? '患者情報の編集' : '新規患者登録'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* フォーム入力エリア */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                患者ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={patientCode}
                onChange={(e) => setPatientCode(e.target.value)}
                placeholder="例: P-001"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
              <span className="text-[10px] text-slate-400">重複しない識別IDを入力してください</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                表示用仮名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: 患者A"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
              <span className="text-[10px] text-slate-400">実名は使用せず仮名を入力してください</span>
            </div>
          </div>

          {/* 区分 (日体生/一般) & 部活動・運動 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
            <div>
              <label className="block font-bold text-blue-900 mb-1">区分 (日体生か一般か)</label>
              <select
                value={patientType}
                onChange={(e) => setPatientType(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-blue-900"
              >
                <option value="日体生">日体生 (日本体育大学)</option>
                <option value="一般">一般 (学外・一般の方)</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1">部活動・現在行っている運動</label>
              <input
                type="text"
                value={clubActivity}
                onChange={(e) => setClubActivity(e.target.value)}
                placeholder="例: 陸上部(短距離)、バスケットボールなど"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* 年齢 & 性別 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">年齢</label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="例: 45歳"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">性別</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="未回答">未回答</option>
                <option value="男性">男性</option>
                <option value="女性">女性</option>
                <option value="その他">その他</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">相談会実施日</label>
              <input
                type="date"
                value={consultationDate}
                onChange={(e) => setConsultationDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                担当ドクター <span className="text-red-500">*</span>
              </label>
              <select
                value={assignedDoctorId}
                onChange={(e) => setAssignedDoctorId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-semibold text-blue-900 cursor-pointer"
              >
                {availableDoctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.displayName}
                  </option>
                ))}
                <option value="unassigned">担当医未設定</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">現在のステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PatientStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
              >
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              主な相談内容 (要約) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="例: 右膝の運動時痛"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {/* 既往歴 */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">既往歴</label>
            <textarea
              rows={2}
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="例: 高血圧、右膝半月板損傷（2020年）、アレルギー等"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">相談内容の詳細</label>
            <textarea
              rows={2}
              value={consultationDetails}
              onChange={(e) => setConsultationDetails(e.target.value)}
              placeholder="患者からの相談詳細、生活環境、現在の状態など"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* 事前評価所見 (スタッフ評価) & ドクター所見 (医師診察) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-emerald-900 mb-1 flex items-center gap-1">
                <span>📋 事前評価所見 (参加スクリーニング・スタッフ評価)</span>
              </label>
              <textarea
                rows={3}
                value={preConsultationAssessment}
                onChange={(e) => setPreConsultationAssessment(e.target.value)}
                placeholder="相談会参加にあたっての事前スクリーニング・動作観察・理学評価・受付時所見など"
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-blue-900 mb-1 flex items-center gap-1">
                <span>🩺 ドクター所見 (医師診察・評価)</span>
              </label>
              <textarea
                rows={3}
                value={doctorAssessment}
                onChange={(e) => setDoctorAssessment(e.target.value)}
                placeholder="相談会でのドクター診察・身体所見・画像評価など"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">今後の対応方針</label>
            <textarea
              rows={2}
              value={followUpPlan}
              onChange={(e) => setFollowUpPlan(e.target.value)}
              placeholder="例: 週1回の経過観察およびリハビリ計画"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">備考 (任意)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="特記事項"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* フッター操作ボタン */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? '保存中...' : initialData ? '更新保存' : '登録する'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
