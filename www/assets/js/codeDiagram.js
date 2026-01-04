document.addEventListener("DOMContentLoaded", () => {
  const closeCodeDiagramButton = document.getElementById("closeCodeDiagram");

  if (closeCodeDiagramButton) {
    closeCodeDiagramButton.addEventListener("click", () => {
      window.close();
      if (!window.closed) {
        window.location.href = "/";
      }
    });
  }
});
