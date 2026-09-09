/* Offline handbook interactions. No network requests or account data. */
(() => {
  const search = document.querySelector("#search");
  const audience = document.querySelector("#audience");
  const status = document.querySelector("#result-status");
  const empty = document.querySelector("#empty-state");
  const sidebar = document.querySelector(".sidebar");
  const toggle = document.querySelector("#menu-toggle");
  const articles = [...document.querySelectorAll("article")];
  const topics = [...document.querySelectorAll(".topic")].map((element) => ({
    element, article: element.closest("article"), text: element.textContent.toLowerCase(),
  }));
  const nav = [...document.querySelectorAll(".sidebar nav a")];
  function clearHighlights() {
    document.querySelectorAll("mark").forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent)));
    topics.forEach(({ element }) => element.normalize());
  }
  function highlight(element, terms) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.parentElement.tagName !== "MARK") nodes.push(walker.currentNode);
    const pattern = new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|"), "gi");
    nodes.forEach((node) => {
      const value = node.textContent;
      const matches = [...value.matchAll(pattern)];
      if (!matches.length) return;
      const fragment = document.createDocumentFragment();
      let offset = 0;
      matches.forEach((match) => {
        fragment.append(value.slice(offset, match.index));
        const mark = document.createElement("mark");
        mark.textContent = match[0]; fragment.append(mark);
        offset = match.index + match[0].length;
      });
      fragment.append(value.slice(offset)); node.replaceWith(fragment);
    });
  }
  function applyFilters() {
    clearHighlights();
    const terms = [...new Set(search.value.trim().toLowerCase().split(/\s+/).filter(Boolean))];
    const selected = audience.value;
    let count = 0;
    topics.forEach(({ element, article, text }) => {
      const readers = article.dataset.audience.split(" ");
      const fits = selected === "all" || readers.includes("everyone") || readers.includes(selected);
      const matches = fits && terms.every((term) => text.includes(term));
      element.hidden = !matches;
      if (matches) { count++; if (terms.length) highlight(element, terms); }
    });
    articles.forEach((article) => { article.hidden = ![...article.querySelectorAll(".topic")].some((topic) => !topic.hidden); });
    nav.forEach((link) => { link.hidden = document.querySelector(link.getAttribute("href")).hidden; });
    empty.hidden = count > 0;
    document.querySelector(".hero").hidden = terms.length > 0;
    status.textContent = terms.length || selected !== "all" ? `${count} matching topics · ${audience.selectedOptions[0].textContent}${terms.length ? ` · “${search.value.trim()}”` : ""}` : `${articles.length} chapters · Search by task, menu label, error or endpoint. Print includes the complete handbook.`;
  }
  function reset() { search.value = ""; audience.value = "all"; applyFilters(); }
  search.addEventListener("input", applyFilters);
  audience.addEventListener("change", applyFilters);
  document.querySelectorAll("[data-clear]").forEach((button) => button.addEventListener("click", () => { reset(); search.focus(); }));
  document.querySelector("#print").addEventListener("click", () => window.print());
  toggle.addEventListener("click", () => {
    const open = sidebar.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close contents" : "Open contents");
  });
  function revealAnchor() {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    if (target.closest("[hidden]")) reset();
    target.scrollIntoView({ block: "start" });
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link) return;
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if (target?.closest("[hidden]")) reset();
    sidebar.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open contents");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { sidebar.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open contents"); }
    if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); search.focus(); }
  });
  window.addEventListener("hashchange", revealAnchor);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible) nav.forEach((link) => link.setAttribute("aria-current", String(link.getAttribute("href") === `#${visible.target.id}`)));
    }, { rootMargin: "-15% 0px -70% 0px" });
    articles.forEach((article) => observer.observe(article));
  }
  applyFilters();
  if (location.hash) revealAnchor();
})();
