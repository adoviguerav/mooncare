// Moon Care pitch page: "journey outward" background.
// - A sky that slowly turns, as if seen from the Moon: the whole star field rotates around a
//   point below the screen. Scrolling turns it a little further, near stars faster than far ones.
// - A sky tint that follows the story: Earth blue, Moon grey at the stats row, Mars red at
//   the line below it, amber during the emergency section.
// - (A solar wind for a flare section is kept below but switched off: the emergency is an infection.)
// - An occasional shooting star.
// Pauses when the tab is hidden. With "reduce motion" the stars and tint stay, without animation.
(function () {
  var cv = document.getElementById("bg");
  if (!cv) return;
  var cx = cv.getContext("2d");
  var RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, DPR = 1, stars = [], wind = [], meteors = [];
  var raf = null, lastT = 0, nextMeteor = 4;
  var windOn = false, windLevel = 0;

  // ---- story colours: [selector, r, g, b, alpha]
  var STOPS = [
    ["#top",         40, 130, 255, 0.10],
    ["#problem h2",  40, 150, 255, 0.10],   // near Earth
    [".stats",      170, 185, 210, 0.10],   // the Moon
    [".punch",      255,  80,  50, 0.13],   // Mars
    [".solution",    47, 216, 255, 0.07],
    ["#product .rows", 47, 216, 255, 0.07],
    ["#emergency",  255, 170,  60, 0.12],
    ["#mission",     47, 216, 255, 0.07],
    ["#science",    124,  92, 255, 0.08],
    ["#architecture",47, 216, 255, 0.06],
    ["#si",         124,  92, 255, 0.08],
    [".earthline",   40, 130, 255, 0.10],
    ["#team",        47, 216, 255, 0.06]
  ];
  var marks = [];
  function measure() {
    marks = [];
    STOPS.forEach(function (s) {
      var el = document.querySelector(s[0]); if (!el) return;
      var r = el.getBoundingClientRect();
      marks.push({ y: r.top + scrollY + r.height / 2, c: s.slice(1) });
    });
    marks.sort(function (a, b) { return a.y - b.y; });
  }
  function tintAt(y) {
    if (!marks.length) return [40, 130, 255, 0.1];
    if (y <= marks[0].y) return marks[0].c;
    for (var i = 1; i < marks.length; i++) {
      if (y <= marks[i].y) {
        var a = marks[i - 1], b = marks[i], t = (y - a.y) / (b.y - a.y);
        t = t * t * (3 - 2 * t);
        return a.c.map(function (v, k) { return v + (b.c[k] - v) * t; });
      }
    }
    return marks[marks.length - 1].c;
  }

  // ---- stars
  var LAYERS = [ { scroll: 0.000025, size: 0.7, alpha: 0.55, share: 0.55 },
                 { scroll: 0.00006,  size: 1.1, alpha: 0.75, share: 0.32 },
                 { scroll: 0.00012,  size: 1.6, alpha: 0.95, share: 0.13 } ];
  var SPIN = 0.0055;                 // radians per second: one full turn in about 19 minutes
  var P = { x: 0, y: 0 }, A0 = 0, SPAN = 1, RMIN = 0, RMAX = 1;
  function makeStars() {
    // the pivot sits below the screen; stars live in the ring sector that covers the screen
    P.x = W * 0.5; P.y = H * 1.55;
    RMIN = Math.max(1, P.y - H);
    RMAX = Math.hypot(W * 0.5, P.y) + 20;
    var aL = Math.atan2(-(P.y - H), -W * 0.5), aR = Math.atan2(-(P.y - H), W * 0.5);
    var margin = 0.12; A0 = aL - margin; SPAN = (aR + margin) - A0;
    var sector = 0.5 * SPAN * (RMAX * RMAX - RMIN * RMIN);
    var n = Math.round(Math.min(Math.min(W * H / 5200, 420) * sector / (W * H), 1400));
    stars = [];
    LAYERS.forEach(function (L, li) {
      for (var i = 0; i < n * L.share; i++) {
        stars.push({ l: li, a: Math.random() * SPAN,
          r: Math.sqrt(RMIN * RMIN + Math.random() * (RMAX * RMAX - RMIN * RMIN)),
          tw: Math.random() * 6.283, ts: 0.6 + Math.random() * 1.6, blue: Math.random() < 0.35 });
      }
    });
  }

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    makeStars(); measure();
    if (RM || raf === null) draw(performance.now(), 0);
  }

  function spawnMeteor() {
    var fromLeft = Math.random() < 0.5;
    meteors.push({ x: fromLeft ? Math.random() * W * 0.5 : W * (0.5 + Math.random() * 0.5),
      y: Math.random() * H * 0.45, vx: (fromLeft ? 1 : -1) * (520 + Math.random() * 380),
      vy: 220 + Math.random() * 160, life: 0, max: 0.9 + Math.random() * 0.6 });
  }

  function draw(now, dt) {
    var sy = scrollY;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.clearRect(0, 0, W, H);

    // sky tint for the part of the story on screen
    var c = tintAt(sy + H / 2);
    var g = cx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.35, Math.max(W, H) * 0.85);
    g.addColorStop(0, "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (c[3] * 1.6).toFixed(3) + ")");
    g.addColorStop(1, "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + (c[3] * 0.4).toFixed(3) + ")");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);

    // stars
    var t = now / 1000;
    var turn = RM ? 0 : t * SPIN;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], L = LAYERS[s.l];
      var ang = A0 + (((s.a + turn + (RM ? 0 : sy * L.scroll)) % SPAN) + SPAN) % SPAN;
      var x = P.x + Math.cos(ang) * s.r, y = P.y + Math.sin(ang) * s.r;
      if (x < -3 || x > W + 3 || y < -3 || y > H + 3) continue;
      var a = L.alpha * (0.65 + 0.35 * Math.sin(t * s.ts + s.tw));
      var col = s.blue ? "rgba(190,230,255," : "rgba(255,255,255,";
      cx.fillStyle = col + a.toFixed(3) + ")";
      cx.beginPath(); cx.arc(x, y, L.size, 0, 6.283); cx.fill();
    }
    if (RM) return;

    // solar wind while the emergency section is visible
    windLevel += ((windOn ? 1 : 0) - windLevel) * Math.min(1, dt * 1.5);
    if (windLevel > 0.02) {
      var want = Math.round(90 * windLevel * Math.min(1, W / 1200 + 0.3));
      while (wind.length < want) wind.push({ x: -20 - Math.random() * W * 0.3, y: Math.random() * H,
        v: 260 + Math.random() * 420, len: 18 + Math.random() * 46, ph: Math.random() * 6.283, w: 0.6 + Math.random() * 1.2 });
      cx.lineCap = "round";
      for (var j = wind.length - 1; j >= 0; j--) {
        var p = wind[j];
        p.x += p.v * dt; var py = p.y + Math.sin(t * 1.5 + p.ph) * 10;
        if (p.x - p.len > W) { if (wind.length > want) { wind.splice(j, 1); continue; } p.x = -20 - Math.random() * 80; p.y = Math.random() * H; }
        var wg = cx.createLinearGradient(p.x - p.len, py, p.x, py);
        wg.addColorStop(0, "rgba(255,184,74,0)"); wg.addColorStop(1, "rgba(255,200,110," + (0.55 * windLevel).toFixed(3) + ")");
        cx.strokeStyle = wg; cx.lineWidth = p.w; cx.beginPath(); cx.moveTo(p.x - p.len, py); cx.lineTo(p.x, py); cx.stroke();
      }
    } else if (wind.length) wind.length = 0;

    // shooting stars
    nextMeteor -= dt;
    if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 7 + Math.random() * 9; }
    for (var m = meteors.length - 1; m >= 0; m--) {
      var M = meteors[m]; M.life += dt;
      if (M.life > M.max) { meteors.splice(m, 1); continue; }
      M.x += M.vx * dt; M.y += M.vy * dt;
      var k = M.life / M.max, fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      var tx = M.x - M.vx * 0.16, ty = M.y - M.vy * 0.16;
      var mg = cx.createLinearGradient(M.x, M.y, tx, ty);
      mg.addColorStop(0, "rgba(255,255,255," + (0.9 * fade).toFixed(3) + ")"); mg.addColorStop(1, "rgba(160,220,255,0)");
      cx.strokeStyle = mg; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(M.x, M.y); cx.lineTo(tx, ty); cx.stroke();
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    draw(now, dt);
  }
  function start() { if (raf === null && !RM) { lastT = 0; raf = requestAnimationFrame(loop); } }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

  addEventListener("resize", resize);
  addEventListener("load", measure);
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if (RM) addEventListener("scroll", function () { draw(performance.now(), 0); }, { passive: true });

  // The solar wind belonged to the solar flare scenario. The emergency of the demo is an infection, so it stays off.
  // re-measure when the layout changes (fonts, images, language switch)
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);

  resize(); start();
})();
