/* ═══════════════════════════════════════════════════════
   CODEWITHSOLO — app.js
   Boot Sequence · Command Palette · Scroll Reveals
   PWA Install · Service Accordion · Interactions
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── BOOT LOGGER (Capture logs to DOM for debugging) ──
  const logContainer = document.createElement('div');
  logContainer.id = 'boot-logger';
  logContainer.style.cssText = 'position: fixed; bottom: 20px; left: 20px; background: rgba(0,0,0,0.9); color: #00ff88; font-family: monospace; font-size: 11px; padding: 12px; max-width: 300px; max-height: 200px; overflow-y: auto; z-index: 99999; border: 1px solid #00ff88; border-radius: 4px;';
  document.body.appendChild(logContainer);

  const originalLog = console.log;
  console.log = function(...args) {
    originalLog(...args);
    const msg = args.join(' ');
    if (msg.includes('[BOOT')) {
      const logItem = document.createElement('div');
      logItem.style.cssText = 'padding: 3px 0; border-bottom: 1px solid rgba(0,255,136,0.2);';
      logItem.textContent = msg;
      logContainer.appendChild(logItem);
      logContainer.scrollTop = logContainer.scrollHeight;
    }
  };

  // ── BOOT SEQUENCE ──
  const bootOverlay = document.getElementById('boot-overlay');
  const bootBody = document.getElementById('boot-body');
  const bootBar = document.getElementById('boot-progress-bar');
  const bootSkip = document.getElementById('boot-skip');
  const nav = document.getElementById('nav');

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
    const lines = bootBody.querySelectorAll('.boot-line');
    lines.forEach((line) => line.classList.remove('visible'));
    bootBar.style.width = '0%';
    bootOverlay.classList.remove('fade-out');
    bootOverlay.style.display = 'flex'; // EXPLICIT display value
    bootOverlay.style.visibility = 'visible'; // Restore visibility
    bootOverlay.style.pointerEvents = ''; // Reset pointer-events
    document.body.style.overflow = 'hidden';
    console.log('[BOOT] boot sequence started, display/visibility/pointerEvents restored');

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
    console.log('[BOOT] Set overlay display=none, overlay.style.display is now: ' + bootOverlay.style.display);
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

  // ── COMMAND PALETTE ──
  const cmdBackdrop = document.getElementById('cmd-backdrop');
  const cmdInput = document.getElementById('cmd-input');
  const cmdList = document.getElementById('cmd-list');
  const cmdItems = cmdList.querySelectorAll('li');
  const navCmdBtn = document.getElementById('nav-cmd-btn');
  const mobileCmdBtn = document.getElementById('mobile-cmd-btn');
  let cmdActiveIdx = -1;

  function openCmd() {
    cmdBackdrop.hidden = false;
    cmdInput.value = '';
    filterCmd('');
    cmdActiveIdx = -1;
    setTimeout(() => cmdInput.focus(), 50);
    document.body.style.overflow = 'hidden';
  }

  function closeCmd() {
    cmdBackdrop.hidden = true;
    cmdInput.value = '';
    document.body.style.overflow = '';
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
    switch (action) {
      case 'hero':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'projects':
        document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'services':
        document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'workflow':
        document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'contact':
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
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
    if (e.key === 'Escape' && !cmdBackdrop.hidden) closeCmd();
    if (e.key === 'Escape' && bootActive) endBoot();
  });

  // ── MOBILE NAV ──
  const navToggle = document.getElementById('nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');

  function closeMobileNav() {
    mobileNav.hidden = true;
  }

  navToggle?.addEventListener('click', () => {
    mobileNav.hidden = !mobileNav.hidden;
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
    navigator.clipboard.writeText('silverwatkins@gmail.com').then(() => {
      showToast('> silverwatkins@gmail.com copied to clipboard');
    }).catch(() => {
      showToast('> silverwatkins@gmail.com');
    });
  }

  copyBtn?.addEventListener('click', copyEmail);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(startBoot, 400);
  });

  // ── SMOOTH SCROLL for anchor links ──
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        closeMobileNav();
      }
    });
  });

  // ── PWA INSTALL ──
  let deferredPrompt = null;
  const installBanner = document.getElementById('install-banner');
  const installBtn = document.getElementById('install-btn');
  const installDismiss = document.getElementById('install-dismiss');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.hidden = false;
  });

  installBtn?.addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        installBanner.hidden = true;
      });
    }
  });

  installDismiss?.addEventListener('click', () => {
    installBanner.hidden = true;
  });

  // ── SERVICE WORKER REGISTRATION ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

})();
