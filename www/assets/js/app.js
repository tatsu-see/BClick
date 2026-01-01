
document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start");
  if (!startButton) return;

  startButton.addEventListener("click", () => {
    window.location.href = "/click.html";
  });
});
