(() => {
  const article = document.querySelector(".reading-content .article");
  if (!article || typeof renderMathInElement !== "function") return;
  renderMathInElement(article, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
      { left: "\\[", right: "\\]", display: true },
    ],
    ignoredClasses: ["katex"],
    throwOnError: false,
    trust: false,
  });
})();
