# ドクター相談会フォローアップ管理Webアプリ

ドクター相談会に参加した患者の情報と、その後の経過報告・ドクター回答をスタッフ・ドクター間で共有・管理する業務用Webアプリケーションです。

---

## 📋 主な機能

1. **ドクター別患者ファイル管理 (要件)**
   - 「白尾医師」「深谷医師」「岡田医師」「担当医未設定」ごとに患者を自動分類。
   - 各ドクターの担当患者数・回答待ち・確認待ち・未確認数をリアルタイムにカード・ツリー表示。
2. **患者一元管理 & ドクター回答待ち自動判定**
   - スタッフが「ドクターへの確認依頼」を投稿すると、ステータスが自動的に**「ドクター回答待ち」**へ移行。
   - ドクターが回答すると、自動的に**「スタッフ確認待ち」**へ移行。
3. **時系列経過共有タイムライン**
   - 経過報告、ドクターへの確認依頼、回答、対応記録、確認済み既読判定を時系列に表示。
4. **ロール別アクセス制御 (セキュリティ要件)**
   - **管理者 (`admin`)**: すべての患者閲覧・編集・担当医変更・アーカイブが可能。
   - **スタッフ (`staff`)**: 全患者の閲覧、経過報告・確認依頼の投稿、対応状況の更新が可能。
   - **ドクター (`doctor`)**: 自分に割り当てられた担当患者のみ閲覧・回答・助言投稿が可能。

---

## 🛠 技術構成

- **Core**: React 18, TypeScript, Vite
- **CSS / UI**: Tailwind CSS, Lucide React
- **BaaS**: Firebase JavaScript SDK v10 (Authentication & Cloud Firestore)
- **Routing**: React Router DOM v6 (SPA 構成)
- **Hosting / Deploy**: Cloudflare Pages (`public/_redirects` 設定同梱)

---

## 🚀 ローカル開発環境の起動手順

### 1. リポジトリの取得と依存パッケージのインストール

```bash
git clone <repository-url>
cd doctor-consultation-followup
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成します。

```bash
cp .env.example .env
```

`.env` に Firebase コンソールで発行されたWebアプリ設定値を入力します：

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:...
```

※ `.env` が未設定の場合でも、ローカルテスト用デモモード（ブラウザ内保持）で全機能を即座に動作確認できます。

### 3. ローカル開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` へアクセスしてください。

---

## 🔥 Firebase の初期設定手順

### 1. Authentication の有効化
1. [Firebase Console](https://console.firebase.google.com/) にアクセスし、プロジェクトを作成/選択します。
2. 「Authentication」 > 「Sign-in method」で**メール / パスワード**を有効化します。

### 2. Cloud Firestore の作成
1. 「Firestore Database」を作成します。
2. セキュリティルールにリポジトリ内の `firestore.rules` の内容をコピー＆ペーストして適用します。
3. インデックス設定に `firestore.indexes.json` を適用します。

### 3. テスト用ユーザーの作成方法

Firebase Authentication で以下のテストユーザーを作成し、Firestore の `users/{uid}` ドキュメントに役割を登録します。

| メールアドレス | パスワード | ロール (`role`) | 担当ドクター (`doctorId`) |
| :--- | :--- | :--- | :--- |
| `admin@example.com` | `password123` | `admin` | - |
| `staff@example.com` | `password123` | `staff` | - |
| `shirao@example.com` | `password123` | `doctor` | `doc-shirao` (白尾医師) |
| `fukaya@example.com` | `password123` | `doctor` | `doc-fukaya` (深谷医師) |
| `okada@example.com` | `password123` | `doctor` | `doc-okada` (岡田医師) |

---

## ⚡ Cloudflare Pages へのデプロイ手順

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) にログインし、「Workers & Pages」 > 「Create application」 > 「Pages」を選びます。
2. GitHub リポジトリと連携し、対象リポジトリを選択します。
3. ビルド設定を次のように入力します：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 「Environment variables (環境変数)」に `.env` と同じ `VITE_FIREBASE_*` の設定をすべて追加します。
5. 「Save and Deploy」をクリックすると、`main` ブランチへのプッシュ毎に自動デプロイが実行されます。

---

## 🧪 架空のサンプルデータ (試作版)

本システムは試作版であり、実在の人物・患者データは一切使用しておりません。

- **患者A (P-001)**: 白尾医師担当 / 右膝の運動時痛 / ドクター回答待ち
- **患者B (P-002)**: 深谷医師担当 / 腰部痛 / 対応完了
- **患者C (P-003)**: 岡田医師担当 / 左肩関節可動域制限 / 対応中
- **患者D (P-004)**: 白尾医師担当 / 足関節捻挫後の不快感 / スタッフ確認待ち
- **患者E (P-005)**: 担当医未設定 / 頸部・肩こりからの頭痛 / 経過観察中

---

## ⚠️ 免責事項・セキュリティ

- 本システムは一般公開用ではなく関係者専用です。
- **緊急連絡には使用できません。** 緊急性がある場合は施設で定められた呼出連絡方法を使用してください。
