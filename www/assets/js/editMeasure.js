
document.addEventListener("DOMContentLoaded", () => {
  const closePageButton = document.getElementById("closePage");

  if (closePageButton) {
    closePageButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }
});
