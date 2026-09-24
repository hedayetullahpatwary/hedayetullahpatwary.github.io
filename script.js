/* ==========================================================================
   Hedayet Ullah Patwary - Portfolio interactions
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EMAIL = 'hedayetullahpatwary@gmail.com';
  var now = new Date();

  // Storage can throw (private mode, blocked site data), so guard every access
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  function pad(n, width) {
    var s = String(n);
    while (s.length < (width || 0)) s = '0' + s;
    return s;
  }

  /* ---------- 1. Theme toggle ---------- */
  var themeBtn = document.getElementById('themeToggle');
  var themeLabel = document.getElementById('themeLabel');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    if (persist) store.set('hup-theme', theme);
    var next = theme === 'dark' ? 'Light' : 'Dark';
    if (themeLabel) themeLabel.textContent = next;
    if (themeBtn) themeBtn.setAttribute('aria-label', 'Switch to ' + next.toLowerCase() + ' mode');
    if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#2a2a29' : '#f0f3fa');
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ---------- 2. Mobile navigation ---------- */
  var hamburger = document.getElementById('hamburger');
  var navLinksWrap = document.getElementById('navLinks');

  function setMenu(open) {
    if (!hamburger || !navLinksWrap) return;
    hamburger.classList.toggle('open', open);
    navLinksWrap.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  if (hamburger && navLinksWrap) {
    hamburger.addEventListener('click', function () {
      setMenu(!navLinksWrap.classList.contains('open'));
    });
    navLinksWrap.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navLinksWrap.classList.contains('open')) {
        setMenu(false);
        hamburger.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (navLinksWrap.classList.contains('open') && !e.target.closest('.nav')) setMenu(false);
    });
  }

  /* ---------- 2b. In-page links ----------
     Scroll with JS instead of a "#section" navigation. Browsers treat file:// pages
     as unique origins, and previews that frame the page (IDE panels) block those
     navigations ("Unsafe attempt to load URL …"); a direct scroll works everywhere. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var id = link.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    // Keep the address bar in sync where the browser allows it (not on file://)
    if (location.protocol !== 'file:' && location.hash !== '#' + id) {
      try { history.pushState(null, '', '#' + id); } catch (err) { /* ignore */ }
    }
    // Move focus for keyboard and screen-reader users without a second jump
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- 3. Active nav link ---------- */
  var navAnchors = document.querySelectorAll('.nav-links a');
  if ('IntersectionObserver' in window && navAnchors.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navAnchors.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { sectionObserver.observe(s); });
  }

  /* ---------- 4. Computed values ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = now.getFullYear();
  });

  document.querySelectorAll('[data-since]').forEach(function (el) {
    var years = Math.max(1, now.getFullYear() - parseInt(el.getAttribute('data-since'), 10));
    el.setAttribute('data-count', String(years));
    el.textContent = years;
  });

  function parseYm(v) {
    var p = String(v || '').split('-').map(Number);
    return p.length === 2 && !isNaN(p[0]) && !isNaN(p[1]) ? p : null;
  }
  var nowYm = now.getFullYear() * 12 + now.getMonth(); // months since year 0 (0-based month)
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatYm(ym) { return MONTHS[ym[1] - 1] + ' ' + ym[0]; }

  // "4 mos", "1 yr 2 mos" - both months count
  function formatDuration(s, e) {
    var months = (e[0] - s[0]) * 12 + (e[1] - s[1]) + 1;
    if (months < 1) return '';
    var y = Math.floor(months / 12), m = months % 12, parts = [];
    if (y) parts.push(y + (y === 1 ? ' yr' : ' yrs'));
    if (m) parts.push(m + (m === 1 ? ' mo' : ' mos'));
    return parts.join(' ');
  }

  /* ---------- 5. Count-up numbers ---------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
    if (isNaN(target)) return;
    var render = function (v) { el.textContent = decimals ? v.toFixed(decimals) : Math.round(v); };
    if (reduceMotion) { render(target); return; }
    var start = null, duration = 1400;
    var step = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      render(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  /* ---------- 6. Scroll reveal ---------- */
  var revealObserver = null;

  if ('IntersectionObserver' in window && !reduceMotion) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObserver.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('[data-count]').forEach(function (el) { countObserver.observe(el); });
  }

  // Called again for cards rendered later from data/*.json
  function observeReveals(scope) {
    scope.querySelectorAll('.reveal').forEach(function (el) {
      if (revealObserver) revealObserver.observe(el);
      else el.classList.add('visible');
    });
  }
  observeReveals(document);

  /* ---------- 7. Typed role line ---------- */
  var typed = document.getElementById('typed-role');
  var roles = [
    'Machine Learning Researcher',
    'Computer Vision & Explainable AI',
    'Software Engineer · C# / .NET / Java',
    'Deep Learning with PyTorch'
  ];

  if (typed && !reduceMotion) {
    var r = 0, c = roles[0].length, deleting = true;
    var loop = function () {
      var word = roles[r];
      if (deleting) {
        c--;
        typed.textContent = word.slice(0, c);
        if (c === 0) { deleting = false; r = (r + 1) % roles.length; }
        setTimeout(loop, c === 0 ? 350 : 30);
      } else {
        word = roles[r];
        c++;
        typed.textContent = word.slice(0, c);
        if (c === word.length) { deleting = true; setTimeout(loop, 2200); }
        else setTimeout(loop, 60);
      }
    };
    setTimeout(loop, 2600);
  }

  /* ---------- 8. Project filter ---------- */
  var filterBtns = document.querySelectorAll('.filter-btn');
  var projectsGrid = document.getElementById('projectsGrid');
  var summary = document.getElementById('filterSummary');
  var currentFilter = 'all';

  function applyFilter(filter) {
    // Cards arrive after data/projects.json loads, so look them up on every call
    var cards = projectsGrid ? projectsGrid.querySelectorAll('.project-card') : [];
    var shown = 0;
    currentFilter = filter;
    cards.forEach(function (card) {
      var cats = (card.getAttribute('data-category') || '').split(/\s+/);
      var match = filter === 'all' || cats.indexOf(filter) !== -1;
      card.hidden = !match;
      if (match) { shown++; card.classList.add('visible'); }
    });
    filterBtns.forEach(function (btn) {
      var on = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    if (summary) {
      summary.textContent = filter === 'all'
        ? 'Showing all ' + shown + ' projects'
        : 'Showing ' + shown + ' of ' + cards.length + ' projects';
    }
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { applyFilter(btn.getAttribute('data-filter')); });
  });

  /* ---------- 8b. Data-driven sections ----------
     Experience, projects and publications live in data/*.json. fetch() needs the page
     served over http(s); browsers block it on file://, so preview with a local server. */
  var ME = 'Hedayet Ullah Patwary';
  var LINK_ICONS = { github: 'i-github', linkedin: 'i-linkedin' };
  var PUB_STATES = { published: 'Published', accepted: 'Accepted', 'under-review': 'Under Review' };

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  // Escape, then turn **text** into a highlighted figure
  function rich(v) {
    return esc(v).replace(/\*\*(.+?)\*\*/g, '<strong class="pub-accent">$1</strong>');
  }

  function list(v) { return Array.isArray(v) ? v : []; }

  function renderExperience(x) {
    var s = parseYm(x.start);
    var e = x.end ? parseYm(x.end) : null; // no end date = ongoing
    var active = !e || e[0] * 12 + (e[1] - 1) >= nowYm;
    var duration = s ? formatDuration(s, e || [now.getFullYear(), now.getMonth() + 1]) : '';
    var projects = list(x.projects);
    var skills = list(x.skills);

    return '<article class="exp-card reveal">' +
      '<div class="exp-header exp-company-header">' +
        '<span class="exp-logo" aria-hidden="true">' + esc(x.logo) + '</span>' +
        '<div class="exp-info">' +
          '<div class="exp-company-row"><strong>' + esc(x.company) + '</strong></div>' +
          (x.location ? '<div class="exp-meta-row"><span class="exp-meta-chip">' + esc(x.location) + '</span></div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="exp-role">' +
        '<div class="exp-title-row">' +
          '<h3 class="exp-job-title">' + esc(x.title) + '</h3>' +
          '<span class="exp-status' + (active ? ' is-active' : '') + '">' + (active ? 'Active' : 'Completed') + '</span>' +
        '</div>' +
        (x.type ? '<div class="exp-company-row"><strong>' + esc(x.type) + '</strong></div>' : '') +
        (s ? '<div class="exp-meta-row"><span class="exp-meta-chip">📅 ' + formatYm(s) + ' – ' + (e ? formatYm(e) : 'Present') +
          (duration ? ' · <span class="exp-duration">' + duration + '</span>' : '') + '</span></div>' : '') +
        (x.description ? '<p class="exp-desc">' + esc(x.description) + '</p>' : '') +
        (projects.length ? '<div class="exp-projects-panel"><div class="exp-projects-header">🗂 Key Projects</div>' +
          projects.map(function (p) {
            return '<div class="exp-project"><div class="exp-project-dot"></div><div>' +
              '<div class="exp-project-title">' + esc(p.title) + '</div>' +
              '<div class="exp-project-desc">' + esc(p.description) + '</div>' +
            '</div></div>';
          }).join('') + '</div>' : '') +
        (skills.length ? '<div class="exp-skills-row"><span class="exp-skills-label">' + esc(x.skillsLabel || 'Skills') + ':</span>' +
          skills.map(function (k) { return '<span class="exp-skill">' + esc(k) + '</span>'; }).join('') + '</div>' : '') +
      '</div>' +
    '</article>';
  }

  function renderProject(p) {
    var cover = p.cover || {};
    var art = cover.svg
      ? '<svg class="cover-svg"><use href="#' + esc(cover.svg) + '" /></svg>'
      : '<i class="' + esc(cover.icon) + '"></i>';
    var visual = p.image
      ? '<img class="project-cover-image" src="' + esc(p.image) + '" alt="' + esc(p.name) + ' project preview" loading="lazy" />'
      : art;
    var links = list(p.links);

    return '<article class="project-card reveal" data-category="' + esc(list(p.categories).join(' ')) + '">' +
      '<div class="project-cover cover-' + esc(cover.theme || 'a') + '">' + visual + '<span>' + esc(cover.label || p.name) + '</span></div>' +
      (p.badge ? '<span class="project-card-badge">' + esc(p.badge) + '</span>' : '') +
      '<div class="project-body">' +
        '<div class="project-lang">' + esc(list(p.stack).join(' · ')) + '</div>' +
        '<h3 class="project-name">' + esc(p.name) + '</h3>' +
        '<p class="project-desc">' + esc(p.description) + '</p>' +
        '<div class="project-tags">' +
          list(p.tags).map(function (t) { return '<span class="project-tag">#' + esc(t) + '</span>'; }).join('') +
        '</div>' +
        (links.length ? '<footer class="project-actions">' + links.map(function (l) {
          var icon = LINK_ICONS[l.icon] ? '<svg class="ic" aria-hidden="true"><use href="#' + LINK_ICONS[l.icon] + '" /></svg> ' : '';
          return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener" class="project-btn">' + icon + esc(l.label) + '</a>';
        }).join('') + '</footer>' : '') +
      '</div>' +
    '</article>';
  }

  function renderPublication(p) {
    var meta = list(p.meta).map(esc);
    var authors = list(p.authors).map(function (a) {
      return a === ME ? '<strong class="me">' + esc(a) + '</strong>' : esc(a);
    }).join(', ');
    if (authors) meta.push(authors);
    var state = p.status
      ? '<span class="pub-state is-' + esc(p.status) + '">' + esc(PUB_STATES[p.status] || p.status) + '</span>'
      : '';

    return '<article class="pub-card reveal">' +
      (p.icon ? '<div class="pub-icon" aria-hidden="true">' + esc(p.icon) + '</div>' : '') +
      (p.highlight ? '<div class="pub-result-badge"><span>✦</span> ' + esc(p.highlight) + '</div>' : '') +
      '<h3 class="pub-title">' + esc(p.title) + '</h3>' +
      '<p class="pub-meta">' + meta.join(' &nbsp;·&nbsp; ') + '</p>' +
      '<p class="pub-abstract">' + rich(p.abstract) + '</p>' +
      '<ul class="pub-tags">' +
        list(p.tags).map(function (t) { return '<li class="pub-tag">' + esc(t) + '</li>'; }).join('') +
      '</ul>' +
      '<div class="pub-actions">' + state +
        list(p.links).map(function (l) {
          return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener" class="btn-sm-link">' + esc(l.label) + ' ↗</a>';
        }).join('') +
        (p.note ? '<p class="pub-status">✦ ' + esc(p.note) + '</p>' : '') +
      '</div>' +
    '</article>';
  }

  function loadSection(hostId, path, render, done) {
    var host = document.getElementById(hostId);
    if (!host) return Promise.resolve();
    return fetch(path, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (items) {
        host.innerHTML = list(items).map(render).join('');
        observeReveals(host);
        if (done) done(true);
      })
      .catch(function (err) {
        console.error('Could not load ' + path, err);
        host.innerHTML = '<p class="data-error">Couldn\'t load this section (' + esc(path) + ').' +
          (location.protocol === 'file:' ? ' Serve the folder with a local web server instead of opening the file directly.' : '') +
          '</p>';
        if (done) done(false);
      })
      .then(function () { host.removeAttribute('aria-busy'); });
  }

  Promise.all([
    loadSection('experienceList', 'data/experience.json', renderExperience),
    loadSection('projectsGrid', 'data/projects.json', renderProject, function (ok) {
      if (ok) applyFilter(currentFilter);
      else if (summary) summary.textContent = '';
    }),
    loadSection('publicationsList', 'data/publication.json', renderPublication)
  ]).then(function () {
    // Content above a #section link just grew, so land on it again
    var id = location.hash.slice(1);
    var target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: 'start' });
  });

  /* ---------- 9. Back-to-top with progress ring ---------- */
  var toTop = document.getElementById('toTop');
  var ring = document.getElementById('topRing');
  var ringLen = 2 * Math.PI * 23;
  var ticking = false;

  if (ring) {
    ring.style.strokeDasharray = ringLen.toFixed(2);
    ring.style.strokeDashoffset = ringLen.toFixed(2);
  }

  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(y / max, 1) : 0;
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
    if (ring) ring.style.strokeDashoffset = (ringLen * (1 - progress)).toFixed(2);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 10. Floating particles ---------- */
  var particleHost = document.getElementById('particles');
  if (particleHost && !reduceMotion) {
    var count = window.innerWidth < 640 ? 10 : 18;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span');
      var size = 2 + Math.random() * 3;
      var duration = 14 + Math.random() * 16;
      p.className = 'particle';
      p.style.left = (Math.random() * 100).toFixed(2) + '%';
      p.style.width = size.toFixed(1) + 'px';
      p.style.height = size.toFixed(1) + 'px';
      p.style.animationDuration = duration.toFixed(1) + 's';
      p.style.animationDelay = (-Math.random() * duration).toFixed(1) + 's';
      particleHost.appendChild(p);
    }
  }

  /* ---------- 11. Contact form → opens the visitor's email app ---------- */
  var form = document.getElementById('contactForm');
  var status = document.getElementById('cfStatus');

  if (form) {
    var fields = form.querySelectorAll('.cf-input, .cf-textarea');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      fields.forEach(function (f) {
        var bad = !f.checkValidity() || !f.value.trim();
        f.classList.toggle('is-invalid', bad);
        f.setAttribute('aria-invalid', String(bad));
        if (bad && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        status.textContent = '✗ Please fill in every field with a valid email address.';
        status.classList.add('is-error');
        firstInvalid.focus();
        return;
      }
      var data = new FormData(form);
      var body = 'Name: ' + data.get('name').trim() +
                 '\nEmail: ' + data.get('email').trim() +
                 '\n\n' + data.get('message').trim();
      window.location.href = 'mailto:' + EMAIL +
        '?subject=' + encodeURIComponent(data.get('subject').trim()) +
        '&body=' + encodeURIComponent(body);
      status.classList.remove('is-error');
      status.textContent = '✓ Opening your email app… If nothing happens, write to ' + EMAIL + '.';
    });

    fields.forEach(function (f) {
      f.addEventListener('input', function () {
        if (f.classList.contains('is-invalid') && f.checkValidity() && f.value.trim()) {
          f.classList.remove('is-invalid');
          f.setAttribute('aria-invalid', 'false');
        }
      });
    });
  }
})();
