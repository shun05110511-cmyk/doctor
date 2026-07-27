import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const SafetyNotice: React.FC = () => {
  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-3 sm:p-4 rounded-r-md text-amber-900 text-xs sm:text-sm flex items-start gap-2.5 my-3 shadow-sm">
      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <span className="font-bold block text-amber-950 mb-0.5">【注意】緊急連絡について</span>
        本システムは緊急連絡には使用できません。患者の症状急変など緊急性がある場合は、施設で定められた電話や緊急呼出等、指定の連絡方法を使用してください。
      </div>
    </div>
  );
};
