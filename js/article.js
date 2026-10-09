(() => {
  const outline = document.querySelector(".article-toc");
  if (!outline) return;
  const smallScreen = matchMedia("(max-width: 900px)");
  function matchScreen() {
    outline.open = !smallScreen.matches;
  }
  matchScreen();
  smallScreen.addEventListener("change", matchScreen);
})();
