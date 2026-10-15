// Small, progressive behaviour: the page reads fine without any of it.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Local time in Davao, for people hiring across time zones. */
  const clocks = document.querySelectorAll('.clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' });
  const tick = () => {
    const now = new Date();
    clocks.forEach(c => { c.textContent = fmt.format(now); c.dateTime = now.toISOString(); });
  };
  tick();
  setInterval(tick, 15000);

  /* Hero: Earl's game scenes take turns behind the intro, and the caption names the one on screen.
     It pauses when the hero is off screen or the tab is hidden, and stays on the first scene for reduced motion. */
  const hero = document.querySelector('.hero');
  const slides = hero ? [...hero.querySelectorAll('.hero-slide')] : [];
  if (slides.length > 1 && !reduceMotion) {
    const SLIDE_MS = 7000;
    const caption = hero.querySelector('.hero-caption');
    const captionText = hero.querySelector('.hero-caption-text');
    const ticks = [...hero.querySelectorAll('.hero-ticks i')];
    hero.style.setProperty('--slide', `${SLIDE_MS}ms`);
    let current = 0, timer = 0, visible = true;
    const show = i => {
      slides[current].classList.remove('is-on');
      current = (i + slides.length) % slides.length;
      const s = slides[current];
      void s.offsetWidth;                 // restart the slow drift on the incoming scene
      s.classList.add('is-on');
      captionText.style.opacity = 0;
      setTimeout(() => { captionText.textContent = s.dataset.caption; caption.setAttribute('href', s.dataset.link); captionText.style.opacity = 1; }, 400);
      ticks.forEach((t, k) => { t.classList.remove('is-on'); if (k === current) { void t.offsetWidth; t.classList.add('is-on'); } });
    };
    const schedule = () => { clearInterval(timer); if (visible && !document.hidden) timer = setInterval(() => show(current + 1), SLIDE_MS); };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); }).observe(hero);
    document.addEventListener('visibilitychange', schedule);
    schedule();
  }

  /* The bar is clear over the hero at the very top and darkens smoothly as soon as the page scrolls,
     so nothing scrolling underneath ever shows through it. */
  const bar = document.querySelector('.bar');
  let barTick = false;
  const shadeBar = () => {
    bar.style.setProperty('--bar', Math.min(scrollY / 160, 1).toFixed(3));
    // once the hero has mostly scrolled away, the bar takes the page's own colours (light or dark)
    bar.classList.toggle('is-solid', scrollY > (hero ? hero.offsetHeight - 120 : 10));
    barTick = false;
  };
  window.addEventListener('scroll', () => { if (!barTick) { barTick = true; requestAnimationFrame(shadeBar); } }, { passive: true });
  shadeBar();

  /* Light / dark mode: follows the system until the visitor picks one; the pick is remembered. */
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const systemLight = window.matchMedia('(prefers-color-scheme: light)');
  const currentTheme = () => root.dataset.theme || (systemLight.matches ? 'light' : 'dark');
  const syncTheme = () => {
    const t = currentTheme();
    toggle.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    if (metaTheme) metaTheme.content = t === 'light' ? '#f7f6f3' : '#0b0b0c';
  };
  toggle.addEventListener('click', () => {
    const next = currentTheme() === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode: the choice just isn't remembered */ }
    syncTheme();
  });
  systemLight.addEventListener('change', syncTheme);
  syncTheme();

  /* Work index: each row opens in place to show its screenshot and write-up. */
  const rows = [...document.querySelectorAll('.row')];
  const setOpen = (row, open) => {
    row.classList.toggle('is-open', open);
    row.querySelector('.row-head').setAttribute('aria-expanded', String(open));
  };
  rows.forEach(row => {
    const body = row.querySelector('.row-body');
    body.id = `${row.id}-body`;
    // wrap the contents in one box so the row can collapse to zero height
    const inner = document.createElement('div');
    inner.className = 'row-inner';
    inner.append(...body.children);
    body.append(inner);
    row.querySelector('.row-head').setAttribute('aria-controls', body.id);
    row.querySelector('.row-head').addEventListener('click', () => {
      const open = !row.classList.contains('is-open');
      rows.forEach(r => { if (r !== row) setOpen(r, false); });
      setOpen(row, open);
      hidePreview();
    });
  });

  /* Filters hide rows; the numbers stay, so the index keeps its order. */
  const filters = document.querySelectorAll('.filter');
  filters.forEach(btn => btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    filters.forEach(b => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
    rows.forEach(r => { r.hidden = f !== 'all' && !r.dataset.cat.split(' ').includes(f); if (r.hidden) setOpen(r, false); });
  }));

  /* Links like #work-order-tracker open that row. */
  const openFromHash = () => {
    const row = rows.find(r => `#${r.id}` === location.hash);
    if (!row) return;
    if (row.hidden) document.querySelector('.filter[data-filter="all"]').click();
    rows.forEach(r => setOpen(r, r === row));
    row.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };
  window.addEventListener('hashchange', openFromHash);
  openFromHash();

  /* Floating screenshot that trails the cursor over the list (mouse only, closed rows only). */
  const preview = document.querySelector('.preview');
  const previewImg = preview && preview.querySelector('img');
  const list = document.querySelector('.rows');
  let tx = 0, ty = 0, x = 0, y = 0, raf = 0, shown = false;
  function hidePreview() { if (preview) { preview.classList.remove('is-on'); shown = false; } }
  if (preview && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const follow = () => {
      x += (tx - x) * (reduceMotion ? 1 : 0.18);
      y += (ty - y) * (reduceMotion ? 1 : 0.18);
      preview.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = shown ? requestAnimationFrame(follow) : 0;
    };
    list.addEventListener('mousemove', e => {
      const head = e.target.closest('.row-head');
      const row = head && head.parentElement;
      if (!row || row.classList.contains('is-open')) { hidePreview(); return; }
      const w = preview.offsetWidth, h = preview.offsetHeight;
      // sit to the right of the cursor, flipping left near the edge
      tx = e.clientX + 28 + w > innerWidth ? e.clientX - 28 - w : e.clientX + 28;
      ty = Math.min(Math.max(e.clientY - h / 2, 60), innerHeight - h - 10);
      if (previewImg.getAttribute('src') !== row.dataset.img) previewImg.src = row.dataset.img;
      if (!shown) { x = tx; y = ty; shown = true; preview.classList.add('is-on'); }
      if (!raf) raf = requestAnimationFrame(follow);
    });
    list.addEventListener('mouseleave', hidePreview);
    window.addEventListener('scroll', hidePreview, { passive: true });
  }

  /* Underline the bar link for the section on screen. */
  const barLinks = [...document.querySelectorAll('.bar-links a')];
  const targets = barLinks.map(a => document.querySelector(a.getAttribute('href')));
  const markCurrent = () => {
    let current = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    // the footer is short and never reaches that line, so the bottom of the page counts as Contact
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = targets.length - 1;
    barLinks.forEach((a, i) => a.classList.toggle('is-current', i === current));
  };
  window.addEventListener('scroll', markCurrent, { passive: true });
  markCurrent();

  /* Certificates: data-img is the badge on the card, data-full the certificate shown on click;
     data-verify adds a link to the issuer's credential page. */
  const viewer = document.getElementById('viewer');
  document.querySelectorAll('.cert').forEach(cert => {
    const title = cert.querySelector('h3').textContent;
    if (cert.dataset.img) {
      const box = cert.querySelector('.cert-img');
      box.innerHTML = `<img src="${cert.dataset.img}" alt="${title} certificate" loading="lazy"><button type="button" aria-label="View the ${title} certificate"></button>`;
      box.querySelector('button').addEventListener('click', () => {
        viewer.querySelector('.viewer-title').textContent = title;
        const img = viewer.querySelector('.viewer-img');
        img.src = cert.dataset.full || cert.dataset.img; img.alt = `${title} certificate`;
        viewer.showModal();
      });
    }
    if (cert.dataset.verify) {
      const a = document.createElement('a');
      a.href = cert.dataset.verify; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Verify credential';
      const p = document.createElement('p'); p.append(a);
      cert.querySelector('.cert-body').append(p);
    }
  });
  if (viewer) {
    viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', e => { if (e.target === viewer) viewer.close(); });
  }

  /* Game player: loads the WebGL build only when opened, and unloads it on close. */
  const player = document.getElementById('player');
  if (player) {
    const frame = player.querySelector('.player-frame');
    const title = player.querySelector('.player-title');
    document.querySelectorAll('.play').forEach(btn => btn.addEventListener('click', () => {
      title.textContent = btn.dataset.title;
      frame.innerHTML = `<iframe src="${btn.dataset.game}" title="${btn.dataset.title}" allow="fullscreen; autoplay; gamepad" allowfullscreen></iframe>`;
      player.showModal();
    }));
    player.querySelector('.player-close').addEventListener('click', () => player.close());
    player.querySelector('.player-full').addEventListener('click', () => {
      const f = frame.querySelector('iframe');
      if (f && f.requestFullscreen) f.requestFullscreen();
    });
    player.addEventListener('click', e => { if (e.target === player) player.close(); });
    player.addEventListener('close', () => { frame.innerHTML = ''; });
  }
})();
