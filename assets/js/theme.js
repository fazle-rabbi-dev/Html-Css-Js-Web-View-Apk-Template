/* Theme switch — saved in localStorage, follows the OS on first visit. */
(function () {
  "use strict";

  var root = document.documentElement;
  var button = document.getElementById("themeBtn");
  var media = window.matchMedia("(prefers-color-scheme: dark)");

  function isDark() {
    return root.classList.contains("dark");
  }

  function syncButton() {
    if (!button) return;
    button.setAttribute(
      "aria-label",
      isDark() ? "Switch to light theme" : "Switch to dark theme"
    );
    button.setAttribute("title", isDark() ? "Light theme" : "Dark theme");
  }

  function setTheme(dark, persist) {
    root.classList.toggle("dark", dark);
    if (persist) {
      try {
        localStorage.setItem("eb-theme", dark ? "dark" : "light");
      } catch (error) {
        /* private mode — theme still applies for this visit */
      }
    }
    syncButton();
  }

  if (button) {
    syncButton();
    button.addEventListener("click", function () {
      setTheme(!isDark(), true);
    });
  }

  /* Keep following the OS until the visitor picks a side. */
  media.addEventListener("change", function (event) {
    var saved = null;
    try {
      saved = localStorage.getItem("eb-theme");
    } catch (error) {
      saved = null;
    }
    if (!saved) setTheme(event.matches, false);
  });
})();
