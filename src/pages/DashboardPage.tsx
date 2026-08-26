import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePatients } from '../context/PatientContext';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { PatientModal } from '../components/PatientModal';
import {
  Users,
  AlertCircle,
  Clock,
  Activity,
  CheckCircle2,
  UserPlus,
  Stethoscope,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import type { TimelineItem } from '../types';

export const DashboardPage: React.FC = () => {
  const { patients, doctors, getTimeline } = usePatients();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentPosts, setRecentPosts] = useState<{ patientId: string; patientCode: string; patientName: string; item: TimelineItem }[]>([]);

  // 最新投稿の収集
  useEffect(() => {
    let isMounted = true;
    const fetchRecent = async () => {
      const activePatients = patients.filter((p) => !p.archived);
      const allPosts: { patientId: string; patientCode: string; patientName: string; item: TimelineItem }[] = [];
      for (const p of activePatients) {
        const items = await getTimeline(p.id);
        for (const item of items) {
          allPosts.push({
            patientId: p.id,
            patientCode: p.patientCode,
            patientName: p.displayName,
            item,
          });
        }
      }
      // 日時降順ソート
      allPosts.sort(
        (a, b) =>
          new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime()
      );
      if (isMounted) {
        setRecentPosts(allPosts.slice(0, 5));
      }
    };
    fetchRecent();
    return () => {
      isMounted = false;
    };
  }, [patients, getTimeline]);

  // 全体集計データ
  const activePatients = patients.filter((p) => !p.archived);
  const totalCount = activePatients.length;
  const waitingDoctorCount = activePatients.filter((p) => p.status === 'waiting_doctor').length;
  const waitingStaffCount = activePatients.filter((p) => p.status === 'waiting_staff').length;
  const inProgressCount = activePatients.filter((p) => p.status === 'in_progress').length;
  const completedCount = activePatients.filter((p) => p.status === 'completed').length;

  // 最近更新された患者（上位5件）
  const recentUpdatedPatients = [...activePatients]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <Layout>
      <div className="space-y-6">
        {/* ウェルカム & 操作ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span>ダッシュボード</span>
              {user?.role === 'doctor' && (
                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                  {user.displayName} (担当患者ビュー)
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              相談会参加患者のフォローアップ進捗状況を一元管理します。
            </p>
          </div>
          {user?.role !== 'doctor' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-lg transition shadow-sm self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>患者を新規登録</span>
            </button>
          )}
        </div>

        {/* サマリーカード一覧 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">登録患者数</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalCount}</div>
            <span className="text-[10px] text-slate-400">現在管理中の全患者</span>
          </div>

          <button
            onClick={() => navigate('/patients?filter=waiting_doctor')}
            className="bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 p-4 rounded-xl shadow-sm text-left transition group"
          >
            <div className="flex items-center justify-between text-amber-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider group-hover:underline">
                ドクター回答待ち
              </span>
              <AlertCircle className="w-4 h-4 text-amber-600 animate-bounce" />
            </div>
            <div className="text-2xl font-black text-amber-900">{waitingDoctorCount}</div>
            <span className="text-[10px] text-amber-700 font-medium">クリックで該当一覧表示</span>
          </button>

          <button
            onClick={() => navigate('/patients?filter=waiting_staff')}
            className="bg-purple-50 hover:bg-purple-100 border border-purple-200 p-4 rounded-xl shadow-sm text-left transition group"
          >
            <div className="flex items-center justify-between text-purple-800 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider group-hover:underline">
                スタッフ確認待ち
              </span>
              <Clock className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-900">{waitingStaffCount}</div>
            <span className="text-[10px] text-purple-700 font-medium">回答確認・対応準備</span>
          </button>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">対応中</span>
              <Activity className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-black text-sky-900">{inProgressCount}</div>
            <span className="text-[10px] text-slate-400">継続的な経過観察・対応</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">対応完了</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900">{completedCount}</div>
            <span className="text-[10px] text-slate-400">経過観察完了</span>
          </div>
        </div>

        {/* ドクターごとの患者ファイル集計テーブル (管理者権限のみ表示) */}
        {user?.role === 'admin' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span>ドクター別患者ファイル状況</span>
              </h2>
              <span className="text-xs text-slate-500">行をクリックすると該当ドクターの患者一覧へ移動します</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">担当ドクター</th>
                    <th className="py-3 px-4 text-center">担当患者数</th>
                    <th className="py-3 px-4 text-center">回答待ち</th>
                    <th className="py-3 px-4 text-center">確認待ち</th>
                    <th className="py-3 px-4 text-center">対応中</th>
                    <th className="py-3 px-4 text-center">対応完了</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {doctors.map((doc) => {
                    const docPts = activePatients.filter((p) => p.assignedDoctorId === doc.id);
                    const wDoc = docPts.filter((p) => p.status === 'waiting_doctor').length;
                    const wStaff = docPts.filter((p) => p.status === 'waiting_staff').length;
                    const inProg = docPts.filter((p) => p.status === 'in_progress').length;
                    const comp = docPts.filter((p) => p.status === 'completed').length;

                    return (
                      <tr
                        key={doc.id}
                        onClick={() => navigate(`/patients?filter=${doc.id}`)}
                        className="hover:bg-blue-50/50 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {doc.displayName}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{docPts.length}名</td>
                        <td className="py-3 px-4 text-center">
                          {wDoc > 0 ? (
                            <span className="inline-block bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full text-xs animate-pulse">
                              {wDoc}件
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {wStaff > 0 ? (
                            <span className="inline-block bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full text-xs">
                              {wStaff}件
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">{inProg}件</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">{comp}件</td>
                        <td className="py-3 px-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                        </td>
                      </tr>
                    );
                  })}

                  {/* 担当医未設定行 */}
                  {(() => {
                    const unassignedPts = activePatients.filter((p) => p.assignedDoctorId === 'unassigned');
                    const wDoc = unassignedPts.filter((p) => p.status === 'waiting_doctor').length;
                    const wStaff = unassignedPts.filter((p) => p.status === 'waiting_staff').length;
                    const inProg = unassignedPts.filter((p) => p.status === 'in_progress').length;
                    const comp = unassignedPts.filter((p) => p.status === 'completed').length;

                    return (
                      <tr
                        onClick={() => navigate('/patients?filter=unassigned')}
                        className="hover:bg-slate-100 cursor-pointer transition text-slate-500 bg-slate-50/50"
                      >
                        <td className="py-3 px-4 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          担当医未設定
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{unassignedPts.length}名</td>
                        <td className="py-3 px-4 text-center">{wDoc > 0 ? `${wDoc}件` : '0'}</td>
                        <td className="py-3 px-4 text-center">{wStaff > 0 ? `${wStaff}件` : '0'}</td>
                        <td className="py-3 px-4 text-center">{inProg}件</td>
                        <td className="py-3 px-4 text-center">{comp}件</td>
                        <td className="py-3 px-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 下部 2カラム: 最近更新された患者 & 最新投稿 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近更新された患者 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>最近更新された患者</span>
              </h2>
              <Link to="/patients" className="text-xs text-blue-600 hover:underline font-semibold">
                すべて見る &rarr;
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recentUpdatedPatients.map((p) => (
                <Link
                  key={p.id}
                  to={`/patients/${p.id}`}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg transition"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {p.patientCode}
                      </span>
                      <span>{p.displayName}</span>
                      <span className="text-slate-400 text-[11px] font-normal">
                        ({p.assignedDoctorName})
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                      {p.chiefComplaint}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={p.status} size="sm" />
                    <span className="text-[10px] text-slate-400">
                      {new Date(p.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* 最新の投稿タイムライン */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>最近の投稿</span>
              </h2>
            </div>
            <div className="space-y-3">
              {recentPosts.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">投稿履歴がありません</div>
              ) : (
                recentPosts.map(({ patientId, patientCode, patientName, item }) => (
                  <Link
                    key={item.id}
                    to={`/patients/${patientId}`}
                    className="block bg-slate-50 hover:bg-blue-50/60 p-3 rounded-lg border border-slate-200 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="font-mono text-blue-700">{patientCode}</span>
                        <span>{patientName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 bg-white p-2 rounded border border-slate-100 font-sans">
                      {item.body}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        投稿者: <strong className="text-slate-700">{item.authorName}</strong> ({item.authorRole})
                      </span>
                      {item.requiresResponse && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 rounded">
                          要回答
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 新規登録モーダル */}
      <PatientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  );
};
