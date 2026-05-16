# Capacity & Stress Manager

タスクのキャパシティ管理とストレスケアを一画面で扱えるパーソナルダッシュボード。
スマホアプリ化（PWA）対応のため、HTML / CSS / JS を分割しています。

## ファイル構成

```
outputs/
├── index.html              … 画面構造（マークアップ）
├── manifest.json           … PWA マニフェスト
├── sw.js                   … Service Worker（オフライン対応）
├── css/
│   └── styles.css          … 全スタイル + レスポンシブ + 印刷
├── js/
│   ├── config.js           … マスタ初期値・状態変数（categoryMaster / ownerMaster / tagMaster ほか）
│   ├── storage.js          … localStorage 読み書き
│   ├── sync.js             … GAS / Google Sheets 連携
│   ├── dashboard.js        … ダッシュボード描画
│   ├── tasks.js            … タスク一覧・追加・編集（開始日／終了日／重要・緊急の後追い編集）
│   ├── wbs.js              … WBS タイムライン
│   ├── stress.js           … ストレスマトリクス（5=非常に良い 〜 1=非常に悪い）
│   ├── settings.js         … 設定タブ（カテゴリ／担当／項目の CRUD）
│   ├── export.js           … 印刷・JSON 入出力
│   └── main.js             … 初期化・イベント結線
└── icons/
    ├── icon.svg
    ├── icon-192.png
    └── icon-512.png
```

スクリプトの読み込み順は `index.html` 末尾で定義しています。`config.js` → `storage.js` → `sync.js` → 各機能 → `main.js` の順に依存します。

## 今回の主な変更

| # | 変更点 | 関連ファイル |
|---|--------|--------------|
| 1 | **設定タブを追加**：カテゴリ／担当／項目を追加・編集・削除・並び替え | `index.html` / `js/settings.js` |
| 2 | **重要チェックは既定OFF** | `index.html`（`tImportant` から `checked` 除去）/ `js/tasks.js`（`addTask` リセット時OFF）|
| 3 | **期限 → 開始日／終了日** に変更、後から編集可 | `index.html` / `js/tasks.js`（`📅 期間`）/ `js/wbs.js`（バー範囲）|
| 4 | **重要／緊急** をタスク作成後も編集可（`🚩 フラグ`） | `js/tasks.js` |
| 5 | **キャパシティを小数点第1位まで**（step=0.1） | `index.html` / `js/tasks.js` |
| 6 | **ストレス評価を反転**（5=非常に良い 〜 1=非常に悪い、要ケア = スコア2以下） | `js/config.js` / `js/stress.js` / `js/dashboard.js` |
| 7 | **PWA 化**（manifest + service worker + アイコン） | `manifest.json` / `sw.js` / `icons/` |
| 8 | **モバイル最適化**（safe-area、iOS の自動ズーム抑制、タップ領域拡大） | `css/styles.css` |

## ローカルでの確認

PWA を完全に動かすには HTTPS か `localhost` 上で配信する必要があります。

```bash
cd outputs
python3 -m http.server 8000
# → http://localhost:8000/ をブラウザで開く
```

スマホからアクセスし、「ホーム画面に追加」を実行するとアプリのように使えます。

## スマホアプリ化（任意の次ステップ）

- **PWA のまま運用**：このフォルダをそのままサーバに置けば iOS / Android の双方でホーム画面に追加可能。Service Worker により基本オフラインで動作します。
- **ストアに出したい場合**：[PWABuilder](https://www.pwabuilder.com/) などで本フォルダを指定すると、Android（TWA）/ iOS のラッパー生成ができます。

## データ移行

旧バージョン（`deadline` だけを持つ JSON）も読み込めるよう、`normalizeTaskForUi` で `deadline` を新しい `end` に流し込みます。
