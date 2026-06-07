(function () {
  const script = document.currentScript;
  const root = script ? (script.dataset.root || '') : '';
  const state = {
    cards: [],
    hero: [],
    activeCategory: '全部',
    heroIndex: 0,
    heroTimer: null
  };

  const els = {
    grid: document.getElementById('card-grid'),
    filters: document.getElementById('filters'),
    detail: document.getElementById('detail'),
    detailClose: document.getElementById('detail-close'),
    detailImage: document.getElementById('detail-image'),
    detailCategory: document.getElementById('detail-category'),
    detailTitle: document.getElementById('detail-title'),
    detailSummary: document.getElementById('detail-summary'),
    detailBody: document.getElementById('detail-body'),
    heroImage: document.getElementById('hero-image'),
    heroCaption: document.getElementById('hero-caption'),
    navLinks: Array.from(document.querySelectorAll('.site-nav a[data-nav]'))
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function loadContent() {
    const response = await fetch(`${root}static/lab/content.json`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Content request failed');
    }
    return response.json();
  }

  function renderFilters() {
    if (!els.filters) return;
    const categories = ['全部', ...new Set(state.cards.map((card) => card.category))];
    els.filters.innerHTML = categories.map((category) => {
      const active = category === state.activeCategory ? ' aria-pressed="true"' : ' aria-pressed="false"';
      return `<button type="button" data-category="${escapeHtml(category)}"${active}>${escapeHtml(category)}</button>`;
    }).join('');
  }

  function renderCards() {
    if (!els.grid) return;
    const cards = state.activeCategory === '全部'
      ? state.cards
      : state.cards.filter((card) => card.category === state.activeCategory);

    els.grid.innerHTML = cards.map((card) => `
      <article class="content-card" data-id="${escapeHtml(card.card_id)}" tabindex="0">
        <div class="content-card__image">
          <img src="${escapeHtml(root + card.thumbnail)}" alt="${escapeHtml(card.title)}">
        </div>
        <div class="content-card__copy">
          <p>${escapeHtml(card.category)}</p>
          <h3>${escapeHtml(card.title)}</h3>
          <span>${escapeHtml(card.summary)}</span>
        </div>
      </article>
    `).join('');
  }

  function renderHero() {
    if (!state.hero.length || !els.heroImage || !els.heroCaption) return;
    const item = state.hero[state.heroIndex % state.hero.length];
    els.heroImage.src = root + item.image;
    els.heroImage.alt = item.caption;
    els.heroCaption.textContent = item.caption;
  }

  function moveHero(direction) {
    state.heroIndex = (state.heroIndex + direction + state.hero.length) % state.hero.length;
    renderHero();
    restartHeroTimer();
  }

  function restartHeroTimer() {
    window.clearInterval(state.heroTimer);
    state.heroTimer = window.setInterval(() => moveHero(1), 6000);
  }

  function openDetail(cardId, pushHash) {
    const card = state.cards.find((item) => item.card_id === cardId);
    if (!card) return;

    els.detail.hidden = false;
    els.detailImage.src = root + card.thumbnail;
    els.detailImage.alt = card.title;
    els.detailCategory.textContent = card.category;
    els.detailTitle.textContent = card.title;
    els.detailSummary.textContent = card.summary;
    els.detailBody.innerHTML = card.content_detail
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join('');

    if (pushHash) {
      history.pushState(null, '', `#detail/${card.card_id}`);
    }
    els.detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeDetail() {
    els.detail.hidden = true;
    if (location.hash.startsWith('#detail/')) {
      history.pushState(null, '', location.pathname);
    }
  }

  function openFromHash() {
    const match = location.hash.match(/^#detail\/(.+)$/);
    if (match) {
      openDetail(decodeURIComponent(match[1]), false);
    }
  }

  function bindEvents() {
    setActiveNav(document.body.dataset.page || 'home');

    if (els.filters) els.filters.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-category]');
      if (!button) return;
      state.activeCategory = button.dataset.category;
      renderFilters();
      renderCards();
    });

    if (els.grid) els.grid.addEventListener('click', (event) => {
      const card = event.target.closest('.content-card');
      if (card) openDetail(card.dataset.id, true);
    });

    if (els.grid) els.grid.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.content-card');
      if (!card) return;
      event.preventDefault();
      openDetail(card.dataset.id, true);
    });

    const prev = document.querySelector('.hero__control--prev');
    const next = document.querySelector('.hero__control--next');
    if (prev) prev.addEventListener('click', () => moveHero(-1));
    if (next) next.addEventListener('click', () => moveHero(1));
    if (els.detailClose) els.detailClose.addEventListener('click', closeDetail);
    window.addEventListener('hashchange', openFromHash);
  }

  function setActiveNav(key) {
    els.navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.nav === key);
    });
  }

  function updateActiveNav() {
    setActiveNav(document.body.dataset.page || 'home');
  }

  async function init() {
    try {
      const content = await loadContent();
      state.cards = content.cards || [];
      state.hero = content.hero || [];
      renderHero();
      renderFilters();
      renderCards();
      bindEvents();
      if (state.hero.length && els.heroImage) restartHeroTimer();
      openFromHash();
      updateActiveNav();
    } catch (error) {
      if (els.grid) {
        els.grid.innerHTML = '<p class="load-error">内容数据暂时无法加载。请通过本地服务器访问页面，或检查 static/lab/content.json。</p>';
      }
      console.error(error);
    }
  }

  init();
}());
