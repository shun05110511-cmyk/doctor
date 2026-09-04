import React, { useState } from 'react';
import { exportAllDataJson, importAllDataJson } from '../services/patientService';
import { usePatients } from '../context/PatientContext';
import { X, Download, Upload, RefreshCw, Smartphone, AlertCircle, CheckCircle, Database } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSyncModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { refreshPatients } = usePatients();
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  // データファイルのエクスポート（ダウンロード）
  const handleExport = () => {
    try {
      const jsonStr = exportAllDataJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctor_followup_data_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        text: '全患者データをダウンロードしました。他端末の「インポート」からこのファイルを取り込んでください。',
        type: 'success',
      });
    } catch (e: any) {
      setMessage({ text: 'データの出力に失敗しました: ' + e.message, type: 'error' });
    }
  };

  // データファイルのインポート（アップロード）
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = importAllDataJson(content);
        await refreshPatients();
        setMessage({
          text: `データ移行完了！${res.patientCount}件の患者情報をこのデバイスに反映しました。`,
          type: 'success',
        });
      } catch (err: any) {
        setMessage({ text: 'インポート失敗: ' + err.message, type: 'error' });
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* ヘッダー */}
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <span>他デバイス連携・データ同期 / バックアップ</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容エリア */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* 原因解説ボックス */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <span>なぜ他デバイス（スマホ・PC）で見られないのか？</span>
            </div>
            <p className="text-slate-700 text-xs leading-relaxed">
              現在、本アプリはセキュリティおよび動作検証のため、各デバイス（パソコン・スマホ）のブラウザ内（ローカルストレージ）にデータを安全に保持する仕様となっております。
            </p>
            <p className="text-slate-700 text-xs leading-relaxed">
              以下の方法で<strong>「手動データ転送（無料）」</strong>を行うか、<strong>「クラウド自動連携（Firebase設定）」</strong>を行うことで、全デバイス間での共有が可能です。
            </p>
          </div>

          {/* メッセージ通知 */}
          {message && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* 方法1: 手動ファイル共有 (エクスポート & インポート) */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>手動でデータを共有する (1タップで簡単転送)</span>
            </h4>
            <p className="text-slate-500 text-xs">
              現在入力済みのパソコンでファイルを「エクスポート」し、共有したいスマホや他PCで「インポート」すると全データが同期されます。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* 書き出しボタン */}
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>データ書き出し (エクスポート)</span>
              </button>

              {/* 取り込みボタン */}
              <label className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer transition shadow-sm">
                <Upload className="w-4 h-4" />
                <span>{importing ? '取り込み中...' : 'データ取り込み (インポート)'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 方法2: クラウド自動リアルタイム同期についての案内 */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-600" />
              <span>全自動クラウドリアルタイム同期 (Firebase)</span>
            </h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              Cloudflare Pages 側の環境変数に Firebase APIキー（`VITE_FIREBASE_API_KEY` 等）を紐付けると、手動でファイルを共有することなく、<strong>スマホやPCで入力したデータが常にリアルタイムで自動同期</strong>されます。
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
