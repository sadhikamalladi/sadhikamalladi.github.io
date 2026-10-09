/* Typeset the essay's MathML source with the same KaTeX fonts in every browser. */
'use strict';
(function () {
  const cache = new Map();
  const symbols = { '{':'\\{', '}':'\\}', 'η':'\\eta ', 'λ':'\\lambda ', 'μ':'\\mu ', 'κ':'\\kappa ', 'ρ':'\\rho ', 'β':'\\beta ', 'α':'\\alpha ', '′':'\\prime ', '−':'-', '≈':'\\approx ', '∼':'\\sim ', '·':'\\cdot ', '←':'\\leftarrow ', '∑':'\\sum ', '⌈':'\\lceil ', '⌉':'\\rceil ' };
  const escapeText = text => text.replace(/[{}_%&#$]/g, '\\$&');
  function toTex(element) {
    const children = Array.from(element.children).map(toTex), text = element.textContent;
    switch (element.localName) {
      case 'math': case 'mrow': return children.join('');
      case 'mi': return text === 'erf' ? '\\operatorname{erf}' : element.getAttribute('mathvariant') === 'bold' ? `\\mathbf{${escapeText(text)}}` : element.getAttribute('mathvariant') === 'normal' ? `\\mathrm{${escapeText(text)}}` : symbols[text] || text;
      case 'mn': return text.replaceAll(',', '{,}');
      case 'mo': return symbols[text] || text;
      case 'mtext': return `\\text{${escapeText(text)}}`;
      case 'msub': return `{${children[0]}}_{${children[1]}}`;
      case 'msup': return `{${children[0]}}^{${children[1]}}`;
      case 'msubsup': return `{${children[0]}}_{${children[1]}}^{${children[2]}}`;
      case 'mfrac': return `\\frac{${children[0]}}{${children[1]}}`;
      case 'msqrt': return `\\sqrt{${children.join('')}}`;
      case 'mover': if (element.children[1].textContent === '^') return `\\hat{${children[0]}}`; break;
      case 'munderover': return `${children[0]}\\limits_{${children[1]}}^{${children[2]}}`;
    }
    throw new Error(`Unsupported essay math element: ${element.localName}`);
  }
  function render(body, displayStyle = false) {
    const key = String(displayStyle) + body;
    if (cache.has(key)) return cache.get(key);
    const template = document.createElement('template');
    template.innerHTML = `<math>${body}</math>`;
    const tex = toTex(template.content.firstElementChild);
    const result = `<span class="blog-math">${katex.renderToString((displayStyle ? '\\displaystyle ' : '') + tex, {throwOnError:true, strict:'error', trust:false, output:'htmlAndMathml'})}</span>`;
    cache.set(key, result);
    if (cache.size > 256) cache.delete(cache.keys().next().value);
    return result;
  }
  window.BlogMath = { markup:render };
  document.querySelectorAll('math').forEach(element => {
    const template = document.createElement('template');
    template.innerHTML = render(element.innerHTML, element.getAttribute('display') === 'block' || Boolean(element.closest('.rule-candidates,.figure-axis-quantity,.formula-badge')));
    const replacement = template.content.firstElementChild;
    if (element.getAttribute('display') === 'block') replacement.classList.add('math-block');
    if (element.hasAttribute('aria-label')) {
      replacement.setAttribute('role','math');
      replacement.setAttribute('aria-label',element.getAttribute('aria-label'));
    }
    element.replaceWith(replacement);
  });
})();
