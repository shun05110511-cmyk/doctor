import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { StatusBadge, STATUS_CONFIG } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { PatientModal } from '../components/PatientModal';
import {
  Stethoscope,
  Calendar,
  User,
  Clock,
  Send,
  CheckCircle2,
  Edit,
  ArrowLeft,
  AlertCircle,
  FileText,
  UserCheck,
  Archive,
  Trash2,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import type { Patient, TimelineItem, TimelineItemType, PriorityLevel, PatientStatus } from '../types';

const TIMELINE_TYPE_CONFIG: Record<
  TimelineItemType,
  { label: string; bg: string; text: string; icon: string }
> = {
  progress_report: { label: '経過報告', bg: 'bg-blue-100', text: 'text-blue-800', icon: '📝' },
  doctor_question: { label: 'ドクターへの確認依頼', bg: 'bg-amber-100', text: 'text-amber-900', icon: '❓' },
  doctor_response: { label: 'ドクターからの回答', bg: 'bg-emerald-100', text: 'text-emerald-900', icon: '🩺' },
  action_record: { label: '対応記録', bg: 'bg-purple-100', text: 'text-purple-800', icon: '✅' },
  other: { label: 'その他の連絡', bg: 'bg-slate-100', text: 'text-slate-800', icon: '💬' },
};

export const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    patients,
    doctors,
    updatePatientDoctor,
    updatePatientStatus,
    archivePatient,
    deletePatient,
    getTimeline,
    addTimelineItem,
    toggleConfirm,
  } = usePatients();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isChangingDoctor, setIsChangingDoctor] = useState(false);

  // フォーム用State
  const [postType, setPostType] = useState<TimelineItemType>('progress_report');
  const [postBody, setPostBody] = useState('');
  const [requiresResponse, setRequiresResponse] = useState(false);
  const [priority, setPriority] = useState<PriorityLevel>('normal');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [postError, setPostError] = useState('');

  // 該当患者データの特定
  useEffect(() => {
    if (id) {
      const found = patients.find((p) => p.id === id);
      if (found) {
        setPatient(found);
      }
    }
  }, [id, patients]);

  // タイムラインの取得
  const loadTimelineData = async () => {
    if (id) {
      const items = await getTimeline(id);
      setTimeline(items);
    }
  };

  useEffect(() => {
    loadTimelineData();
  }, [id]);

  // ドクターロールの場合、投稿種別初期値を自動選択（ドクター回答）
  useEffect(() => {
    if (user?.role === 'doctor') {
      setPostType('doctor_response');
    }
  }, [user]);

  if (!patient) {
    return (
      <Layout>
        <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          指定された患者情報が見つかりません。
          <div className="mt-4">
            <Link to="/patients" className="text-blue-600 font-bold hover:underline">
              &larr; 患者一覧へ戻る
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // 担当ドクター変更処理（管理者）
  const handleDoctorChange = async (newDocId: string) => {
    const docObj = doctors.find((d) => d.id === newDocId);
    const docName = newDocId === 'unassigned' ? '担当医未設定' : docObj?.displayName || '担当医未設定';
    await updatePatientDoctor(patient.id, newDocId, docName);
    setIsChangingDoctor(false);
  };

  // 経過観察・対応終了および再開（元に戻す）トグル
  const handleToggleComplete = async () => {
    if (!patient || !user) return;

    if (patient.status === 'completed') {
      // 終了から戻す（再開）
      if (
        window.confirm(
          `患者「${patient.displayName} (${patient.patientCode})」の経過観察・対応を再開（終了から戻す）しますか？`
        )
      ) {
        await updatePatientStatus(patient.id, 'observing');
        await addTimelineItem(
          patient.id,
          {
            type: 'action_record',
            body: '【対応再開】経過観察・対応が再開されました。',
            authorId: user.uid,
            authorName: user.displayName,
            authorRole: user.role,
            requiresResponse: false,
            priority: 'normal',
          },
          'observing'
        );
        await loadTimelineData();
      }
    } else {
      // 経過観察・対応を終了する
      if (
        window.confirm(
          `患者「${patient.displayName} (${patient.patientCode})」の経過観察・対応を終了にしますか？\n※データは削除されず保管され、いつでも「終了から戻す」ことができます。`
        )
      ) {
        await updatePatientStatus(patient.id, 'completed');
        await addTimelineItem(
          patient.id,
          {
            type: 'action_record',
            body: '【経過観察・対応終了】経過観察およびフォローアップ対応を終了しました。（データは保管されています）',
            authorId: user.uid,
            authorName: user.displayName,
            authorRole: user.role,
            requiresResponse: false,
            priority: 'normal',
          },
          'completed'
        );
        await loadTimelineData();
      }
    }
  };

  // ステータス直接変更
  const handleStatusChange = async (newStatus: PatientStatus) => {
    await updatePatientStatus(patient.id, newStatus);
  };

  // アーカイブ処理
  const handleArchive = async () => {
    if (window.confirm(`患者「${patient.displayName} (${patient.patientCode})」をアーカイブしますか？`)) {
      await archivePatient(patient.id);
      navigate('/patients');
    }
  };

  // 完全削除処理（管理者限定）
  const handleDelete = async () => {
    if (
      window.confirm(
        `【警告】患者「${patient.displayName} (${patient.patientCode})」をデータベースから完全削除します。\nこの操作は取り消せません。本当に削除しますか？`
      )
    ) {
      await deletePatient(patient.id);
      navigate('/patients');
    }
  };

  // 新規投稿送信
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError('');
    if (!postBody.trim()) {
      setPostError('投稿本文を入力してください。');
      return;
    }
    if (!user) return;

    setSubmittingPost(true);
    try {
      await addTimelineItem(
        patient.id,
        {
          type: postType,
          body: postBody.trim(),
          authorId: user.uid,
          authorName: user.displayName,
          authorRole: user.role,
          requiresResponse: postType === 'doctor_question' ? true : requiresResponse,
          priority,
        },
        patient.status
      );

      setPostBody('');
      setRequiresResponse(false);
      setPriority('normal');
      await loadTimelineData();
    } catch (err: any) {
      setPostError(err.message || '投稿に失敗しました。');
    } finally {
      setSubmittingPost(false);
    }
  };

  // 確認ボタンクリック
  const handleToggleConfirm = async (timelineId: string) => {
    const updated = await toggleConfirm(patient.id, timelineId);
    setTimeline(updated);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* ナビリンク & 操作バー */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Link
            to="/patients"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>患者一覧に戻る</span>
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 経過観察終了 / 戻す ボタン (医師および管理者が利用可能) */}
            {patient.status === 'completed' ? (
              <button
                onClick={handleToggleComplete}
                className="inline-flex items-center gap-1.5 text-xs bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                title="経過観察・対応を再開してアクティブに戻します"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>終了から戻す (対応再開)</span>
              </button>
            ) : (
              <button
                onClick={handleToggleComplete}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700 px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                title="経過観察・対応を完了して終了状態にします（データは保管されます）"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>経過観察・対応を終了する</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <>
                <button
                  onClick={handleArchive}
                  className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-300 px-3 py-1.5 rounded-lg transition"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>アーカイブ</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg font-bold transition shadow-sm"
                  title="データベースから完全削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>完全削除</span>
                </button>
              </>
            )}
            {user?.role !== 'doctor' && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg font-bold transition shadow-sm"
              >
                <Edit className="w-3.5 h-3.5 text-blue-600" />
                <span>患者情報を編集</span>
              </button>
            )}
          </div>
        </div>

        {/* 患者ヘッダーカード */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-start gap-3">
              <span className="font-mono text-base font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                {patient.patientCode}
              </span>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3 flex-wrap">
                  <span>{patient.displayName}</span>
                  <StatusBadge status={patient.status} size="lg" />
                </h1>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {patient.age && (
                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded border border-slate-200">
                      年齢: {patient.age}
                    </span>
                  )}
                  {patient.gender && (
                    <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded border border-slate-200">
                      性別: {patient.gender}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    相談日: {patient.consultationDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    最終更新: {new Date(patient.updatedAt).toLocaleString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>

            {/* 担当ドクター表示 & 変更エリア (要件) */}
            <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
                    担当ドクター
                  </div>
                  {isChangingDoctor ? (
                    <select
                      value={patient.assignedDoctorId}
                      onChange={(e) => handleDoctorChange(e.target.value)}
                      className="text-xs font-bold bg-white border border-blue-400 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.displayName}
                        </option>
                      ))}
                      <option value="unassigned">担当医未設定</option>
                    </select>
                  ) : (
                    <Link
                      to={`/patients?filter=${patient.assignedDoctorId}`}
                      className="text-sm font-bold text-blue-900 hover:underline flex items-center gap-1"
                      title="このドクターの担当患者一覧を表示"
                    >
                      <span>{patient.assignedDoctorName}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* 管理者の場合は担当医変更ボタン */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => setIsChangingDoctor(!isChangingDoctor)}
                  className="text-xs text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 px-2 py-1 rounded font-semibold transition"
                >
                  {isChangingDoctor ? '完了' : '担当医変更'}
                </button>
              )}
            </div>
          </div>

          {/* ステータス直接変更・ドロップダウン */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg text-xs">
            <span className="font-bold text-slate-700">対応ステータスの変更:</span>
            <select
              value={patient.status}
              onChange={(e) => handleStatusChange(e.target.value as PatientStatus)}
              className="bg-white border border-slate-300 font-semibold text-slate-800 rounded px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 相談会情報カード */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>カルテ・相談内容・所見</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-800 block mb-1">主訴・相談内容</span>
              <p className="text-slate-900 font-medium whitespace-pre-wrap">{patient.chiefComplaint}</p>
              {patient.consultationDetails && (
                <p className="text-slate-600 mt-2 text-xs border-t border-slate-200 pt-2">
                  {patient.consultationDetails}
                </p>
              )}
            </div>

            {/* 既往歴 */}
            <div className="bg-amber-50/60 p-3.5 rounded-lg border border-amber-200">
              <span className="font-bold text-amber-900 block mb-1">🏥 既往歴</span>
              <p className="text-slate-800 whitespace-pre-wrap">
                {patient.medicalHistory || '（記録なし）'}
              </p>
            </div>

            {/* 事前評価所見 (スタッフ評価) */}
            <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-emerald-950 block mb-1">📋 事前評価所見 (参加スクリーニング・スタッフ評価)</span>
              <p className="text-slate-900 whitespace-pre-wrap font-medium">
                {patient.preConsultationAssessment || '（記録なし）'}
              </p>
            </div>

            {/* ドクター所見 (医師診察・評価) */}
            <div className="bg-blue-50/70 p-3.5 rounded-lg border border-blue-200">
              <span className="font-bold text-blue-950 block mb-1">🩺 ドクター所見 (医師診察・評価)</span>
              <p className="text-slate-900 whitespace-pre-wrap font-medium">
                {patient.doctorAssessment || '（記録なし）'}
              </p>
            </div>

            <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100">
              <span className="font-bold text-emerald-900 block mb-1">ドクターの助言</span>
              <p className="text-slate-800 whitespace-pre-wrap">
                {patient.doctorAdvice || '（記録なし）'}
              </p>
            </div>

            <div className="bg-purple-50/50 p-3.5 rounded-lg border border-purple-100">
              <span className="font-bold text-purple-900 block mb-1">今後の対応方針</span>
              <p className="text-slate-800 whitespace-pre-wrap">
                {patient.followUpPlan || '（未設定）'}
              </p>
            </div>
          </div>
        </div>

        {/* 経過共有タイムライン & 新規投稿 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <span>経過共有タイムライン</span>
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              全{timeline.length}件の記録
            </span>
          </div>

          {/* 新規投稿追加フォーム */}
          <form onSubmit={handlePostSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                新しい経過・確認事項を投稿
              </span>
              <span className="text-[11px] text-slate-500">
                投稿者: <strong className="text-slate-800">{user?.displayName}</strong> ({user?.role})
              </span>
            </div>

            {postError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {postError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">投稿種別</label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as TimelineItemType)}
                  className="w-full text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {user?.role === 'doctor' ? (
                    <>
                      <option value="doctor_response">🩺 ドクターからの回答</option>
                      <option value="other">💬 その他の連絡・追加助言</option>
                    </>
                  ) : (
                    <>
                      <option value="progress_report">📝 スタッフ経過報告</option>
                      <option value="doctor_question">❓ ドクターへの確認依頼 (自動で回答待ち化)</option>
                      <option value="action_record">✅ スタッフ対応記録</option>
                      <option value="other">💬 その他の連絡</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">緊急度</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full text-xs py-2 px-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">通常</option>
                  <option value="soon">早めに確認</option>
                  <option value="important">重要</option>
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={requiresResponse}
                    onChange={(e) => setRequiresResponse(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 w-4 h-4"
                  />
                  <span>返信・回答が必要</span>
                </label>
              </div>
            </div>

            <div>
              <textarea
                rows={3}
                value={postBody}
                onChange={(e) => setPostBody(e.target.value)}
                placeholder="患者の様子、スタッフからの質問、所見などを具体的にご記入ください..."
                className="w-full p-3 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingPost}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submittingPost ? '送信中...' : '投稿を送信'}</span>
              </button>
            </div>
          </form>

          {/* タイムラインリスト */}
          {timeline.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              まだ投稿はありません。上のフォームから最初の投稿を追加してください。
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
              {timeline.map((item) => {
                const typeCfg = TIMELINE_TYPE_CONFIG[item.type] || TIMELINE_TYPE_CONFIG.other;
                const isConfirmedByMe = item.confirmedBy?.some((c) => c.userId === user?.uid);

                return (
                  <div key={item.id} className="relative group">
                    {/* タイムラインの丸アイコン */}
                    <div className="absolute -left-[33px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center text-xs shadow-sm">
                      {typeCfg.icon}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5 hover:border-slate-300 transition">
                      {/* 上部ヘッダー */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeCfg.bg} ${typeCfg.text}`}>
                            {typeCfg.label}
                          </span>
                          <PriorityBadge priority={item.priority} />
                          {item.requiresResponse && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                              要回答
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleString('ja-JP')}
                        </div>
                      </div>

                      {/* 本文 */}
                      <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {item.body}
                      </p>

                      {/* フッター: 投稿者 & 確認済みトグル */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong className="text-slate-700">{item.authorName}</strong> ({item.authorRole})
                          </span>
                        </div>

                        {/* 確認済み機能 (要件) */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleConfirm(item.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                              isConfirmedByMe
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${isConfirmedByMe ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>{isConfirmedByMe ? '確認済み' : '確認する'}</span>
                          </button>

                          {item.confirmedBy && item.confirmedBy.length > 0 && (
                            <span className="text-[10px] text-slate-400" title={item.confirmedBy.map((c) => c.userName).join(', ')}>
                              確認者: {item.confirmedBy.map((c) => c.userName).join('・')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={patient}
      />
    </Layout>
  );
};
