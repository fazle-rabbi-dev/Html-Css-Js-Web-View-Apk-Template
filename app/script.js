const root = document.documentElement;
const toggle = document.getElementById("theme-toggle");
const STORAGE_KEY = "theme";

/** Apply a theme to <html> and keep the toggle's a11y state in sync. */
function applyTheme(theme) {
  const dark = theme === "dark";
  root.classList.toggle("dark", dark);
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode"
  );
}

// The <head> script already set the class; sync the button with it.
applyTheme(root.classList.contains("dark") ? "dark" : "light");

toggle.addEventListener("click", () => {
  const next = root.classList.contains("dark") ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch (e) {
    /* storage blocked: theme just won't persist */
  }
});

const btn = document.getElementById("btn");
const out = document.getElementById("out");
let count = 0;

btn.addEventListener("click", () => {
  count += 1;
  out.textContent = "Clicked " + count + " time(s)";
});
