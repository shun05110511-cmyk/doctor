import React from 'react';
import { Navbar } from './Navbar';
import { SafetyNotice } from './SafetyNotice';

interface Props {
  children: React.ReactNode;
  showSafetyNotice?: boolean;
}

export const Layout: React.FC<Props> = ({ children, showSafetyNotice = true }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showSafetyNotice && <SafetyNotice />}
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          ドクター相談会フォローアップ管理システム &copy; 2026 | 試作版 (関係者専用・架空サンプルデータのみ使用)
        </div>
      </footer>
    </div>
  );
};
