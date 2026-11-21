const btn = document.getElementById("btn");
const out = document.getElementById("out");
let count = 0;
btn.addEventListener("click", () => {
  count += 1;
  out.textContent = "Clicked " + count + " time(s)";
});