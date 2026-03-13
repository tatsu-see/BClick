/**
 * centeredSelect.js
 * iOSのselectはoption中央寄せが効きにくいので、表示用ラベルを重ねて疑似的に中央寄せする。
 */

/**
 * select の表示ラベルを更新する。
 * @param {HTMLSelectElement} select
 */
export const syncCenteredSelectLabel = (select) => {
  if (!select) return;
  const wrap = select.closest(".rhythmSelectWrap");
  const label = wrap ? wrap.querySelector(".rhythmSelectLabel") : null;
  if (!label) return;
  const selected = select.options[select.selectedIndex];
  label.textContent = selected ? selected.textContent : "";
};

/**
 * select + 表示用ラベルのラッパーを作る。
 * @param {HTMLSelectElement} select
 * @param {{labelClass?: string}} options
 * @returns {HTMLDivElement}
 */
export const buildCenteredSelectWrap = (select, options = {}) => {
  const { labelClass = "" } = options;
  const wrap = document.createElement("div");
  wrap.className = "rhythmSelectWrap";
  // 表示用ラベルは見た目のみ。操作はネイティブselectに委ねる。
  const label = document.createElement("span");
  label.className = `rhythmSelectLabel${labelClass ? ` ${labelClass}` : ""}`;
  select.classList.add("rhythmSelectInput");
  select.addEventListener("change", () => {
    syncCenteredSelectLabel(select);
  });
  wrap.appendChild(label);
  wrap.appendChild(select);
  syncCenteredSelectLabel(select);
  return wrap;
};
