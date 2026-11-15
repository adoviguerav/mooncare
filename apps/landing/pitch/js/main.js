// Moon Care pitch page: team, language switch, reveal on scroll, Earth, menu and progress, and the mini demos.
(function(){
  // ---- Team. role and bio are keys from i18n.js; the bio comes from each person's public LinkedIn headline.
  var TEAM = [
    {name:"Adolfo Viguera Varea",     initials:"AV", photo:"img/team/adolfo.webp", role:"role_backend",  bio:"bio_adolfo", url:"https://www.linkedin.com/in/adolfoviguera/", web:"https://adolfoviguera.com"},
    {name:"Ivan Castaño Carrillo",    initials:"IC", photo:"img/team/ivan.webp", role:"role_backend",  bio:"bio_ivan",   url:"https://www.linkedin.com/in/ivancastanocarrillo/", web:"https://ivancastano.com"},
    {name:"Rebecca Sarah Pearce",     initials:"RP", photo:"img/team/becky.webp", role:"role_frontend", bio:"bio_becky",  url:"https://www.linkedin.com/in/rebecca-sarah-pearce-607b90131/"},
    {name:"Àlex Jiménez Roldán",      initials:"ÀJ", photo:"img/team/alex.webp", role:"role_frontend", bio:"bio_alex",   url:"https://www.linkedin.com/in/jiro2405/"},
    {name:"Àngels Gonzalez de Regàs", initials:"ÀG", photo:"img/team/angels.webp", role:"role_research", bio:"bio_angels", url:"https://www.linkedin.com/in/angels-gonzalez-regas/"}
  ];
  var WEB_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z"/></svg>';
  var LINKEDIN_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>';

  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LANGS = ["en","es","ca"], HTML_LANG = {en:"en", es:"es", ca:"ca"};
  var lang = "en";

  function t(k){ var d = I18N[lang] || I18N.en; return d[k] !== undefined ? d[k] : (I18N.en[k] !== undefined ? I18N.en[k] : k); }

  function drawTeam(){
    document.getElementById("teamGrid").innerHTML = TEAM.map(function(m, i){
      return '<div class="glass mate rv in d' + (i % 4 + 1) + '"><div class="av"><img src="' + m.photo + '" alt="" width="180" height="180" loading="lazy" onerror="this.remove()"><i>' + m.initials + '</i></div><b>' + m.name + '</b><span>' + t(m.role) + '</span>' +
        '<p class="bio">' + t(m.bio) + '</p>' +
        '<a class="li" href="' + m.url + '" target="_blank" rel="noopener" aria-label="' + m.name + ' · LinkedIn">' + LINKEDIN_ICON + '<span>LinkedIn</span></a>' +
        (m.web ? '<a class="li" href="' + m.web + '" target="_blank" rel="noopener" aria-label="' + m.name + ' · Portfolio">' + WEB_ICON + '<span>Portfolio</span></a>' : '') + '</div>';
    }).join("");
  }

  function apply(l){
    lang = LANGS.indexOf(l) >= 0 ? l : "en";
    document.documentElement.lang = HTML_LANG[lang];
    document.title = t("meta_title");
    var md = document.querySelector('meta[name="description"]'); if (md) md.content = t("meta_desc");
    document.querySelectorAll("[data-t]").forEach(function(e){ e.innerHTML = t(e.dataset.t); });
    document.querySelectorAll("[data-ta]").forEach(function(e){ e.alt = t(e.dataset.ta); });
    document.querySelectorAll("[data-tl]").forEach(function(e){ e.setAttribute("aria-label", t(e.dataset.tl)); });
    document.querySelectorAll("[data-list]").forEach(function(e){
      var tag = /^(UL|OL)$/.test(e.tagName) ? "li" : "div";
      e.innerHTML = t(e.dataset.list).map(function(x){ return "<" + tag + ">" + x + "</" + tag + ">"; }).join("");
    });
    document.querySelectorAll("#langs button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    drawTeam();
    if (window.setIntroTagline) window.setIntroTagline(t("intro_tagline"));
    try { localStorage.setItem("mooncare-pitch-lang", lang); } catch(e){}
  }

  document.getElementById("langs").addEventListener("click", function(e){
    var b = e.target.closest("button[data-lang]"); if (b) apply(b.dataset.lang);
  });

  // phone and tablet menu
  var menuBtn = document.getElementById("menuBtn");
  function setMenu(open){
    document.getElementById("nav").classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  }
  menuBtn.addEventListener("click", function(e){ e.stopPropagation(); setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  document.getElementById("navlinks").addEventListener("click", function(e){ if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", function(e){ if (!e.target.closest("#nav")) setMenu(false); });
  addEventListener("keydown", function(e){ if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true"){ setMenu(false); menuBtn.focus(); } });
  addEventListener("resize", function(){ if (innerWidth > 860) setMenu(false); });

  // nav background after scrolling
  var nav = document.getElementById("nav");
  function onScroll(){ nav.classList.toggle("solid", scrollY > 40); }
  addEventListener("scroll", onScroll, {passive:true}); onScroll();


  // first language: English, unless the visitor picked another one before
  var saved = null; try { saved = localStorage.getItem("mooncare-pitch-lang"); } catch(e){}
  apply(saved || "en");

  // reveal on scroll. Content is visible by default; the fade-in is added only where it can work,
  // with fallbacks so nothing can stay hidden (some embedded viewers do not report scrolling).
  var els = [].slice.call(document.querySelectorAll(".rv"));
  // each section slides in from the side, alternating left and right down the page;
  // in two-column rows each column comes from its own side
  function setSlides(){
    var d = Math.round(Math.min(280, Math.max(70, innerWidth * 0.2))), wide = innerWidth > 900, side = -1;
    document.querySelectorAll("main > section:not(.hero)").forEach(function(sec){
      sec.querySelectorAll(".rv").forEach(function(e){
        var sx = side * d;
        if (wide && e.closest(".row")) {
          var r = e.getBoundingClientRect();
          sx = (r.left + r.width / 2 < innerWidth / 2 ? -1 : 1) * d;
        }
        e.style.setProperty("--sx", sx.toFixed(0) + "px");
        e.style.setProperty("--sy", "0px");
      });
      side = -side;
    });
  }
  if (!RM) { setSlides(); addEventListener("resize", setSlides); }
  // Reveal by vertical position while scrolling. The sideways offset does not change an
  // element's top, so narrow items pushed off screen still reveal, in any viewer.
  if (!RM) {
    document.documentElement.classList.add("anim");
    var pending = els.slice(), queued = false;
    var check = function(){
      queued = false;
      var h = innerHeight || document.documentElement.clientHeight;
      pending = pending.filter(function(e){
        var r = e.getBoundingClientRect();
        if (r.top < h * 0.8 || r.bottom < 0) { e.classList.add("in"); return false; }
        return true;
      });
    };
    var queue = function(){ if (!queued){ queued = true; requestAnimationFrame(check); } };
    addEventListener("scroll", queue, {passive:true});
    addEventListener("resize", queue);
    addEventListener("hashchange", function(){ setTimeout(check, 60); });
    setTimeout(check, 300);
    // embedded viewers that grow the frame to the page height never scroll inside it: show all
    setTimeout(function(){
      if (document.documentElement.scrollHeight <= innerHeight + 40) els.forEach(function(e){ e.classList.add("in"); });
    }, 800);
  }


  // Earth rising behind "back on Earth": Alex's procedural Earth, slowly turning
  (function(){
    var cv = document.getElementById("earthHz"), E = window.MoonCareEarth;
    if (!cv || !E) return;
    var cx = cv.getContext("2d"), w = 0, h = 0, dpr = 1, raf = null, last = 0, t0 = performance.now(), spinBoost = 0, lastRender = -1e9, lastSpin = -1;
    function size(){ var r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
    function draw(now){
      var t = (now - t0) / 1000;
      cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,w,h);
      // Scroll-linked journey, like Alex's intro at the top: a close-up horizon pulls back to the
      // whole globe, then the Earth keeps turning as it drifts right and shrinks into the distance.
      var rc = cv.getBoundingClientRect(), vh = innerHeight || h;
      var p = RM ? 1 : Math.max(0, Math.min(1, (vh * 1.05 - (rc.top + h / 2)) / (vh * 0.7)));
      var sm = function(x){ x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
      var e1 = sm(p / 0.5), e2 = sm((p - 0.5) / 0.5);
      var Rf = Math.min(w * 0.3, h * 0.34, 300), R0 = Math.max(w * 0.62, 520), Rs = Math.max(w * 0.045, 24);
      var R = R0 * Math.pow(Rf / R0, e1), ex = w / 2, ey = (h * 0.42 + R0) + (h * 0.46 - (h * 0.42 + R0)) * e1;
      if (e2 > 0) {
        R = Rf * Math.pow(Rs / Rf, e2);
        ex = w / 2 + ((w - Rs * 2.4) - w / 2) * e2;
        ey = h * 0.46 + (h * 0.34 - h * 0.46) * e2;
      }
      spinBoost = p * 3.2;
      // redraw the globe fast only while it is big; a small far-off Earth needs few updates
      if (now - lastRender > (R > 200 ? 66 : 220) || lastSpin !== spinBoost) {
        E.render(t * 0.05 + 2.2 + spinBoost, t * 0.065 + 2.2 + spinBoost * 1.2); lastRender = now; lastSpin = spinBoost;
      }
      // outer haze and atmosphere rim
      var g = cx.createRadialGradient(ex, ey, R * 0.98, ex, ey, R * 1.16);
      g.addColorStop(0, "rgba(120,200,255,0.55)"); g.addColorStop(0.25, "rgba(70,150,255,0.22)"); g.addColorStop(1, "rgba(47,120,255,0)");
      cx.fillStyle = g; cx.beginPath(); cx.arc(ex, ey, R * 1.16, 0, 6.2832); cx.fill();
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
      cx.drawImage(E.canvas, ex - R, ey - R, R * 2, R * 2);
      // thin bright limb
      cx.strokeStyle = "rgba(170,225,255,0.55)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ex, ey, R + 0.5, 0, 6.2832); cx.stroke();
    }
    var lastY = -1;
    function loop(now){ raf = requestAnimationFrame(loop); var moved = scrollY !== lastY; if (!moved && now - last < 66) return; last = now; lastY = scrollY; draw(now); }
    size(); draw(performance.now());
    addEventListener("resize", function(){ size(); draw(performance.now()); });
    if (!RM && "IntersectionObserver" in window) {
      new IntersectionObserver(function(es){ es.forEach(function(e){
        if (e.isIntersecting && raf === null) raf = requestAnimationFrame(loop);
        else if (!e.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      }); }).observe(cv);
    }
  })();

  // ---- extra polish: menu highlight, progress bar, tilting screenshots, counting stats
  var prog = document.getElementById("prog");
  var navLinks = [].slice.call(document.querySelectorAll('nav.top ul a'));
  var secs = navLinks.map(function(a){ return document.querySelector(a.getAttribute("href")); });
  var tilts = [].slice.call(document.querySelectorAll(".device.tilt"));
  var ticking = false;
  function onFrame(){
    ticking = false;
    var h = innerHeight, max = document.documentElement.scrollHeight - h;
    prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4) + ")";
    var cur = -1;
    secs.forEach(function(sec, i){ if (sec && sec.getBoundingClientRect().top < h * 0.4) cur = i; });
    navLinks.forEach(function(a, i){ a.classList.toggle("on", i === cur); });
    if (!RM && innerWidth > 900) tilts.forEach(function(d){
      var r = d.getBoundingClientRect(), c = (r.top + r.height / 2) / h;
      var k = Math.min(1, Math.abs(c - 0.5) * 2), sign = d.closest(".row.flip") ? 1 : -1;
      d.style.setProperty("--ry", (sign * 9 * k).toFixed(2)); d.style.setProperty("--rx", (4 * k).toFixed(2));
    });
  }
  addEventListener("scroll", function(){ if (!ticking){ ticking = true; requestAnimationFrame(onFrame); } }, {passive:true});
  addEventListener("resize", onFrame); onFrame();

  var nums = [].slice.call(document.querySelectorAll(".stat .num"));
  function countUp(){
    var t0 = performance.now(), D = 1400;
    nums.forEach(function(n){ n.textContent = "0"; });
    (function step(now){
      var p = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - p, 3);
      nums.forEach(function(n){ n.textContent = Math.round(+n.dataset.to * e); });
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if (!RM && "IntersectionObserver" in window) {
    var so = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ countUp(); so.disconnect(); } }); }, {threshold:.4});
    so.observe(document.querySelector(".stats"));
  }

  // the mini demos: each one loads only when asked, inside its own frame
  document.querySelectorAll(".poster[data-demo]").forEach(function(poster){
    poster.addEventListener("click", function(){
      var f = document.createElement("iframe");
      f.src = poster.dataset.demo;
      f.title = poster.getAttribute("aria-label") || t("try_iframe");
      var screen = poster.parentNode;
      screen.innerHTML = ""; screen.appendChild(f); f.focus();
      fitPhones();
    });
  });

  // The crew app lays itself out for a phone 390 px wide; the frame on the page is narrower, so it is scaled
  function fitPhones(){
    document.querySelectorAll(".phone .screen").forEach(function(s){
      var f = s.querySelector("iframe"); if (f) f.style.transform = "scale(" + (s.clientWidth / 390) + ")";
    });
  }
  addEventListener("resize", fitPhones);
})();
