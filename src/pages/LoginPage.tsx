import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, switchUser, availableTestUsers } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: (typeof availableTestUsers)[0]) => {
    switchUser(user);
    navigate('/');
  };

  const ROLE_CONFIG: Record<UserRole, { label: string; badge: string }> = {
    admin: { label: '施設管理者', badge: 'bg-red-100 text-red-800 border-red-200' },
    staff: { label: '医療スタッフ', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
    doctor: { label: '担当ドクター', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-blue-600 rounded-2xl text-white shadow-lg mb-4">
          <Stethoscope className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          ドクター相談会フォローアップ
        </h1>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          ドクター・スタッフ間 経過共有・意思決定サポートシステム
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                メールアドレス
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scc@nittai.ac.jp"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                パスワード
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
            >
              {loading ? 'ログイン処理中...' : 'ログイン'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 公式アカウント一覧＆ワンクリックテストログイン */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>公式アカウント一覧 (ID & パスワード)</span>
              </div>
              <span className="text-[10px] text-slate-400">クリックで直接ログイン可</span>
            </div>
            <div className="space-y-2">
              {[
                { email: 'scc@nittai.ac.jp', pass: 'scc62625353' },
                { email: 'shirao@nittai.ac.jp', pass: 'shirao1000' },
                { email: 'fukaya@nittai.ac.jp', pass: 'fukaya2000' },
                { email: 'okada@nittai.ac.jp', pass: 'okada3000' },
              ].map((acc) => {
                const u = availableTestUsers.find((tu) => tu.email === acc.email);
                if (!u) return null;
                return (
                  <button
                    key={u.uid}
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.pass);
                      handleQuickLogin(u);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition text-left group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 flex items-center gap-2">
                        <span>{u.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">パスワード: {acc.pass}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {u.email}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${ROLE_CONFIG[u.role].badge}`}>
                      {ROLE_CONFIG[u.role].label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          ※第一段階試作版のため実在する患者個人情報は入力しないでください。
        </p>
      </div>
    </div>
  );
};
