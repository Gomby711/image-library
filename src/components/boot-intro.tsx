// Animated splash shown on every real page load — reload, typing/pasting
// the URL, opening a new tab, reopening the browser. See globals.css for
// the #boot-intro rules and keyframes. Server-rendered (no "use client",
// no hooks) so it paints before any JS runs. It never replays on in-app
// navigation (clicking sidebar links, etc.) — the root layout stays
// mounted across those, so this component and its inline script simply
// don't re-run; only an actual new document load does. Ported from the
// reference app's BootIntro.tsx, retuned for this app's icon/name/palette.
const WORDMARK = "Asset Library";
const ACCENT_FROM = 6; // "Library" gets the accent gradient

export default function BootIntro() {
  return (
    <div id="boot-intro" role="presentation" aria-hidden="true" suppressHydrationWarning>
      <div className="bi-backdrop" />
      <div className="bi-grid" />
      <canvas className="bi-motes" suppressHydrationWarning />

      <div className="bi-stage">
        <div className="bi-mark">
          <div className="bi-glow" />
          <div className="bi-ring" />
          <img src="/brand/gallery-icon.png" alt="" />
        </div>

        <div className="bi-wordmark">
          {WORDMARK.split("").map((ch, i) => (
            <span
              key={i}
              className={`bi-char${i >= ACCENT_FROM ? " bi-accent" : ""}`}
              style={{ animationDelay: `${1.05 + i * 0.045}s` }}
            >
              {ch === " " ? " " : ch}
            </span>
          ))}
        </div>

        <div className="bi-tagline">Private image library</div>

        <div className="bi-progress">
          <div className="bi-progress-fill" />
          <div className="bi-progress-sheen" />
        </div>
      </div>

      <div className="bi-veil" />

      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
  var root = document.getElementById('boot-intro');
  if (!root) return;

  // Once the scene has faded into the page background, remove the splash
  // from the render/hit-test tree entirely.
  setTimeout(function () { root.style.display = 'none'; }, 5200);

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Ambient drifting motes — cheap, GPU-friendly.
  var canvas = root.querySelector('canvas.bi-motes');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var motes = [];
  var running = true;

  function resize() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    var count = Math.round((window.innerWidth * window.innerHeight) / 26000);
    motes = [];
    for (var i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: (Math.random() * 1.4 + 0.4) * dpr,
        vy: -(Math.random() * 0.12 + 0.03) * dpr,
        a: Math.random() * 0.5 + 0.15
      });
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.y += m.vy;
      if (m.y < -10) m.y = canvas.height + 10;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(230,190,140,' + m.a + ')';
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  setTimeout(function () { running = false; }, 4200);
})();`,
        }}
      />
    </div>
  );
}
