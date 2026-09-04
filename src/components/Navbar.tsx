import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPortalPath } from '../services/authService';
import { Stethoscope, LogOut, User, ShieldCheck, ChevronDown, RefreshCw } from 'lucide-react';
import { DataSyncModal } from './DataSyncModal';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, { label: string; bg: string }> = {
  admin: { label: '管理者', bg: 'bg-red-100 text-red-800 border-red-200' },
  staff: { label: 'スタッフ', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
  doctor: { label: 'ドクター', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

export const Navbar: React.FC = () => {
  const { user, logout, switchUser, availableTestUsers } = useAuth();
  const navigate = useNavigate();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  const roleConfig = ROLE_LABELS[user.role] || ROLE_LABELS.staff;
  const portalPath = getPortalPath(user);

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* アプリ名・ロゴ */}
            <div className="flex items-center space-x-3">
              <Link to={portalPath} className="flex items-center gap-2 group">
                <div className="p-2 bg-blue-600 rounded-lg text-white group-hover:bg-blue-700 transition">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight block leading-tight">
                    ドクター相談会フォローアップ
                  </span>
                  <span className="text-xs text-slate-500 font-medium">関係者専用Web管理システム</span>
                </div>
              </Link>
            </div>

            {/* ナビゲーション & ユーザー情報 */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* 他デバイスデータ同期・バックアップ ボタン */}
              <button
                onClick={() => setShowSyncModal(true)}
                className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-md border border-emerald-300 transition shadow-sm"
                title="スマホや他PC間でのデータ共有・バックアップ"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">データ同期・バックアップ</span>
              </button>

              {/* 試作版・動作確認用 テストユーザー迅速切替 (管理者のみ利用可能) */}
              {user.role === 'admin' && (
                <div className="relative">
                  <button
                    onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                    className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-md border border-slate-300 transition"
                    title="管理者権限によるアカウント切り替え"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">アカウント切り替え</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>

                  {showSwitchMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-50">
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        管理者用アカウント切替メニュー
                      </div>
                      {availableTestUsers.map((tu) => (
                        <button
                          key={tu.uid}
                          onClick={() => {
                            switchUser(tu);
                            setShowSwitchMenu(false);
                            navigate(getPortalPath(tu));
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                            tu.uid === user.uid ? 'bg-blue-50 font-bold text-blue-700' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="block font-medium">{tu.displayName}</span>
                            <span className="text-[10px] text-slate-400">{tu.email}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] border ${ROLE_LABELS[tu.role].bg}`}>
                            {ROLE_LABELS[tu.role].label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ユーザープロファイル */}
              <div className="hidden md:flex items-center space-x-2 border-l border-slate-200 pl-4">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left text-xs">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    {user.displayName}
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${roleConfig.bg}`}>
                      {roleConfig.label}
                    </span>
                  </div>
                  <div className="text-slate-400 truncate max-w-[120px]">{user.email}</div>
                </div>
              </div>

              {/* ログアウトボタン */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-red-200 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <DataSyncModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </>
  );
};
