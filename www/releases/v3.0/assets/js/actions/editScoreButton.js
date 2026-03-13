import { openEditScorePage } from "../utils/scoreButtonUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  const editButton = document.getElementById("editScore");
  if (!editButton) return;

  /**
   * 編集ボタンの処理。
   */
  const handleEdit = () => {
    openEditScorePage();
  };

  editButton.addEventListener("click", handleEdit);
});
