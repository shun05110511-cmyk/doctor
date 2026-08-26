import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import { Stethoscope } from 'lucide-react';

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

  const isAdminPortal = location.pathname.startsWith('/admin');
  const targetDoc = docSlug ? DOCTOR_MAP[docSlug.toLowerCase()] : null;

  useEffect(() => {
    // ログイン中のドクターアカウントが他の医師や管理者ポータルに切り替えるのを禁止
    if (user?.role === 'doctor') {
      if (isAdminPortal || (targetDoc && targetDoc.id !== user.doctorId)) {
        alert('他の医師または管理者ポータルへのアカウント切り替え権限がありません。');
        navigate(`/patients?filter=${user.doctorId}`, { replace: true });
        return;
      }
    }

    if (isAdminPortal) {
      const adminUser = availableTestUsers.find((u) => u.role === 'admin');
      if (adminUser) {
        switchUser(adminUser);
        navigate('/', { replace: true });
      }
    } else if (targetDoc) {
      const docUser = availableTestUsers.find((u) => u.doctorId === targetDoc.id);
      if (docUser) {
        switchUser(docUser);
        navigate(`/patients?filter=${targetDoc.id}`, { replace: true });
      }
    }
  }, [isAdminPortal, targetDoc, availableTestUsers, switchUser, user, navigate]);

  return (
    <Layout>
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {isAdminPortal
            ? '👑 管理者ポータルへ移動中...'
            : targetDoc
            ? `🩺 ${targetDoc.name} 専用ポータルへ移動中...`
            : 'ポータル移動中...'}
        </h1>
        <p className="text-xs text-slate-500">
          アクセス権限を確認して専用ポータルへ移動しています。少々お待ちください。
        </p>
      </div>
    </Layout>
  );
};
