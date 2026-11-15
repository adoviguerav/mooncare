// Moon Care pitch page: team, language switch, countdown, reveal on scroll, Earth and the live demo.
(function(){
  // ---- Team: add full names here. role is a key from i18n.js (role_backend, role_frontend, ...).
  var TEAM = [
    {name:"Adolfo", role:"role_backend"},
    {name:"Ivan",   role:"role_backend"},
    {name:"Becky",  role:"role_frontend"},
    {name:"Alex",   role:"role_frontend"}
  ];

  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LANGS = ["en","es","ca"], HTML_LANG = {en:"en", es:"es", ca:"ca"};
  var lang = "en";

  function t(k){ var d = I18N[lang] || I18N.en; return d[k] !== undefined ? d[k] : (I18N.en[k] !== undefined ? I18N.en[k] : k); }

  function drawTeam(){
    document.getElementById("teamGrid").innerHTML = TEAM.map(function(m, i){
      return '<div class="glass mate rv in d' + (i % 4 + 1) + '"><div class="av">' + m.name.charAt(0) + '</div><b>' + m.name + '</b><span>' + t(m.role) + '</span></div>';
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
      var tag = e.tagName === "UL" ? "li" : "div";
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
  if (!RM && "IntersectionObserver" in window) {
    document.documentElement.classList.add("anim");
    var show = function(e){ e.classList.add("in"); };
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ show(e.target); io.unobserve(e.target); } });
    }, {threshold:.05});
    els.forEach(function(e){ io.observe(e); });
    var check = function(){ var h = innerHeight || document.documentElement.clientHeight; els.forEach(function(e){ if (!e.classList.contains("in") && e.getBoundingClientRect().top < h) show(e); }); };
    addEventListener("scroll", check, {passive:true}); addEventListener("resize", check);
    setTimeout(check, 400);
    setTimeout(function(){ els.forEach(show); }, 3000);   // failsafe: everything visible after 3 s
  }


  // Earth rising behind "back on Earth": Alex's procedural Earth, slowly turning
  (function(){
    var cv = document.getElementById("earthHz"), E = window.MoonCareEarth;
    if (!cv || !E) return;
    var cx = cv.getContext("2d"), w = 0, h = 0, dpr = 1, raf = null, last = 0, t0 = performance.now();
    function size(){ var r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr); }
    function draw(now){
      var t = (now - t0) / 1000;
      E.render(t * 0.05 + 2.2, t * 0.065 + 2.2);
      cx.setTransform(dpr,0,0,dpr,0,0); cx.clearRect(0,0,w,h);
      var R = Math.max(Math.min(w * 0.34, 430), 150), ex = w / 2, ey = h * 0.16 + R;   // a half-risen globe, kept small enough to stay sharp
      // outer haze and atmosphere rim
      var g = cx.createRadialGradient(ex, ey, R * 0.98, ex, ey, R * 1.16);
      g.addColorStop(0, "rgba(120,200,255,0.55)"); g.addColorStop(0.25, "rgba(70,150,255,0.22)"); g.addColorStop(1, "rgba(47,120,255,0)");
      cx.fillStyle = g; cx.beginPath(); cx.arc(ex, ey, R * 1.16, 0, 6.2832); cx.fill();
      cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
      cx.drawImage(E.canvas, ex - R, ey - R, R * 2, R * 2);
      // thin bright limb
      cx.strokeStyle = "rgba(170,225,255,0.55)"; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(ex, ey, R + 0.5, Math.PI * 1.05, Math.PI * 1.95); cx.stroke();
    }
    function loop(now){ raf = requestAnimationFrame(loop); if (now - last < 66) return; last = now; draw(now); }
    size(); draw(performance.now());
    addEventListener("resize", function(){ size(); draw(performance.now()); });
    if (!RM && "IntersectionObserver" in window) {
      new IntersectionObserver(function(es){ es.forEach(function(e){
        if (e.isIntersecting && raf === null) raf = requestAnimationFrame(loop);
        else if (!e.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
      }); }).observe(cv);
    }
  })();

  // live demo: load the app only when asked
  document.getElementById("demoStart").addEventListener("click", function(){
    var f = document.createElement("iframe");
    f.src = "demo/index.html";
    f.title = t("try_iframe");
    var s = document.getElementById("demoScreen");
    s.innerHTML = ""; s.appendChild(f); f.focus();
  });
})();
