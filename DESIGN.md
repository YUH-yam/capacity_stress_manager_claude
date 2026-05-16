# Capacity & Stress Manager — Design Principles

本アプリのUIガイドライン。Apple Human Interface Guidelines (HIG) をベースに、Web/PWAで実現可能な範囲に翻訳しています。判断に迷ったらまずこの文書を確認してください。

## 1. 北極星（Design Tenets）

HIG の核となる3原則をそのまま採用します。

1. **Clarity（明瞭さ）** — 文字は読みやすく、アイコンは明確に。色とコントラストで意味を強化し、装飾より理解を優先する。
2. **Deference（コンテンツ優先）** — UI はコンテンツの邪魔をしない。フラットで控えめな表面、最小限の装飾、ジェスチャーに頼った直接操作。
3. **Depth（奥行き）** — 階層は影と動きで控えめに表現。モーダルやスタックを「上に重ねる」感覚で実装。

これらに加え、本アプリ固有の4原則を置きます。

4. **Single-tap Insight** — 開いた直後（ダッシュボード）で「今日の状態」が一目で分かる。
5. **Mobile First, Desktop Aware** — モバイルで完成度を保ち、デスクトップでは余白と密度を最適化する。逆ではない。
6. **Calm by Default** — アラート色は本当に注意が必要な時のみ。普段は穏やかなニュートラル。
7. **Reversible Edits** — 後追いで自由に編集できる。期日も重要・緊急もキャパシティも、すべて事後変更可能。

## 2. レイアウト

### コンテナ幅
- 最大幅 `980px`、左右中央寄せ。
- パディング：PC `20px / 24px`、SP `12px / 16px`。
- セクション間 `24px`、カード間 `16px`、要素間 `8〜12px`。

### グリッド
- 12カラム相当のCSS Gridを基本としつつ、`grid-template-columns: repeat(auto-fit, minmax(...))` で自動列割り。
- KPIタイル：PC = 4列、SP = 2列。
- フォーム：PC = 2カラム、SP = 1カラム。

### Safe Area
- iOS PWA を想定して `env(safe-area-inset-*)` を `body` に反映。

## 3. タイポグラフィ（HIG 型スケール）

Web向けに iOS の Dynamic Type を簡略化したスケール：

| 用途 | サイズ | weight | 行間 | 例 |
|------|------|--------|------|-----|
| Large Title | 28px | 700 | 1.2 | （未使用、ヘッダ予備） |
| Title 2 | 22px | 700 | 1.25 | ヘッダ日付 |
| Title 3 | 19px | 600 | 1.3 | KPI 数値（小） |
| Headline | 17px | 600 | 1.4 | タスクタイトル |
| Body | 16px | 400 | 1.5 | 入力欄・基本本文（iOS 16px 自動ズーム回避にも一致） |
| Subhead | 15px | 500 | 1.4 | カード見出し |
| Footnote | 13px | 400 | 1.4 | 補助情報 |
| Caption 1 | 12px | 500 | 1.3 | バッジ |
| Caption 2 | 11px | 600 | 1.3 | eyebrow / ラベル |

数値表示は `font-feature-settings: 'tnum' 1`（等幅数字）で揃える。

## 4. カラーシステム

iOS のセマンティック色（System Colors）を踏襲。`prefers-color-scheme: dark` で自動切替。

### ベース
- `--bg` ページ背景（systemGroupedBackground）
- `--bg-elevated` カード背景（systemBackground）
- `--bg-secondary` インセット二段目（secondarySystemBackground）
- `--bg-tertiary` 三段目（tertiarySystemBackground）

### Tints（強調色）
HIG の System Colors を意味に紐づけて使用：

- `--tint-blue` … 情報・主要アクション・進行中
- `--tint-green` … 成功・完了・キャパシティ余裕
- `--tint-orange` … 警告・要注意
- `--tint-red` … エラー・超過・要ケア
- `--tint-purple` … タグ・項目
- `--tint-gray` … ニュートラル

各 tint には `--fill-*` のソフトフィル（半透明）も用意。バッジ・ピル背景はソフトフィルを使う。

### 4象限の色マッピング
- Q1 今すぐ対応 → red
- Q2 計画して実行 → blue
- Q3 協力依頼 → orange
- Q4 通常どおり → gray

### コントラスト要件
- 通常テキスト：WCAG AA 4.5:1
- 大きいテキスト：3:1
- バッジ等の装飾テキストはソフトフィル背景上で同系色 strong (`--tint-*`) を使う。

## 5. コンポーネント

### Card
- `background: var(--bg-elevated)`
- `border: 1px solid var(--separator-soft)`
- `border-radius: 16px`（HIG の Continuous Corner に近い丸み）
- `padding: 16px`（モバイル）/ `20px`（デスクトップ）
- `box-shadow` は控えめに（`0 1px 2px rgba(0,0,0,.04)`）

### Button
- 最小タップ領域 **44×44pt**（HIG）。本アプリでは min-height 44px、`.sm` のみ 32px（密度の高い領域で使用、補助操作のみ）。
- Primary = `tint-blue` 塗りつぶし白文字。
- Secondary = 透明背景＋枠線。
- Destructive = `tint-red` テキスト＋枠線。
- Pressed: `transform: scale(.97)`、Focus: `box-shadow: 0 0 0 3px rgba(0,122,255,.25)`。

### Input
- フォントサイズ **16px**（iOS でフォーカス時自動ズームしない閾値）。
- 高さ 44px、角丸 12px、フォーカス時 tint-blue リング。

### Tab Bar (segmented control)
- iOS の segmented control をモチーフ。
- アクティブ：白カードに `shadow-1`。非アクティブ：透明、テキスト secondary。
- 横スクロール可、スクロールバーは非表示。

### List Row（タスク・ログ）
- iOS の inset grouped list が手本。
- 左右パディング 16px、上下 12〜14px。
- 区切りは細い `--separator-soft`。

## 6. モーション

- 標準持続時間 `150ms`、イージング `ease`。
- フェード（panel切替）と軽い scale (.97) フィードバックのみ。
- 大きな移動・回転・パーティクル等は使わない（HIG: avoid gratuitous animation）。

## 7. レスポンシブブレークポイント

- **SP** … `≤ 720px`
- **PC** … `> 720px`
- **狭SP** … `≤ 380px`（さらに密度を下げる）

ブレークポイントは画面幅であり、UA判定はしない。

## 8. 数値表現ルール

- 工数：1桁小数（`X.X h`）。
- 達成率：整数 %（`50%`）。
- ストレススコア：整数 1-5。平均値は 1桁小数。
- 日付：`YYYY/MM/DD` 表示、入力は `<input type="date">`。

## 9. アクセシビリティ

- フォーカスリングを必ず可視（`:focus-visible`）。
- 色だけに意味を委ねない（バッジには必ずテキスト併記）。
- ARIA 属性は `aria-label`/`aria-expanded` を最小限に。
- ダークモードで全要素のコントラストを検証。
- 文字最小は **11px**。

## 10. プラットフォーム拡張余地

将来的に Cordova/Capacitor で iOS/Android パッケージ化する場合、

- 通知（Local Notifications）→ 期限切れ・要ケア閾値超え
- アイコン Maskable PNG はすでに 192/512px 用意済み
- iOS の `apple-mobile-web-app-status-bar-style: black-translucent` で safe-area を活用

を引き続き想定。

---

## チェックリスト（PR時）

- [ ] 文字サイズ 11px 未満を使っていない
- [ ] タップ可能要素は 44×44pt 以上（補助の `.sm` は除く）
- [ ] ダークモードで読みづらい色がない
- [ ] 余白がスケール（4/8/12/16/20/24/32/40）に沿っている
- [ ] 装飾だけの色付け・グラデなし
- [ ] 数値の小数桁が統一されている
- [ ] フォーカスリングが可視
