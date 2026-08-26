import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { Folder, Users, UserCheck, AlertCircle, FileText, ChevronRight, ExternalLink } from 'lucide-react';

interface Props {
  selectedFilter: string; // 'all' | 'doc-shirao' | 'doc-fukaya' | 'doc-okada' | 'unassigned' | 'waiting_doctor' | 'completed' | 'archived'
  onSelectFilter: (filterId: string) => void;
}

export const DoctorSidebar: React.FC<Props> = ({ selectedFilter, onSelectFilter }) => {
  const { patients, doctors } = usePatients();
  const { user } = useAuth();

  // 医師ログイン時は自身のドクターフォルダを自動初期選択してデザイン表示を統一
  useEffect(() => {
    if (user?.role === 'doctor' && user.doctorId && selectedFilter === 'all') {
      onSelectFilter(user.doctorId);
    }
  }, [user, selectedFilter, onSelectFilter]);

  // ドクター別の統計データ計算
  const getDoctorStats = (docId: string) => {
    const docPatients = patients.filter((p) => p.assignedDoctorId === docId && !p.archived);
    const waitingDoctor = docPatients.filter((p) => p.status === 'waiting_doctor').length;
    const waitingStaff = docPatients.filter((p) => p.status === 'waiting_staff').length;
    const unread = docPatients.reduce((acc, p) => acc + (p.unreadCount || 0), 0);
    return {
      total: docPatients.length,
      waitingDoctor,
      waitingStaff,
      unread,
      patientsList: docPatients,
    };
  };

  const allActivePatients = patients.filter((p) => !p.archived);
  const totalWaitingDoctor = allActivePatients.filter((p) => p.status === 'waiting_doctor').length;

  return (
    <aside className="w-full lg:w-64 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-2 flex items-center gap-1.5">
          <Folder className="w-4 h-4 text-blue-600" />
          ドクター別患者ファイル
        </h3>

        {/* すべての患者 */}
        <button
          onClick={() => onSelectFilter('all')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
            selectedFilter === 'all'
              ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span>すべての患者</span>
          </div>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            {allActivePatients.length}
          </span>
        </button>

        {/* 回答待ち特設ボタン */}
        <button
          onClick={() => onSelectFilter('waiting_doctor')}
          className={`w-full flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-xs font-medium transition ${
            selectedFilter === 'waiting_doctor'
              ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
              : 'text-amber-800 hover:bg-amber-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>回答待ちの患者</span>
          </div>
          {totalWaitingDoctor > 0 ? (
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
              {totalWaitingDoctor}
            </span>
          ) : (
            <span className="text-slate-400">0</span>
          )}
        </button>

        {/* ドクターフォルダツリー */}
        <div className="mt-3 space-y-1">
          {doctors.map((doc) => {
            const stats = getDoctorStats(doc.id);
            const isSelected = selectedFilter === doc.id;
            const isAssignedDoctorUser = user?.role === 'doctor' && user?.doctorId === doc.id;

            return (
              <div key={doc.id} className="rounded-lg overflow-hidden border border-transparent">
                <button
                  onClick={() => onSelectFilter(doc.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs rounded-lg transition ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : isAssignedDoctorUser
                      ? 'bg-emerald-50 text-emerald-900 font-semibold border border-emerald-200 hover:bg-emerald-100'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserCheck className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">{doc.displayName}</span>
                    {isAssignedDoctorUser && (
                      <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1 rounded">担当</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {stats.waitingDoctor > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800'
                        }`}
                        title="回答待ち件数"
                      >
                        答{stats.waitingDoctor}
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {stats.total}
                    </span>
                  </div>
                </button>

                {/* 選択時・アコーディオン風の所属患者ツリー表示 */}
                {isSelected && stats.patientsList.length > 0 && (
                  <div className="bg-blue-50/50 py-1.5 pl-6 pr-2 space-y-1 text-xs border-l-2 border-blue-500 my-1 ml-3">
                    {stats.patientsList.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-slate-600 text-[11px] py-1 px-1 hover:text-blue-700"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-slate-500">{p.patientCode}</span>
                          <span className="font-medium truncate">{p.displayName}</span>
                        </div>
                        {p.status === 'waiting_doctor' && (
                          <span className="text-[9px] bg-amber-200 text-amber-800 px-1 rounded">回答待ち</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* 担当医未設定 */}
          {(() => {
            const unassignedStats = getDoctorStats('unassigned');
            const isSelected = selectedFilter === 'unassigned';
            return (
              <button
                onClick={() => onSelectFilter('unassigned')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition ${
                  isSelected
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>担当医未設定</span>
                </div>
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                  {unassignedStats.total}
                </span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* アーカイブ項目 */}
      <div className="pt-3 border-t border-slate-100">
        <button
          onClick={() => onSelectFilter('archived')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
            selectedFilter === 'archived'
              ? 'bg-slate-200 text-slate-800 font-bold'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <span>アーカイブ済み患者</span>
          <span className="text-slate-400">
            {patients.filter((p) => p.archived).length}
          </span>
        </button>
      </div>

      {/* 方式B: 専用ポータル直接リンク集 */}
      <div className="pt-3 border-t border-slate-100 space-y-1.5">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 text-blue-600" />
          <span>役職・医師専用ポータルURL</span>
        </h4>
        <div className="space-y-1 text-[11px]">
          <Link
            to="/admin"
            className="flex items-center justify-between p-1.5 rounded hover:bg-red-50 text-slate-700 hover:text-red-700 transition"
            title="管理者用ポータル直リンク"
          >
            <span className="font-semibold">👑 管理者ポータル</span>
            <span className="font-mono text-[10px] text-slate-400">/admin</span>
          </Link>
          <Link
            to="/doctor/shirao"
            className="flex items-center justify-between p-1.5 rounded hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition"
            title="白尾医師専用ポータル"
          >
            <span className="font-semibold">🩺 白尾医師ポータル</span>
            <span className="font-mono text-[10px] text-slate-400">/doctor/shirao</span>
          </Link>
          <Link
            to="/doctor/fukaya"
            className="flex items-center justify-between p-1.5 rounded hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition"
            title="深谷医師専用ポータル"
          >
            <span className="font-semibold">🩺 深谷医師ポータル</span>
            <span className="font-mono text-[10px] text-slate-400">/doctor/fukaya</span>
          </Link>
          <Link
            to="/doctor/okada"
            className="flex items-center justify-between p-1.5 rounded hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition"
            title="岡田医師専用ポータル"
          >
            <span className="font-semibold">🩺 岡田医師ポータル</span>
            <span className="font-mono text-[10px] text-slate-400">/doctor/okada</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
