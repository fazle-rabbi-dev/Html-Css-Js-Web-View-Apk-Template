/* Small shared helpers. Everything is a classic script so the app also
   works when index.html is opened straight from disk (file://). */
window.App = (function () {
  "use strict";

  var ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ESCAPES[char];
    });
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function icon(name, className) {
    var body = (window.ICONS && window.ICONS[name]) || "";
    return (
      '<svg class="icon' +
      (className ? " " + className : "") +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' +
      body +
      "</svg>"
    );
  }

  /** Split on every term and wrap the matched runs in <mark>. */
  function highlight(text, terms) {
    if (!terms || !terms.length) return escapeHTML(text);

    var pattern = terms
      .filter(Boolean)
      .sort(function (a, b) {
        return b.length - a.length;
      })
      .map(escapeRegExp)
      .join("|");

    if (!pattern) return escapeHTML(text);

    var re = new RegExp("(" + pattern + ")", "gi");
    return String(text)
      .split(re)
      .map(function (part, index) {
        return index % 2 ? "<mark>" + escapeHTML(part) + "</mark>" : escapeHTML(part);
      })
      .join("");
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, wait);
    };
  }

  var toastTimer = null;

  function toast(message) {
    var el = document.getElementById("toast");
    if (!el) return;

    el.innerHTML = icon("check") + "<span>" + escapeHTML(message) + "</span>";
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2200);
  }

  /** Clipboard with a fallback for file:// and older browsers. */
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.left = "-1000px";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);

    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);

    if (!ok) throw new Error("Copy failed");
    return ok;
  }

  return {
    escapeHTML: escapeHTML,
    icon: icon,
    highlight: highlight,
    debounce: debounce,
    toast: toast,
    copy: copy,
  };
})();
