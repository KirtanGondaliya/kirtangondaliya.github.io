/* ============================================================
   MAIN — theme, scroll progress, rail, reveals, diagrams,
   magnetic buttons, contact pill, copy-email, command palette.
   ============================================================ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- Theme ---------- */
  function setTheme(t) {
    root.dataset.theme = t;
    $('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#f6f6f2' : '#07080a');
    document.dispatchEvent(new Event('themechange'));
  }
  $('[data-theme-toggle]').addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(next); store.set('theme', next);
  });

  /* ---------- Toast ---------- */
  const toastEl = $('.toast'); let toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('is-shown');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-shown'), 1800);
  }

  /* ---------- Scroll: progress, top bar, rail, pill ---------- */
  const topbar = $('.topbar');
  const sections = $$('[data-section]');
  const railLinks = $$('.rail a');
  const navLinks = $$('.topbar__nav a');
  const pill = $('[data-pill]');
  const hero = $('.hero');
  const contact = $('#contact');
  const navMap = { supportpilot: 'work', endlink: 'work', booking: 'work', courses: 'work' };

  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const sp = max > 0 ? Math.min(1, scrollY / max) : 0;
    root.style.setProperty('--sp', sp.toFixed(4));
    topbar.classList.toggle('is-scrolled', scrollY > 8);

    const mid = innerHeight * .45;
    let current = sections[0]?.dataset.section;
    for (const s of sections) if (s.getBoundingClientRect().top <= mid) current = s.dataset.section;
    railLinks.forEach(a => a.classList.toggle('is-active', a.dataset.rail === current));
    const navTarget = navMap[current] || current;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + navTarget));

    const pastHero = hero.getBoundingClientRect().bottom < innerHeight * .3;
    const atContact = contact.getBoundingClientRect().top < innerHeight * .8;
    pill.classList.toggle('is-shown', pastHero && !atContact);
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Reveals + diagram entrances ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const siblings = $$('.reveal', e.target.parentElement).filter(el => !el.classList.contains('is-in'));
        const delay = Math.max(0, siblings.indexOf(e.target)) * 70;
        setTimeout(() => e.target.classList.add('is-in'), Math.min(delay, 350));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    reveals.forEach(el => io.observe(el));
    // Safety net: never leave content invisible if the observer stays silent.
    setTimeout(() => reveals.forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); }), 1500);
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Diagram: tabs ---------- */
  $$('.dia__tabs').forEach(tabs => {
    const buttons = $$('[role="tab"]', tabs);
    function select(btn) {
      buttons.forEach(b => {
        const on = b === btn;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.dataset.tab);
        panel.hidden = !on; panel.classList.toggle('is-active', on);
      });
    }
    buttons.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
        select(n); n.focus();
      });
    });
    select(buttons[0]);
  });

  /* ---------- Diagram: Endlink state walk ---------- */
  const states = $$('.states .state');
  if (states.length) {
    let step = 0;
    const light = () => states.forEach((s, i) => s.classList.toggle('is-lit', i === step));
    light();
    if (!reduce) setInterval(() => { step = (step + 1) % states.length; light(); }, 2000);
  }

  /* ---------- Screenshot galleries ---------- */
  $$('[data-gallery]').forEach(g => {
    const shot = $('.frame__shot', g), img = $('img', shot), url = $('[data-url]', g), btns = $$('.picker__btn', g);
    btns.forEach(btn => btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      btns.forEach(b => { const on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
      url.textContent = btn.dataset.url;
      const swap = () => { img.src = btn.dataset.src; img.alt = btn.dataset.alt; };
      if (reduce) return swap();
      shot.classList.add('is-swapping');
      setTimeout(() => {
        swap();
        // Never leave the frame blank if the image is cached or fails to load.
        const done = () => shot.classList.remove('is-swapping');
        if (img.complete) done(); else { img.onload = img.onerror = done; setTimeout(done, 1500); }
      }, 180);
    }));
  });

  const lightbox = $('[data-lightbox]'), lbImg = $('img', lightbox);
  let lbReturn = null;
  $$('[data-zoom]').forEach(btn => btn.addEventListener('click', () => {
    const img = $('img', btn);
    lbImg.src = img.src; lbImg.alt = img.alt; lbReturn = btn;
    lightbox.hidden = false; $('.lightbox__close', lightbox).focus();
  }));
  const closeLightbox = () => { if (lightbox.hidden) return; lightbox.hidden = true; lbReturn?.focus({ preventScroll: true }); };
  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  /* ---------- Skill spotlight ---------- */
  $$('.skill').forEach(card => card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--x', `${e.clientX - r.left}px`);
    card.style.setProperty('--y', `${e.clientY - r.top}px`);
  }));

  /* ---------- Magnetic buttons ---------- */
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.classList.add('is-tracking');
        btn.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * .22}px`);
        btn.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * .32}px`);
      });
      btn.addEventListener('pointerleave', () => {
        btn.classList.remove('is-tracking');
        btn.style.setProperty('--mx', '0px'); btn.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- Copy email ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    btn.textContent = 'Copied ✓'; toast('Email copied to clipboard');
    setTimeout(() => (btn.textContent = 'Copy'), 1800);
  }));

  /* ---------- Command palette ---------- */
  const palette = $('[data-palette]');
  const input = $('.palette__input');
  const list = $('.palette__list');
  const commands = [
    { label: 'Intro', hint: 'section', run: () => go('#top') },
    { label: 'SupportPilot — AI support assistant', hint: 'project', run: () => go('#supportpilot') },
    { label: 'Endlink — hospital messaging', hint: 'project', run: () => go('#endlink') },
    { label: 'Booking System — online appointments', hint: 'project', run: () => go('#booking') },
    { label: 'Course Marketplace — online courses', hint: 'project', run: () => go('#courses') },
    { label: 'Experience', hint: 'section', run: () => go('#experience') },
    { label: 'Skills', hint: 'section', run: () => go('#skills') },
    { label: 'Contact', hint: 'section', run: () => go('#contact') },
    { label: 'Copy email address', hint: 'action', run: () => $('[data-copy]').click() },
    { label: 'Download résumé (PDF)', hint: 'file', run: () => $('a[download]').click() },
    { label: 'Open GitHub', hint: 'link', run: () => open('https://github.com/KirtanGondaliya', '_blank', 'noopener') },
    { label: 'Open LinkedIn', hint: 'link', run: () => open('https://www.linkedin.com/in/kirtan-gondaliya/', '_blank', 'noopener') },
    { label: 'Toggle light / dark theme', hint: 'action', run: () => $('[data-theme-toggle]').click() },
  ];
  let filtered = commands, active = 0, lastFocus = null;

  function go(hash) { document.querySelector(hash)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); history.replaceState(null, '', hash); }

  function render() {
    list.innerHTML = '';
    filtered.forEach((c, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active);
      li.innerHTML = `<span></span><span></span>`;
      li.children[0].textContent = c.label; li.children[1].textContent = c.hint;
      li.addEventListener('pointerenter', () => { active = i; mark(); });
      li.addEventListener('click', () => choose(i));
      list.append(li);
    });
    if (!filtered.length) list.innerHTML = '<li aria-disabled="true"><span>No matches</span><span></span></li>';
  }
  function mark() { $$('li', list).forEach((li, i) => li.setAttribute('aria-selected', i === active)); $$('li', list)[active]?.scrollIntoView({ block: 'nearest' }); }
  function choose(i) { const c = filtered[i]; if (!c) return; closePalette(); c.run(); }
  function openPalette() {
    lastFocus = document.activeElement;
    palette.hidden = false; input.value = ''; filtered = commands; active = 0; render();
    requestAnimationFrame(() => input.focus());
  }
  function closePalette() { palette.hidden = true; lastFocus?.focus?.({ preventScroll: true }); }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    filtered = commands.filter(c => (c.label + ' ' + c.hint).toLowerCase().includes(q));
    active = 0; render();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
  });
  $$('[data-palette-open]').forEach(b => b.addEventListener('click', openPalette));
  $$('[data-palette-close]').forEach(b => b.addEventListener('click', closePalette));
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.hidden ? openPalette() : closePalette(); }
    else if (e.key === 'Escape' && !palette.hidden) closePalette();
    else if (e.key === '/' && palette.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); }
  });
})();
