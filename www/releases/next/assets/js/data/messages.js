/**
 * messages.js
 * アプリ内で使用するメッセージ・Tipsの定義。
 * キー・言語コード・メッセージ文字列を管理する。
 *
 * 用途別の型：
 *   - showMessageByKey 用: 値は文字列 { ja: "...", en: "..." }
 *   - Tips ダイアログ用:   値は文字列配列 { ja: [...], en: [...] }（・箇条書き）
 */
export const messages = {
  // ---- showMessageByKey 用メッセージ ----

  tapTempoDetecting: {
    ja: "タップテンポ検出中...",
    en: "Detecting tap tempo...",
  },
  tapTempoReset: {
    ja: "タップリセット。",
    en: "Tap reset.",
  },

  // ---- Tips ダイアログ用メッセージ ----

  // index / editScore 画面のテンポ Tips
  tempoTipMain: {
    ja: [
      "テンポはダイアルを回して、30〜240 BPMの範囲で設定します。",
      "ダイヤルや刻み幅ボタンで値を変更できます。",
      "クリック数やカウントインの詳細は、下の調節ボタンから設定できます。",
      "ダイアルを4回タップすると、タップ間隔からテンポを自動設定します。",
      "タップが2秒以上空くとリセットされます。",
    ],
    en: [
      "Set the tempo by turning the dial from 30 to 240 BPM.",
      "Use the dial and the step buttons to change the value.",
      "Details for clicks and count-in can be adjusted from the tune button below.",
      "Tap the dial 4 times to automatically set the tempo from your tap interval.",
      "Resets if no tap for 2 seconds.",
    ],
  },

  // configBeat 画面のテンポ Tips（Done ボタンで保存の説明が異なる）
  tempoTipConfigBeat: {
    ja: [
      "テンポはダイアルを回して、30〜240 BPMの範囲で設定します。",
      "ダイヤルや刻み幅ボタンで値を変更できます。",
      "設定は「Done」を押したときに保存されます。",
      "ダイアルを4回タップすると、タップ間隔からテンポを自動設定します。",
      "タップが2秒以上空くとリセットされます。",
    ],
    en: [
      "Set the tempo by turning the dial from 30 to 240 BPM.",
      "Use the dial or the step buttons to change the value.",
      "The setting is saved when you press \"Done\".",
      "Tap the dial 4 times to automatically set the tempo from your tap interval.",
      "Resets if no tap for 2 seconds.",
    ],
  },
};
