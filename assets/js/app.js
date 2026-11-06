/* Renders the phrasebook and wires up search, navigation, and copying. */
(function () {
  "use strict";

  var App = window.App;
  var data = window.PHRASE_DATA || [];

  var chaptersEl = document.getElementById("chapters");
  var navEl = document.getElementById("chapterNav");
  var searchInput = document.getElementById("searchInput");
  var clearSearch = document.getElementById("clearSearch");
  var resultBar = document.getElementById("resultBar");
  var resultText = document.getElementById("resultText");
  var emptyState = document.getElementById("emptyState");
  var emptyQuery = document.getElementById("emptyQuery");
  var hero = document.getElementById("hero");
  var toTop = document.getElementById("toTop");
  var progressBar = document.getElementById("scrollProgress");
  var menuBtn = document.getElementById("menuBtn");
  var backdrop = document.getElementById("backdrop");

  var sections = [];
  var navItems = [];
  var navById = {};
  var terms = [];

  /* ---------- Render ---------- */
  function hydrateIcons() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-icon]"), function (el) {
      el.innerHTML = App.icon(el.getAttribute("data-icon"));
    });
  }

  function renderSidebar() {
    var fragment = document.createDocumentFragment();

    data.forEach(function (category) {
      var link = document.createElement("a");
      link.className = "nav-item";
      link.href = "#" + category.id;
      link.dataset.target = category.id;
      link.innerHTML =
        '<span class="nav-icon">' + App.icon(category.icon) + "</span>" +
        '<span class="nav-title">' + App.escapeHTML(category.title) + "</span>" +
        '<span class="nav-count">' + category.phrases.length + "</span>";

      link.addEventListener("click", function () {
        setActive(category.id);
        closeNav();
        var target = document.getElementById(category.id);
        if (target) {
          target.classList.remove("is-target");
          /* restart the highlight animation on every visit */
          void target.offsetWidth;
          target.classList.add("is-target");
        }
      });

      navItems.push(link);
      navById[category.id] = link;
      fragment.appendChild(link);
    });

    navEl.appendChild(fragment);
  }

  function createCard(phrase) {
    var card = document.createElement("article");
    card.className = "phrase";
    card.innerHTML =
      '<p class="phrase-bangla" lang="bn">' + App.escapeHTML(phrase.bangla) + "</p>" +
      '<p class="phrase-english" lang="en">' + App.escapeHTML(phrase.english) + "</p>" +
      '<button class="copy-btn" type="button" aria-label="Copy: ' +
      App.escapeHTML(phrase.english) + '">' + App.icon("copy") + "</button>";

    card._english = phrase.english;
    card._bangla = phrase.bangla;
    card._haystack = (phrase.english + " " + phrase.bangla + " " + phrase.phonetic).toLowerCase();
    card._englishEl = card.querySelector(".phrase-english");
    card._banglaEl = card.querySelector(".phrase-bangla");
    return card;
  }

  function renderChapters() {
    var fragment = document.createDocumentFragment();

    data.forEach(function (category) {
      var section = document.createElement("section");
      section.className = "chapter reveal";
      section.id = category.id;

      var titleId = category.id + "-title";
      section.setAttribute("aria-labelledby", titleId);

      var head = document.createElement("header");
      head.className = "chapter-head";
      head.innerHTML =
        '<span class="chapter-icon" aria-hidden="true">' + App.icon(category.icon) + "</span>" +
        '<div class="chapter-titles">' +
        '<p class="chapter-kicker">Chapter ' + String(category.number).padStart(2, "0") +
        '<span class="dot" aria-hidden="true"></span>' +
        '<span class="bn" lang="bn">' + App.escapeHTML(category.banglaTitle) + "</span></p>" +
        '<h2 class="chapter-title" id="' + titleId + '">' + App.escapeHTML(category.title) + "</h2>" +
        "</div>" +
        '<span class="chapter-count"><strong>' + category.phrases.length + "</strong> phrases</span>";

      var grid = document.createElement("div");
      grid.className = "phrase-grid";

      var cards = [];
      category.phrases.forEach(function (phrase) {
        var card = createCard(phrase);
        cards.push(card);
        grid.appendChild(card);
      });

      section.appendChild(head);
      section.appendChild(grid);
      fragment.appendChild(section);

      sections.push({
        el: section,
        cards: cards,
        countEl: head.querySelector(".chapter-count"),
        navItem: navById[category.id],
        navCount: navById[category.id].querySelector(".nav-count"),
        total: category.phrases.length,
      });
    });

    chaptersEl.appendChild(fragment);
  }

  /* ---------- Search ---------- */
  function applySearch(raw) {
    var query = raw.trim();
    terms = query ? query.toLowerCase().split(/\s+/) : [];
    var searching = terms.length > 0;
    var total = 0;

    sections.forEach(function (section) {
      var visible = 0;

      section.cards.forEach(function (card) {
        var matches =
          !searching ||
          terms.every(function (term) {
            return card._haystack.indexOf(term) !== -1;
          });

        card.hidden = !matches;

        if (matches) {
          visible += 1;
          card._englishEl.innerHTML = App.highlight(card._english, terms);
          card._banglaEl.innerHTML = App.highlight(card._bangla, terms);
        }
      });

      section.el.hidden = searching && visible === 0;
      section.navItem.classList.toggle("is-dim", searching && visible === 0);

      if (searching) {
        section.countEl.innerHTML = "<strong>" + visible + "</strong> " +
          (visible === 1 ? "phrase" : "phrases");
        section.navCount.textContent = visible;
        section.el.classList.add("is-visible");
      } else {
        section.countEl.innerHTML = "<strong>" + section.total + "</strong> phrases";
        section.navCount.textContent = section.total;
      }

      total += visible;
    });

    hero.hidden = searching;
    resultBar.hidden = !searching;
    emptyState.hidden = !searching || total > 0;
    clearSearch.hidden = query.length === 0;

    if (searching) {
      resultText.innerHTML =
        "<strong>" + total + "</strong> " + (total === 1 ? "phrase" : "phrases") +
        " for \u201c<strong>" + App.escapeHTML(query) + "</strong>\u201d";
      emptyQuery.textContent = "\u201c" + query + "\u201d";
    }
  }

  function resetSearch(focus) {
    searchInput.value = "";
    applySearch("");
    if (focus) searchInput.focus();
  }

  function setupSearch() {
    var run = App.debounce(function () {
      applySearch(searchInput.value);
    }, 110);

    searchInput.addEventListener("input", run);
    searchInput.addEventListener("search", run);
    clearSearch.addEventListener("click", function () {
      resetSearch(true);
    });
    document.getElementById("clearSearchBtn").addEventListener("click", function () {
      resetSearch(true);
    });
    document.getElementById("emptyClearBtn").addEventListener("click", function () {
      resetSearch(true);
    });

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (searchInput.value) {
          resetSearch(true);
        } else {
          searchInput.blur();
        }
      }
    });
  }

  /* ---------- Copy ---------- */
  function setupCopy() {
    chaptersEl.addEventListener("click", function (event) {
      var button = event.target.closest(".copy-btn");
      if (!button) return;

      var card = button.closest(".phrase");
      if (!card) return;

      App.copy(card._english)
        .then(function () {
          button.innerHTML = App.icon("check");
          button.classList.add("is-copied");
          card.classList.add("is-copied");
          App.toast("Copied — ready to paste.");

          clearTimeout(button._timer);
          button._timer = setTimeout(function () {
            button.innerHTML = App.icon("copy");
            button.classList.remove("is-copied");
            card.classList.remove("is-copied");
          }, 1600);
        })
        .catch(function () {
          /* Clipboard blocked (often on file://). Select the phrase so a
             manual Ctrl+C still works instead of silently failing. */
          try {
            var range = document.createRange();
            range.selectNodeContents(card._englishEl);
            var selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            App.toast("Copy blocked — text selected. Press Ctrl+C.");
          } catch (error) {
            App.toast("Couldn’t copy automatically — select the phrase manually.");
          }
        });
    });
  }

  /* ---------- Active chapter + reveal ---------- */
  function setActive(id) {
    navItems.forEach(function (item) {
      var active = item.dataset.target === id;
      item.classList.toggle("is-active", active);
      if (active) {
        item.setAttribute("aria-current", "true");
        /* keep the active chapter visible in the sidebar */
        if (item.scrollIntoView) {
          item.scrollIntoView({ block: "nearest" });
        }
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function setupRevealAndSpy() {
    if (!("IntersectionObserver" in window)) {
      sections.forEach(function (section) {
        section.el.classList.add("is-visible");
      });
      return;
    }

    var topOffset = 110;

    var reveal = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          reveal.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.01 }
    );

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-" + topOffset + "px 0px -62% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      reveal.observe(section.el);
      spy.observe(section.el);
    });
  }

  /* ---------- Mobile drawer ---------- */
  var mobile = window.matchMedia("(max-width: 1080px)");
  var backdropTimer = null;

  function openNav() {
    document.body.classList.add("nav-open");
    menuBtn.setAttribute("aria-expanded", "true");
    clearTimeout(backdropTimer);
    backdrop.hidden = false;
    requestAnimationFrame(function () {
      backdrop.classList.add("is-visible");
    });
  }

  function closeNav() {
    if (!document.body.classList.contains("nav-open")) return;
    document.body.classList.remove("nav-open");
    menuBtn.setAttribute("aria-expanded", "false");
    backdrop.classList.remove("is-visible");
    backdropTimer = setTimeout(function () {
      backdrop.hidden = true;
    }, 280);
  }

  function setupDrawer() {
    menuBtn.addEventListener("click", function () {
      if (document.body.classList.contains("nav-open")) closeNav();
      else openNav();
    });

    backdrop.addEventListener("click", closeNav);

    mobile.addEventListener("change", function (event) {
      if (!event.matches) closeNav();
    });
  }

  /* ---------- Scroll progress + back to top ---------- */
  function setupScroll() {
    var ticking = false;

    function update() {
      ticking = false;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(scrollTop / max, 1) : 0;

      progressBar.style.width = (ratio * 100).toFixed(2) + "%";
      toTop.classList.toggle("is-visible", scrollTop > 620);
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );

    window.addEventListener("resize", update, { passive: true });
    update();

    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Keyboard shortcuts ---------- */
  function setupKeyboard() {
    document.addEventListener("keydown", function (event) {
      var tag = (event.target.tagName || "").toLowerCase();
      var typing = tag === "input" || tag === "textarea" || event.target.isContentEditable;
      var modifier = event.ctrlKey || event.metaKey;

      if (event.key === "/" && !typing && !modifier) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
      }

      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
        return;
      }

      if (event.key === "Escape") {
        if (document.body.classList.contains("nav-open")) {
          closeNav();
          menuBtn.focus();
        } else if (document.activeElement === searchInput) {
          if (searchInput.value) resetSearch(true);
          else searchInput.blur();
        }
      }
    });
  }

  /* ---------- Boot ---------- */
  function init() {
    if (!chaptersEl || !data.length) return;

    hydrateIcons();

    var totalPhrases = data.reduce(function (sum, category) {
      return sum + category.phrases.length;
    }, 0);

    document.getElementById("statPhrases").textContent = totalPhrases;
    document.getElementById("statChapters").textContent = data.length;
    document.getElementById("chapterCount").textContent = data.length;
    document.title = "English Boss — " + totalPhrases + " everyday phrases";

    renderSidebar();
    renderChapters();
    applySearch("");
    setupSearch();
    setupCopy();
    setupDrawer();
    setupScroll();
    setupKeyboard();
    setupRevealAndSpy();
    setActive(data[0].id);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
