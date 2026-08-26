import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardPage } from './DashboardPage';

const DOCTOR_MAP: Record<string, { id: string; name: string; email: string }> = {
  shirao: { id: 'doc-shirao', name: '白尾医師', email: 'shirao@example.com' },
  'doc-shirao': { id: 'doc-shirao', name: '白尾医師', email: 'shirao@example.com' },
  fukaya: { id: 'doc-fukaya', name: '深谷医師', email: 'fukaya@example.com' },
  'doc-fukaya': { id: 'doc-fukaya', name: '深谷医師', email: 'fukaya@example.com' },
  okada: { id: 'doc-okada', name: '岡田医師', email: 'okada@example.com' },
  'doc-okada': { id: 'doc-okada', name: '岡田医師', email: 'okada@example.com' },
};

export const PortalPage: React.FC = () => {
  const { docSlug } = useParams<{ docSlug?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, switchUser, availableTestUsers } = useAuth();
  const [initialized, setInitialized] = useState(false);

  const isAdminPortal = location.pathname.startsWith('/admin');
  const targetDoc = docSlug ? DOCTOR_MAP[docSlug.toLowerCase()] : null;

  useEffect(() => {
    // ログイン中のドクターアカウントが他の医師や管理者ポータルに切り替えるのを禁止
    if (user?.role === 'doctor') {
      if (isAdminPortal || (targetDoc && targetDoc.id !== user.doctorId)) {
        alert('他の医師または管理者ポータルへのアカウント切り替え権限がありません。');
        const myDocSlug = user.doctorId?.replace('doc-', '') || 'shirao';
        navigate(`/doctor/${myDocSlug}`, { replace: true });
        return;
      }
    }

    if (isAdminPortal) {
      const adminUser = availableTestUsers.find((u) => u.role === 'admin');
      if (adminUser && user?.uid !== adminUser.uid) {
        switchUser(adminUser);
      }
    } else if (targetDoc) {
      const docUser = availableTestUsers.find((u) => u.doctorId === targetDoc.id);
      if (docUser && user?.uid !== docUser.uid) {
        switchUser(docUser);
      }
    }
    setInitialized(true);
  }, [isAdminPortal, targetDoc, availableTestUsers, switchUser, user, navigate]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold text-sm">
        ポータル読込中...
      </div>
    );
  }

  // URLのリダイレクト消去を行わずに直接ダッシュボードを表示（リロード時も /admin や /doctor/shirao がアドレスバーに保持される）
  return <DashboardPage />;
};
