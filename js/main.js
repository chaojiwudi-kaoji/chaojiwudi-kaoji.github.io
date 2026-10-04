/* ==========================================================================
   绿野仙踪 · 森系水彩手账作品集  ——  js/main.js
   --------------------------------------------------------------------------
   【本次改动 v3.0】
   1) 入场特效：飘落叶片粒子层（其余入场动画由 CSS 承担：
      整体淡入 / 主纸飘落 / 卡片错落弹出 / 藤蔓浮现 / 邮戳压印）
   2) 页面切换：导航点击 → 整页淡出 → 跳转 → 新页淡入
   3) 滚动滑入：IntersectionObserver 给 .reveal 元素依次滑入淡入
   4) 成片视频：封面卡点击 → 平滑展开播放器；章节时间码点击跳转
   5) 折叠交互：项目简介 / 剧本分组横幅 / 分镜便签 展开收起
   6) 图库灯箱：点击放大、左右切换、Esc / 点背景关闭、键盘 ←→
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     1. 飘落叶片粒子
     ====================================================================== */
  function initDrift() {
    var box = document.getElementById('drift');
    if (!box || reduceMotion) return;

    var count = window.innerWidth < 760 ? 5 : 9;
    for (var i = 0; i < count; i++) {
      var w = 14 + Math.random() * 18;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 12');
      svg.setAttribute('class', 'drift__leaf');
      svg.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#tinyLeaf');
      svg.appendChild(use);

      svg.style.left = (Math.random() * 100) + '%';
      svg.style.width = w + 'px';
      svg.style.height = (w * 0.5) + 'px';
      svg.style.animationDuration = (17 + Math.random() * 17) + 's';
      svg.style.animationDelay = (-Math.random() * 30) + 's';
      svg.style.opacity = '0';
      box.appendChild(svg);
    }
  }

  /* ======================================================================
     1.5 入场遮罩：纸张洇开（动画结束后移除，避免长期占用图层）
     ====================================================================== */
  function initIntro() {
    var intro = document.querySelector('.intro');
    if (!intro) return;
    if (reduceMotion) { intro.parentNode.removeChild(intro); return; }
    setTimeout(function () {
      if (intro.parentNode) intro.parentNode.removeChild(intro);
    }, 2000);
  }

  /* ======================================================================
     2. 页面切换淡入淡出
     ====================================================================== */
  function initPageTransition() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;

      var href = a.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return;
      if (!/\.html?(\?|#|$)/.test(href)) return;

      var current = location.pathname.split('/').pop() || 'index.html';
      if (href === current) { e.preventDefault(); return; }

      var page = document.querySelector('.page');
      if (!page || reduceMotion) return;

      e.preventDefault();
      page.classList.add('is-leaving');
      setTimeout(function () { location.href = href; }, 300);
    });
  }

  /* ======================================================================
     3. 滚动滑入淡入
     ====================================================================== */
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

    items.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i, 5) * 0.07) + 's';
      io.observe(el);
    });
  }

  /* ======================================================================
     4. 成片视频：封面展开 + 章节跳转
     ====================================================================== */
  function initFilm() {
    var cover  = document.getElementById('filmcover');
    var player = document.getElementById('filmplayer');
    if (!cover || !player) return;

    var hint  = document.getElementById('filmhint');
    var video = document.getElementById('filmvideo');
    var chips = Array.prototype.slice.call(document.querySelectorAll('#chapters .chip'));
    var opened = false;

    function openFilm(cb) {
      if (opened) { if (cb) cb(); return; }
      opened = true;

      cover.classList.add('is-gone');
      if (hint) hint.style.display = 'none';

      setTimeout(function () {
        cover.style.display = 'none';
        player.classList.add('is-open');
        setTimeout(function () {
          try { player.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (err) { }
          if (cb) cb();
        }, 320);
      }, reduceMotion ? 0 : 620);
    }

    cover.addEventListener('click', function () { openFilm(); });
    cover.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); openFilm();
      }
    });

    function seek(t, chip) {
      if (!video) return;
      try {
        video.currentTime = t;
        var p = video.play();
        if (p && p.catch) p.catch(function () { });
      } catch (err) { }
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      if (chip) chip.classList.add('is-active');
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var t = parseFloat(chip.getAttribute('data-t') || '0');
        if (!opened) { openFilm(function () { seek(t, chip); }); }
        else { seek(t, chip); }
      });
    });

    /* 播放到某镜头时自动高亮对应章节 */
    if (video && chips.length) {
      video.addEventListener('timeupdate', function () {
        var ct = video.currentTime, active = null;
        for (var i = chips.length - 1; i >= 0; i--) {
          var t = parseFloat(chips[i].getAttribute('data-t') || '0');
          if (ct >= t - 0.4) { active = chips[i]; break; }
        }
        if (active && !active.classList.contains('is-active')) {
          chips.forEach(function (c) { c.classList.remove('is-active'); });
          active.classList.add('is-active');
        }
      });
    }
  }

  /* ======================================================================
     5. 折叠交互：项目简介 / 剧本分组横幅 / 分镜便签
     ====================================================================== */
  function bindToggle(el, head, onToggle) {
    if (!head) return;
    function fire() {
      var on = el.classList.toggle('is-open');
      head.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (onToggle) onToggle(on);
    }
    head.addEventListener('click', fire);
    head.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault(); fire();
      }
    });
  }

  function initFolds() {
    /* 项目简介折叠便签 */
    Array.prototype.forEach.call(document.querySelectorAll('.fold'), function (f) {
      bindToggle(f, f.querySelector('.fold__head'));
    });

    /* 剧本 / 字幕 两大分组横幅 */
    Array.prototype.forEach.call(document.querySelectorAll('.group'), function (g) {
      bindToggle(g, g.querySelector('.group__banner'));
    });

    /* 单张分镜便签（点击放大展开 / 再点收回） */
    Array.prototype.forEach.call(document.querySelectorAll('.note'), function (n) {
      n.setAttribute('tabindex', '0');
      n.setAttribute('role', 'button');
      bindToggle(n, n);
    });
  }

  /* ======================================================================
     6. 图库灯箱
     ====================================================================== */
  function initLightbox() {
    var lb = document.getElementById('lightbox');
    if (!lb) return;

    var figs = Array.prototype.slice.call(document.querySelectorAll('#wall .photo'));
    if (!figs.length) return;

    var items = figs.map(function (fig) {
      var im = fig.querySelector('img');
      return {
        src: im ? im.getAttribute('src') : '',
        alt: im ? (im.getAttribute('alt') || '') : '',
        title: fig.getAttribute('data-title') || (im ? im.getAttribute('alt') : '') || '',
        desc: fig.getAttribute('data-desc') || ''
      };
    });

    var imgEl = document.getElementById('lbImg');
    var tEl = document.getElementById('lbTitle');
    var dEl = document.getElementById('lbDesc');
    var iEl = document.getElementById('lbIdx');
    var cur = 0;

    function show(i) {
      cur = (i + items.length) % items.length;
      var it = items[cur];
      if (imgEl) { imgEl.src = it.src; imgEl.alt = it.alt || it.title; }
      if (tEl) tEl.textContent = it.title;
      if (dEl) dEl.textContent = it.desc;
      if (iEl) iEl.textContent = (cur + 1) + ' / ' + items.length;

      /* 重新触发淡入动画 */
      if (imgEl && !reduceMotion) {
        imgEl.style.animation = 'none';
        /* 强制重排后再播放 */
        void imgEl.offsetWidth;
        imgEl.style.animation = '';
      }
    }

    function open(i) {
      show(i);
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    figs.forEach(function (fig, i) {
      fig.setAttribute('tabindex', '0');
      fig.addEventListener('click', function () { open(i); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault(); open(i);
        }
      });
    });

    var btnClose = document.getElementById('lbClose');
    var btnPrev = document.getElementById('lbPrev');
    var btnNext = document.getElementById('lbNext');
    if (btnClose) btnClose.addEventListener('click', close);
    if (btnPrev) btnPrev.addEventListener('click', function (e) { e.stopPropagation(); show(cur - 1); });
    if (btnNext) btnNext.addEventListener('click', function (e) { e.stopPropagation(); show(cur + 1); });

    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });

    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(cur - 1);
      else if (e.key === 'ArrowRight') show(cur + 1);
    });

    /* 触屏左右滑动切换 */
    var tx = null;
    lb.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) tx = e.touches[0].clientX;
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = (e.changedTouches[0].clientX - tx);
      if (Math.abs(dx) > 46) show(dx > 0 ? cur - 1 : cur + 1);
      tx = null;
    }, { passive: true });
  }

  /* ======================================================================
     7. 启动
     ====================================================================== */
  function boot() {
    initIntro();
    initDrift();
    initPageTransition();
    initReveal();
    initFilm();
    initFolds();
    initLightbox();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
