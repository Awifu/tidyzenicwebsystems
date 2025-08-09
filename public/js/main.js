// public/js/main.js

// ---------- tiny utils ----------
const qs  = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, { timeout = 8000, retries = 1 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { "Accept": "application/json" } });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await sleep(300 * (attempt + 1)); // backoff
    }
  }
}

// ---------- load partials (header/footer) ----------
async function loadPartials() {
  try {
    const [headerHTML, footerHTML] = await Promise.all([
      fetch("/header.html").then(r => r.text()),
      fetch("/footer.html").then(r => r.text()),
    ]);
    const headerEl = qs("#app-header");
    const footerEl = qs("#app-footer");
    if (headerEl) headerEl.innerHTML = headerHTML;
    if (footerEl) footerEl.innerHTML = footerHTML;

    // after header is in DOM, wire mobile toggle
    const toggle = qs("#mobile-nav-toggle");
    const drawer = qs("#mobile-nav");
    if (toggle && drawer) {
      toggle.addEventListener("click", () => {
        drawer.classList.toggle("hidden");
      });
      // close on nav click (mobile)
      qsa("#mobile-nav a").forEach(a =>
        a.addEventListener("click", () => drawer.classList.add("hidden"))
      );
    }
  } catch (e) {
    console.error("Failed to load partials:", e);
  }
}

// ---------- blog ----------
function renderBlog(posts) {
  const grid = qs("#blog-grid");
  const skeleton = qs("#blog-skeleton");
  if (!grid) return;

  // clear skeleton
  if (skeleton) skeleton.remove();

  if (!posts || !posts.length) {
    grid.innerHTML = `<div class="text-gray-500">No blog posts yet. Check back soon.</div>`;
    return;
  }

  const cards = posts.map(p => `
    <article class="opacity-0 translate-y-2 transition-all duration-300 card rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900">${escapeHTML(p.title)}</h3>
      <p class="mt-2 text-sm text-gray-600">${escapeHTML(p.excerpt)}</p>
      <a class="mt-4 inline-flex items-center text-brand-700 hover:text-brand-900 font-medium" href="${p.url}" aria-label="Read more: ${escapeHTML(p.title)}">
        Read more →
      </a>
    </article>
  `).join("");

  grid.innerHTML = cards;

  // fade in
  qsa("article", grid).forEach((el, i) => {
    setTimeout(() => {
      el.classList.remove("opacity-0", "translate-y-2");
    }, 40 * i);
  });
}

async function loadBlog() {
  try {
    const posts = await fetchJSON("/api/blog", { retries: 2 });
    renderBlog(posts);
  } catch (e) {
    console.error("Blog load failed:", e);
    const skeleton = qs("#blog-skeleton");
    if (skeleton) skeleton.remove();
    const grid = qs("#blog-grid");
    if (grid) grid.innerHTML = `<div class="text-red-600">Couldn’t load blog right now.</div>`;
  }
}

// ---------- reviews ----------
function renderReviews(reviews) {
  const grid = qs("#reviews-grid");
  const skeleton = qs("#reviews-skeleton");
  if (!grid) return;

  if (skeleton) skeleton.remove();

  if (!reviews || !reviews.length) {
    grid.innerHTML = `<div class="text-gray-500">No reviews yet.</div>`;
    return;
  }

  const stars = (n) => {
    const clamp = Math.max(0, Math.min(5, Number(n) || 0));
    return `<div class="flex gap-0.5 mt-1" aria-label="${clamp} out of 5 stars">` +
      Array.from({ length: 5 }, (_, i) =>
        `<svg class="h-4 w-4 ${i < clamp ? 'text-yellow-500' : 'text-gray-300'}" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.036a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118L10.5 14.347a1 1 0 00-1.175 0l-2.935 2.086c-.784.57-1.838-.197-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.754 8.719c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.295-3.292z"/>
        </svg>`).join("") + `</div>`;
  };

  const cards = reviews.map(r => `
    <div class="opacity-0 translate-y-2 transition-all duration-300 rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
      <p class="text-gray-700">“${escapeHTML(r.text)}”</p>
      <div class="mt-3 flex items-center justify-between">
        <strong class="text-sm text-gray-900">${escapeHTML(r.author)}</strong>
        ${stars(r.rating)}
      </div>
    </div>
  `).join("");

  grid.innerHTML = cards;

  qsa("div", grid).forEach((el, i) => {
    setTimeout(() => {
      el.classList.remove("opacity-0", "translate-y-2");
    }, 40 * i);
  });
}

async function loadReviews() {
  try {
    const data = await fetchJSON("/api/reviews", { retries: 2 });
    renderReviews(data);
  } catch (e) {
    console.error("Reviews load failed:", e);
    const skeleton = qs("#reviews-skeleton");
    if (skeleton) skeleton.remove();
    const grid = qs("#reviews-grid");
    if (grid) grid.innerHTML = `<div class="text-red-600">Couldn’t load reviews right now.</div>`;
  }
}

// ---------- util: HTML escape ----------
function escapeHTML(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- boot ----------
(async function init() {
  await loadPartials();
  loadBlog();
  loadReviews();
})();
