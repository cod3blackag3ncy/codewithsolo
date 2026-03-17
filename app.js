/* ═══════════════════════════════════════════════════════
   CODEWITHSOLO — app.js
   Boot Sequence · Command Palette · Scroll Reveals
   PWA Install · Service Accordion · Interactions
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const DEBUG = new URLSearchParams(location.search).has('debug');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;

  // ── BOOT LOGGER (Debug only) ──
  const logContainer = DEBUG ? (() => {
    const el = document.createElement('div');
    el.id = 'boot-logger';
    el.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.9); color: #00ff88; font-family: monospace; font-size: 11px; padding: 12px; max-width: 300px; max-height: 200px; overflow-y: auto; z-index: 99999; border: 1px solid #00ff88; border-radius: 4px;';
    document.body.appendChild(el);
    return el;
  })() : null;

  const originalLog = console.log;
  console.log = function(...args) {
    originalLog(...args);
    if (DEBUG) {
      const msg = args.join(' ');
      if (msg.includes('[BOOT')) {
        const logItem = document.createElement('div');
        logItem.style.cssText = 'padding: 3px 0; border-bottom: 1px solid rgba(0,255,136,0.2);';
        logItem.textContent = msg;
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }
  };

  // ── EARLY DOM LOOKUPS (prevent TDZ issues) ──
  const bootOverlay = document.getElementById('boot-overlay');
  const bootBody = document.getElementById('boot-body');
  const bootBar = document.getElementById('boot-progress-bar');
  const bootSkip = document.getElementById('boot-skip');
  const nav = document.getElementById('nav');
  const cmdBackdrop = document.getElementById('cmd-backdrop');
  const cmdInput = document.getElementById('cmd-input');
  const cmdList = document.getElementById('cmd-list');
  const cmdItems = cmdList ? cmdList.querySelectorAll('li') : [];

  // DEBUG: Verify elements exist
  if (!bootOverlay || !bootSkip) {
    console.error('Boot elements missing:', { bootOverlay, bootSkip });
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bootSeen = sessionStorage.getItem('bootSeen');
  let bootActive = false;
  let bootTimers = [];
  let revealsInitialized = false;

  // DIAGNOSTIC LOG
  console.log('[BOOT:INIT] prefersReducedMotion=' + prefersReducedMotion);
  console.log('[BOOT:INIT] bootSeen=' + bootSeen);
  console.log('[BOOT:INIT] overlay.display=' + bootOverlay.style.display);
  console.log('[BOOT:INIT] overlay computed display=' + window.getComputedStyle(bootOverlay).display);

  function endBoot() {
    if (!bootActive) {
      console.log('[BOOT] endBoot skipped - bootActive is false');
      return;
    }
    console.log('[BOOT] endBoot triggered');
    bootActive = false;
    bootTimers.forEach(clearTimeout);
    bootTimers = [];
    sessionStorage.setItem('bootSeen', 'true');
    bootOverlay.classList.add('fade-out');
    bootOverlay.style.pointerEvents = 'none';
    bootOverlay.style.visibility = 'hidden'; // Immediate visibility hidden
    nav.classList.add('visible');
    document.body.style.overflow = '';
    console.log('[BOOT] fade-out class added, pointer-events blocked, visibility hidden');
    setTimeout(() => {
      bootOverlay.style.display = 'none';
      bootOverlay.style.pointerEvents = '';
      console.log('[BOOT] display set to none, 600ms fade complete');
      if (!revealsInitialized) {
        revealsInitialized = true;
        initReveals();
      }
    }, 600);
  }

  function startBoot() {
    console.log('[BOOT] startBoot called');
    bootTimers.forEach(clearTimeout);
    bootTimers = [];
    bootActive = true;
    sessionStorage.removeItem('bootSeen');
    // Close command console overlay to prevent interference
    cmdBackdrop.setAttribute('hidden', '');
    const lines = bootBody.querySelectorAll('.boot-line');
    lines.forEach((line) => line.classList.remove('visible'));
    bootBar.style.width = '0%';
    bootOverlay.classList.remove('fade-out');
    bootOverlay.style.display = 'flex'; // EXPLICIT display value
    bootOverlay.style.visibility = 'visible'; // Restore visibility
    bootOverlay.style.pointerEvents = ''; // Reset pointer-events
    document.body.style.overflow = 'hidden';
    console.log('[BOOT] boot sequence started, cmd console closed, display/visibility/pointerEvents restored');

    const totalDuration = 2800;
    lines.forEach((line) => {
      const delay = parseInt(line.dataset.delay, 10);
      bootTimers.push(setTimeout(() => {
        line.classList.add('visible');
        const progress = Math.min(((delay + 400) / totalDuration) * 100, 100);
        bootBar.style.width = progress + '%';
      }, delay));
    });

    bootTimers.push(setTimeout(() => {
      bootBar.style.width = '100%';
    }, totalDuration - 300));

    bootTimers.push(setTimeout(endBoot, totalDuration + 400));
  }

  bootSkip.addEventListener('click', () => {
    console.log('[BOOT] ===== SKIP BUTTON CLICKED =====');
    console.log('[BOOT] bootActive before endBoot: ' + bootActive);
    endBoot();
    console.log('[BOOT] bootActive after endBoot: ' + bootActive);
  });

  if (prefersReducedMotion || bootSeen) {
    console.log('[BOOT] Skipping boot sequence: reduced motion=' + prefersReducedMotion + ', bootSeen=' + bootSeen);
    bootOverlay.style.display = 'none';
    bootOverlay.style.visibility = 'hidden';
    console.log('[BOOT] Set overlay display=none + visibility=hidden');
    nav.classList.add('visible');
    revealsInitialized = true;
    initReveals();
  } else {
    console.log('[BOOT] Starting boot sequence - calling startBoot()');
    startBoot();
  }

  // Additional diagnostic
  setTimeout(() => {
    console.log('[BOOT:AFTER] bootActive=' + bootActive + ', overlay.display=' + bootOverlay.style.display);
  }, 100);

  // ── SCROLL REVEALS (IntersectionObserver) ──
  function initReveals() {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach((el) => observer.observe(el));

    // Pipeline activation
    const pipeline = document.querySelector('.pipeline');
    if (pipeline) {
      const pipeObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setTimeout(() => pipeline.classList.add('active'), 300);
              pipeObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      pipeObserver.observe(pipeline);
    }
  }

  // ── COMMAND PALETTE (elements already loaded above) ──
  const navCmdBtn = document.getElementById('nav-cmd-btn');
  const mobileCmdBtn = document.getElementById('mobile-cmd-btn');
  let cmdActiveIdx = -1;

  let lastFocusedElement = null;

  function openCmd() {
    if (bootActive) return; // Don't open cmd console during boot
    lastFocusedElement = document.activeElement;
    cmdBackdrop.removeAttribute('hidden');
    cmdInput.value = '';
    filterCmd('');
    cmdActiveIdx = -1;
    setTimeout(() => cmdInput.focus(), 50);
    document.body.style.overflow = 'hidden';
    console.log('[CMD] openCmd: hidden attr removed');
  }

  function closeCmd() {
    cmdBackdrop.setAttribute('hidden', '');
    cmdInput.value = '';
    document.body.style.overflow = '';
    if (lastFocusedElement && lastFocusedElement.focus) {
      lastFocusedElement.focus();
    }
    console.log('[CMD] closeCmd: hidden attr set');
  }

  function filterCmd(query) {
    const q = query.toLowerCase().trim();
    cmdItems.forEach((li) => {
      const text = li.textContent.toLowerCase();
      li.hidden = q.length > 0 && !text.includes(q);
    });
    cmdActiveIdx = -1;
    updateCmdActive();
  }

  function updateCmdActive() {
    const visible = [...cmdItems].filter((li) => !li.hidden);
    visible.forEach((li, i) => li.classList.toggle('active', i === cmdActiveIdx));
  }

  function execCmd(action) {
    closeCmd();
    closeMobileNav();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const behavior = reduce ? 'auto' : 'smooth';
    switch (action) {
      case 'hero':
        window.scrollTo({ top: 0, behavior });
        break;
      case 'projects':
        document.getElementById('projects')?.scrollIntoView({ behavior });
        break;
      case 'services':
        document.getElementById('services')?.scrollIntoView({ behavior });
        break;
      case 'workflow':
        document.getElementById('workflow')?.scrollIntoView({ behavior });
        break;
      case 'pricing':
        document.getElementById('pricing')?.scrollIntoView({ behavior });
        break;
      case 'briefing':
        document.getElementById('briefing')?.scrollIntoView({ behavior });
        break;
      case 'copy-email':
        copyEmail();
        break;
      case 'reboot':
        startBoot();
        break;
      case 'install':
        if (deferredPrompt) {
          deferredPrompt.prompt();
        } else {
          showToast('> PWA install not available on this browser');
        }
        break;
    }
  }

  cmdInput.addEventListener('input', () => filterCmd(cmdInput.value));
  cmdInput.addEventListener('keydown', (e) => {
    const visible = [...cmdItems].filter((li) => !li.hidden);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      cmdActiveIdx = Math.min(cmdActiveIdx + 1, visible.length - 1);
      updateCmdActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      cmdActiveIdx = Math.max(cmdActiveIdx - 1, 0);
      updateCmdActive();
    } else if (e.key === 'Enter' && cmdActiveIdx >= 0) {
      const action = visible[cmdActiveIdx]?.dataset?.action;
      if (action) execCmd(action);
    } else if (e.key === 'Escape') {
      closeCmd();
    }
  });

  cmdItems.forEach((li) => {
    li.addEventListener('click', () => {
      const action = li.dataset.action;
      if (action) execCmd(action);
    });
  });

  cmdBackdrop.addEventListener('click', (e) => {
    if (e.target === cmdBackdrop) closeCmd();
  });

  navCmdBtn?.addEventListener('click', openCmd);
  mobileCmdBtn?.addEventListener('click', openCmd);

  // Keyboard shortcut ⌘K / Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (cmdBackdrop.hidden) openCmd();
      else closeCmd();
    }
    if (e.key === 'Escape' && !cmdBackdrop.hidden) {
      e.preventDefault();
      closeCmd();
    }
  });

  // ── MOBILE NAV ──
  const navToggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  function closeMobileNav() {
    mobileNav.hidden = true;
    navToggle?.setAttribute('aria-expanded', 'false');
  }

  navToggle?.addEventListener('click', () => {
    const isOpen = !mobileNav.hidden;
    mobileNav.hidden = isOpen;
    navToggle.setAttribute('aria-expanded', !isOpen);
  });

  mobileNav?.querySelectorAll('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });

  // ── SERVICE ACCORDION ──
  const svcModules = document.querySelectorAll('.svc-module');
  svcModules.forEach((mod) => {
    const header = mod.querySelector('.svc-header');
    header.addEventListener('click', () => {
      const isOpen = mod.classList.contains('open');
      // Close all
      svcModules.forEach((m) => {
        m.classList.remove('open');
        m.querySelector('.svc-header').setAttribute('aria-expanded', 'false');
      });
      // Toggle clicked
      if (!isOpen) {
        mod.classList.add('open');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── COPY EMAIL ──
  const copyBtn = document.getElementById('copy-email-btn');

  function copyEmail() {
    navigator.clipboard.writeText('cod3blackagency@gmail.com').then(() => {
      showToast('> cod3blackagency@gmail.com copied to clipboard');
    }).catch(() => {
      showToast('> cod3blackagency@gmail.com');
    });
  }

  copyBtn?.addEventListener('click', copyEmail);
  document.getElementById('copy-email-btn-2')?.addEventListener('click', copyEmail);

  // ── TOAST ──
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  let toastTimer;

  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.hidden = true; }, 300);
    }, 2500);
  }

  // ── REBOOT (re-trigger boot sequence) ──
  document.getElementById('reboot-btn')?.addEventListener('click', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(startBoot, 400);
  });

  // ── SMOOTH SCROLL for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return; // allow default
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      closeMobileNav();
    });
  });

  // ── PWA INSTALL ──
  let deferredPrompt = null;
  const installBanner = document.getElementById('install-banner');
  const installBtn = document.getElementById('install-btn');
  const installDismiss = document.getElementById('install-dismiss');
  const iosInstructions = document.getElementById('ios-install-instructions');
  const iosInstructionsDismiss = document.getElementById('ios-instructions-dismiss');

  // Show iOS instructions if on iOS and not standalone
  if (isIOS && !isStandalone) {
    if (DEBUG) console.log('[PWA] iOS device detected, showing install instructions');
    if (iosInstructions) iosInstructions.hidden = false;
  } else if (!isIOS && !isStandalone) {
    // Android/Desktop — show beforeinstallprompt banner
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBanner) installBanner.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
      if (installBanner) installBanner.hidden = true;
      deferredPrompt = null;
      if (DEBUG) console.log('[PWA] App installed successfully');
    });

    installBtn?.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            if (DEBUG) console.log('[PWA] User accepted install');
          } else {
            if (DEBUG) console.log('[PWA] User dismissed install');
          }
          deferredPrompt = null;
        }).catch((err) => {
          if (DEBUG) console.warn('[PWA] Install error:', err);
        });
      } else {
        showToast('> PWA already installed or not available');
      }
    });

    installDismiss?.addEventListener('click', () => {
      if (installBanner) installBanner.hidden = true;
    });
  }

  // iOS instructions dismiss
  iosInstructionsDismiss?.addEventListener('click', () => {
    if (iosInstructions) iosInstructions.hidden = true;
  });

  // ── SERVICE WORKER REGISTRATION ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        if (DEBUG) console.warn('[SW] Registration failed:', err);
      });
    });
  }

  // ── MISSION BRIEFING WIZARD ──
  const briefState = {
    type: null,
    base: 0,
    pages: 3,
    features: [],
    featureCost: 0,
    timeline: null,
    timelineMult: 1,
    budget: null,
    step: 1
  };

  const briefStepLabel = document.getElementById('brief-step-label');
  const briefProgressBar = document.getElementById('brief-progress-bar');
  const briefBack = document.getElementById('brief-back');
  const briefNext = document.getElementById('brief-next');
  const briefSubmit = document.getElementById('brief-submit');
  const briefPagesInput = document.getElementById('brief-pages');
  const briefPagesVal = document.getElementById('brief-pages-val');

  // Estimate panel elements
  const estType = document.getElementById('est-type');
  const estScope = document.getElementById('est-scope');
  const estFeatures = document.getElementById('est-features');
  const estTimeline = document.getElementById('est-timeline');
  const estTotal = document.getElementById('est-total');

  function briefGoTo(step) {
    briefState.step = step;
    for (let i = 1; i <= 5; i++) {
      const panel = document.getElementById('brief-step-' + i);
      if (panel) panel.hidden = i !== step;
    }
    if (briefStepLabel) briefStepLabel.textContent = 'STEP ' + step + '/5';
    if (briefProgressBar) briefProgressBar.style.width = (step * 20) + '%';
    if (briefBack) briefBack.hidden = step === 1;
    if (briefNext) briefNext.hidden = step === 5;
    if (briefSubmit) briefSubmit.hidden = step !== 5;
  }

  function updateEstimate() {
    // Type
    if (estType) {
      const typeNames = { landing: 'Landing Page', pwa: 'PWA', ecommerce: 'E-Commerce', mobile: 'Mobile App', automation: 'Automation & AI', brand: 'Brand Identity' };
      estType.textContent = briefState.type ? typeNames[briefState.type] || '—' : '—';
    }
    // Scope
    if (estScope) {
      estScope.textContent = briefState.pages ? briefState.pages + ' pages' : '—';
    }
    // Features
    if (estFeatures) {
      estFeatures.textContent = briefState.features.length > 0 ? briefState.features.length + ' selected' : '—';
    }
    // Timeline
    if (estTimeline) {
      const tlNames = { rush: '🔥 Rush', standard: '⚡ Standard', flexible: '🕐 Flexible' };
      estTimeline.textContent = briefState.timeline ? (tlNames[briefState.timeline] || '—') : '—';
    }
    // Total estimate
    if (estTotal) {
      if (!briefState.type) {
        estTotal.textContent = '$0 – $0';
        return;
      }
      const pageMult = Math.max(1, (briefState.pages - 1) * 0.15 + 1);
      const baseLow = briefState.base * pageMult + briefState.featureCost;
      const baseHigh = baseLow * 1.8;
      const low = Math.round(baseLow * briefState.timelineMult / 50) * 50;
      const high = Math.round(baseHigh * briefState.timelineMult / 50) * 50;
      estTotal.textContent = '$' + low.toLocaleString() + ' – $' + high.toLocaleString();
    }
  }

  // Step 1: Project type selection
  document.querySelectorAll('#brief-type-options .brief-option').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#brief-type-options .brief-option').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      briefState.type = btn.dataset.type;
      briefState.base = parseInt(btn.dataset.base, 10) || 0;
      updateEstimate();
    });
  });

  // Step 2: Pages range
  if (briefPagesInput) {
    briefPagesInput.addEventListener('input', function() {
      briefState.pages = parseInt(briefPagesInput.value, 10);
      if (briefPagesVal) briefPagesVal.textContent = briefState.pages;
      updateEstimate();
    });
  }

  // Step 2: Feature checkboxes
  document.querySelectorAll('.brief-check input[type="checkbox"]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      briefState.features = [];
      briefState.featureCost = 0;
      document.querySelectorAll('.brief-check input[type="checkbox"]:checked').forEach(function(checked) {
        briefState.features.push(checked.value);
        briefState.featureCost += parseInt(checked.dataset.cost, 10) || 0;
      });
      updateEstimate();
    });
  });

  // Step 3: Timeline selection
  document.querySelectorAll('[data-timeline]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-timeline]').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      briefState.timeline = btn.dataset.timeline;
      briefState.timelineMult = parseFloat(btn.dataset.mult) || 1;
      updateEstimate();
    });
  });

  // Step 3: Budget selection
  document.querySelectorAll('[data-budget]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('[data-budget]').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      briefState.budget = btn.dataset.budget;
    });
  });

  // Navigation
  if (briefNext) {
    briefNext.addEventListener('click', function() {
      if (briefState.step === 1 && !briefState.type) {
        showToast('> Select a mission type to continue');
        return;
      }
      if (briefState.step < 5) briefGoTo(briefState.step + 1);
    });
  }

  if (briefBack) {
    briefBack.addEventListener('click', function() {
      if (briefState.step > 1) briefGoTo(briefState.step - 1);
    });
  }

  // Submit
  if (briefSubmit) {
    briefSubmit.addEventListener('click', function() {
      var name = document.getElementById('brief-name')?.value || '';
      var email = document.getElementById('brief-email')?.value || '';
      if (!name.trim() || !email.trim()) {
        showToast('> Name and email required to transmit briefing');
        return;
      }

      var vision = document.getElementById('brief-vision')?.value || '';
      var assets = document.getElementById('brief-assets')?.value || '';
      var phone = document.getElementById('brief-phone')?.value || '';

      var payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        type: briefState.type,
        pages: briefState.pages,
        features: briefState.features,
        timeline: briefState.timeline,
        budget: briefState.budget,
        estimate: estTotal?.textContent || 'N/A',
        vision: vision.trim(),
        assets: assets.trim(),
      };

      briefSubmit.disabled = true;
      briefSubmit.textContent = '⏳ Transmitting…';

      fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function(res) { return res.json().then(function(d) { return { ok: res.ok, data: d }; }); })
        .then(function(result) {
          if (result.ok) {
            showToast('> Briefing transmitted — confirmation sent to ' + email.trim());
            briefSubmit.textContent = '✅ Briefing Sent';
          } else {
            throw new Error(result.data.error || 'Transmission failed');
          }
        })
        .catch(function(err) {
          console.warn('[BRIEF] API error, falling back to mailto:', err);
          var subject = 'Mission Briefing: ' + (briefState.type || 'General') + ' — via codewithsolo.com';
          var body = 'MISSION BRIEFING — codewithsolo.com\n================================\n\n';
          body += 'Name: ' + name + '\nEmail: ' + email + '\n';
          if (phone) body += 'Phone: ' + phone + '\n';
          body += '\nProject Type: ' + (briefState.type || 'Not specified') + '\n';
          body += 'Pages/Screens: ' + briefState.pages + '\n';
          body += 'Features: ' + (briefState.features.length > 0 ? briefState.features.join(', ') : 'None selected') + '\n';
          body += 'Timeline: ' + (briefState.timeline || 'Not specified') + '\n';
          body += 'Budget: ' + (briefState.budget || 'Not specified') + '\n';
          body += 'Estimate: ' + (estTotal?.textContent || 'N/A') + '\n';
          body += '\nVision:\n' + vision + '\n\nExisting Assets:\n' + assets + '\n';
          window.location.href = 'mailto:cod3blackagency@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          showToast('> Redirecting to email client…');
          briefSubmit.disabled = false;
          briefSubmit.textContent = '📡 Transmit Briefing';
        });
    });
  }

})();
