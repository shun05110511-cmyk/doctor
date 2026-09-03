import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { DoctorSidebar } from '../components/DoctorSidebar';
import { StatusBadge, STATUS_CONFIG } from '../components/StatusBadge';
import { PatientModal } from '../components/PatientModal';
import { Search, UserPlus, Filter, Calendar, Stethoscope, ChevronRight, AlertCircle, MessageSquare, RotateCcw, CheckCircle2 } from 'lucide-react';


export const PatientListPage: React.FC = () => {
  const { patients, doctors, updatePatientStatus } = usePatients();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // クエリパラメータからの初期フィルター読み込み
  const queryParams = new URLSearchParams(location.search);
  const initialFilter = queryParams.get('filter') || 'all';

  const [selectedDocFilter, setSelectedDocFilter] = useState<string>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [onlyWaitingDoctor, setOnlyWaitingDoctor] = useState(false);
  const [excludeCompleted, setExcludeCompleted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const filter = new URLSearchParams(location.search).get('filter');
    if (filter) {
      setSelectedDocFilter(filter);
      if (filter === 'waiting_doctor') {
        setOnlyWaitingDoctor(true);
      }
    }
  }, [location.search]);

  // フィルタリング処理
  const filteredPatients = patients.filter((p) => {
    // アーカイブフィルタ
    if (selectedDocFilter === 'archived') {
      if (!p.archived) return false;
    } else {
      if (p.archived) return false;
    }

    // ドクター別フィルタ
    if (selectedDocFilter !== 'all' && selectedDocFilter !== 'waiting_doctor' && selectedDocFilter !== 'unassigned' && selectedDocFilter !== 'archived') {
      if (p.assignedDoctorId !== selectedDocFilter) return false;
    } else if (selectedDocFilter === 'unassigned') {
      if (p.assignedDoctorId !== 'unassigned') return false;
    }

    // 回答待ちトグル・フィルタ
    if (onlyWaitingDoctor || selectedDocFilter === 'waiting_doctor') {
      if (p.status !== 'waiting_doctor') return false;
    }

    // ステータスフィルタ
    if (selectedStatusFilter !== 'all') {
      if (p.status !== selectedStatusFilter) return false;
    }

    // 対応完了除外
    if (excludeCompleted && p.status === 'completed') {
      return false;
    }

    // キーワード検索（IDまたは仮名）
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCode = p.patientCode.toLowerCase().includes(q);
      const matchName = p.displayName.toLowerCase().includes(q);
      const matchComplaint = p.chiefComplaint.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchComplaint) return false;
    }

    return true;
  });

  // 現在選択中のドクター名
  const currentDocObj = doctors.find((d) => d.id === selectedDocFilter);
  const currentDocTitle =
    selectedDocFilter === 'all'
      ? 'すべての患者'
      : selectedDocFilter === 'waiting_doctor'
      ? 'ドクター回答待ちの患者'
      : selectedDocFilter === 'unassigned'
      ? '担当医未設定の患者'
      : selectedDocFilter === 'archived'
      ? 'アーカイブ済み患者'
      : currentDocObj
      ? `${currentDocObj.displayName} の担当患者`
      : '患者一覧';

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左側: ドクター別患者ファイルナビゲーション */}
        <DoctorSidebar
          selectedFilter={selectedDocFilter}
          onSelectFilter={(filterId) => {
            setSelectedDocFilter(filterId);
            if (filterId === 'waiting_doctor') {
              setOnlyWaitingDoctor(true);
            } else {
              setOnlyWaitingDoctor(false);
            }
          }}
        />

        {/* 右側: メイン患者一覧表示領域 */}
        <div className="flex-1 space-y-4">
          {/* ヘッダータイトル & 新規登録ボタン */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{currentDocTitle}</span>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  {filteredPatients.length}件
                </span>
              </h1>
            </div>
            {user?.role !== 'doctor' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shadow-sm self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>新規患者登録</span>
              </button>
            )}
          </div>

          {/* 検索・詳細フィルターバー */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* キーワード検索 */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="患者ID・仮名・相談内容で検索..."
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* ステータスドロップダウン */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="all">すべてのステータス</option>
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* チェックボックスフィルター */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700 sm:col-span-2 lg:col-span-1">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyWaitingDoctor}
                    onChange={(e) => setOnlyWaitingDoctor(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-amber-800 font-bold">回答待ちのみ</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={excludeCompleted}
                    onChange={(e) => setExcludeCompleted(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>完了を除外</span>
                </label>
              </div>
            </div>
          </div>

          {/* 患者カードリスト */}
          {filteredPatients.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              該当する患者情報が見つかりませんでした。条件を変更して再検索してください。
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className="bg-white hover:bg-blue-50/40 rounded-xl border border-slate-200 p-4 shadow-sm transition cursor-pointer hover:border-blue-300 group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* 左側: 基本識別情報 */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {p.patientCode}
                        </span>
                        <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition">
                          {p.displayName}
                        </h2>
                        <StatusBadge status={p.status} size="sm" />
                        {p.age && (
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            {p.age}
                          </span>
                        )}
                        {p.gender && (
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            {p.gender}
                          </span>
                        )}
                        {p.unreadCount !== undefined && p.unreadCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                            <MessageSquare className="w-3 h-3" />
                            未確認{p.unreadCount}件
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                        主訴: {p.chiefComplaint}
                      </p>

                      {p.medicalHistory && (
                        <p className="text-xs text-amber-900 bg-amber-50/70 px-2 py-0.5 rounded border border-amber-200/80 line-clamp-1">
                          🏥 既往歴: {p.medicalHistory}
                        </p>
                      )}

                      {p.doctorAssessment && (
                        <p className="text-xs text-blue-900 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-200/70 line-clamp-1">
                          🩺 所見: {p.doctorAssessment}
                        </p>
                      )}
                    </div>

                    {/* 右側: 担当医 & 日付 & 終了操作 & 遷移矢印 */}
                    <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 text-xs text-slate-500 flex-wrap">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-slate-700 font-semibold justify-end">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                          <span>{p.assignedDoctorName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 justify-end mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>相談日: {p.consultationDate}</span>
                        </div>
                      </div>

                      {/* 終了・戻すクイック操作ボタン */}
                      {p.status === 'completed' ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`患者「${p.displayName} (${p.patientCode})」の経過観察・対応を再開（終了から戻す）しますか？`)) {
                              await updatePatientStatus(p.id, 'observing');
                            }
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                          title="終了から戻す（経過観察再開）"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-700" />
                          <span>終了から戻す</span>
                        </button>
                      ) : (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`患者「${p.displayName} (${p.patientCode})」の経過観察・対応を終了にしますか？\n（データは保存され、いつでも「終了から戻す」ことができます）`)) {
                              await updatePatientStatus(p.id, 'completed');
                            }
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                          title="経過観察・対応を終了にする"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>終了にする</span>
                        </button>
                      )}

                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  );
};
