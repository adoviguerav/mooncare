"""Records the real web app (apps/web) for the demo video: one take per scene, as JPEG frames with their times.

Usage (from the repo root, with the moon server and `npm run dev` of apps/web running):
    uv run --no-project --with playwright python video/record_app.py OUT_DIR [data|detect|guide ...]

Each take is written to OUT_DIR/<take>/: the frames, `frames.json` (file and time of each frame) and
`marks.json` (the time of each thing that happened, to choose where to cut). build_video.py turns them into clips.

It signs in with the public demo account of the landing (database/postgresql/README.md), uses the Chrome
installed on the machine, and gives the voice guide a spoken answer through a fake microphone (SPEECH_WAV).
"""
import asyncio
import base64
import json
import sys
import time
from pathlib import Path

from playwright.async_api import async_playwright

WEB_APP = "http://localhost:5173"
DEMO_USER = "Amara Okafor"
DEMO_PIN = "123456"
# The frame of the app in the video is 1180x1000. The app is laid out for 944x800 and zoomed, so its text
# is large enough to read in a video.
VIEW = {"width": 1180, "height": 1000}
ZOOM = 1.25
JPEG_QUALITY = 95
OUT = Path(sys.argv[1]).resolve()
SPEECH_WAV = OUT / "speech.wav"

# The pointer and the ring of a click. Playwright moves a mouse nobody sees, so the page draws it.
POINTER_SCRIPT = """
(zoom) => {
  const style = document.createElement('style')
  style.textContent = `html { zoom: ${zoom}; }
    #demo-pointer { position: fixed; left: 0; top: 0; z-index: 99999; width: 26px; height: 26px; pointer-events: none;
      will-change: transform; filter: drop-shadow(0 2px 4px rgb(0 0 0 / 0.6)); }
    .demo-click { position: fixed; z-index: 99998; width: 12px; height: 12px; margin: -6px 0 0 -6px; border-radius: 50%;
      border: 2px solid #2fd8ff; pointer-events: none; animation: demo-click 0.5s ease-out forwards; }
    @keyframes demo-click { to { transform: scale(5); opacity: 0; } }`
  document.head.append(style)
  const pointer = document.createElement('div')
  pointer.id = 'demo-pointer'
  pointer.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 9-6.5 1.6L9 19z" fill="#fff" stroke="#04121f" stroke-width="1.4" stroke-linejoin="round"/></svg>'
  document.body.append(pointer)
  addEventListener('mousemove', (event) => {
    pointer.style.transform = `translate(${event.clientX / zoom}px, ${event.clientY / zoom}px)`
  }, true)
  addEventListener('mousedown', (event) => {
    const ring = document.createElement('div')
    ring.className = 'demo-click'
    ring.style.left = `${event.clientX / zoom}px`
    ring.style.top = `${event.clientY / zoom}px`
    document.body.append(ring)
    setTimeout(() => ring.remove(), 600)
  }, true)
}
"""


class Take:
    """One recording: the frames Chrome sends while it runs, and the marks of what happened."""

    def __init__(self, page, cdp, name):
        self.page, self.cdp, self.dir = page, cdp, OUT / name
        self.dir.mkdir(parents=True, exist_ok=True)
        for old in self.dir.glob("*.jpg"):
            old.unlink()
        self.frames, self.marks, self.mouse = [], [], (VIEW["width"] / 2, VIEW["height"] / 2)

    async def start(self):
        self.cdp.on("Page.screencastFrame", lambda event: asyncio.ensure_future(self._keep(event)))
        await self.cdp.send("Page.startScreencast", {"format": "jpeg", "quality": JPEG_QUALITY})
        self.mark("start")

    async def _keep(self, event):
        name = f"{len(self.frames):05d}.jpg"
        self.frames.append({"file": name, "time": event["metadata"]["timestamp"]})
        (self.dir / name).write_bytes(base64.b64decode(event["data"]))
        await self.cdp.send("Page.screencastFrameAck", {"sessionId": event["sessionId"]})

    def mark(self, label):
        self.marks.append({"label": label, "time": time.time()})
        print(f"  {label}")

    async def stop(self):
        self.mark("stop")
        await self.cdp.send("Page.stopScreencast")
        await self.page.wait_for_timeout(200)
        (self.dir / "frames.json").write_text(json.dumps(self.frames))
        (self.dir / "marks.json").write_text(json.dumps(self.marks, indent=1))
        print(f"  {len(self.frames)} frames in {self.dir}")

    async def move_to(self, locator, seconds=0.6):
        box = await locator.bounding_box()
        target = (box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        steps = max(2, round(seconds * 60))
        start = self.mouse
        for step in range(1, steps + 1):
            # Ease in and out, like a hand
            progress = step / steps
            eased = progress * progress * (3 - 2 * progress)
            await self.page.mouse.move(
                start[0] + (target[0] - start[0]) * eased, start[1] + (target[1] - start[1]) * eased
            )
            await self.page.wait_for_timeout(1000 / 60)
        self.mouse = target

    async def click(self, locator, label, seconds=0.6):
        await self.move_to(locator, seconds)
        await self.page.wait_for_timeout(120)
        self.mark(label)
        await self.page.mouse.down()
        await self.page.wait_for_timeout(70)
        await self.page.mouse.up()

    async def scroll_to(self, locator, label, offset=24):
        """Scrolls until the element is `offset` px under the top of the screen."""
        self.mark(label)
        await locator.evaluate(
            "(el, offset) => scrollTo({ top: scrollY + el.getBoundingClientRect().top - offset, behavior: 'smooth' })",
            offset,
        )


async def sign_in(page):
    await page.goto(WEB_APP)
    await page.get_by_role("button", name=DEMO_USER).click()
    for digit in DEMO_PIN:
        await page.keyboard.press(digit)
    await page.get_by_role("heading", name="Whose panel?").wait_for()
    await page.evaluate("localStorage.clear(); sessionStorage.clear()")
    await page.evaluate(POINTER_SCRIPT, ZOOM)


async def record_data(page, cdp):
    """Scene 2: the Data tab, and two parameters opened down to their history with the limits of the rule."""
    await page.get_by_role("button", name="Eva Lindqvist").click()
    await page.get_by_role("button", name="Data").click()
    await page.wait_for_timeout(1500)
    take = Take(page, cdp, "data")
    await take.start()
    await page.wait_for_timeout(500)
    for tile in ("Blood glucose", "Sleep duration"):
        button = page.locator("button.tile", has_text=tile)
        await button.scroll_into_view_if_needed()
        await take.click(button, f"open {tile}")
        chart = page.locator("section.card", has_text="How it has changed")
        await chart.wait_for()
        await page.wait_for_timeout(700)
        await take.scroll_to(chart, f"scroll to chart {tile}")
        await page.wait_for_timeout(1900)
        take.mark(f"chart seen {tile}")
        await page.evaluate("scrollTo({ top: 0, behavior: 'smooth' })")
        await page.wait_for_timeout(450)
        await take.click(page.get_by_role("button", name="Back to the panel"), f"back from {tile}", 0.4)
        await page.wait_for_timeout(500)
    await take.stop()
    await page.get_by_role("button", name="Switch profile").click()


async def record_detect(page, cdp):
    """Scene 3: the simulation is started from the medical officer's panel and the alert takes the screen."""
    await page.get_by_role("button", name=DEMO_USER).click()
    simulate = page.get_by_role("button", name="Simulate a possible infection")
    await simulate.wait_for()
    await page.wait_for_timeout(1500)
    await simulate.evaluate("el => el.scrollIntoView({ block: 'center' })")
    await page.wait_for_timeout(500)
    take = Take(page, cdp, "detect")
    await take.start()
    await page.wait_for_timeout(400)
    await take.click(simulate, "simulate", 0.8)
    await page.locator(".emergency-alert").wait_for()
    await page.locator(".signals").wait_for()
    await page.wait_for_timeout(1800)
    await take.scroll_to(page.locator("section.card", has_text="What the infection model saw"), "scroll to readings", 90)
    await page.wait_for_timeout(3500)
    await take.stop()
    await page.evaluate("scrollTo(0, 0)")


async def record_guide(page, cdp):
    """Scene 4: the medical officer opens the guide. The voice guide speaks, hears the answer of the fake
    microphone and writes it down. Long on purpose: the marks say when each thing happened."""
    await page.wait_for_timeout(500)
    take = Take(page, cdp, "guide")
    await take.start()
    await page.wait_for_timeout(400)
    await take.click(page.locator(".emergency-alert"), "open guide", 0.8)
    await page.locator(".guide").wait_for()
    seen = None
    deadline = time.time() + 75
    while time.time() < deadline:
        state = await page.evaluate(
            """() => ({
              voice: document.querySelector('.voice')?.textContent ?? '',
              step: document.querySelector('.guide-title')?.textContent ?? '',
              ticked: [...document.querySelectorAll('.tick[aria-pressed="true"]')].map((el) => el.textContent),
              // Where the first thing written down is on the screen, for the ring the video draws around it
              tickedBox: document.querySelector('.tick[aria-pressed="true"]')?.getBoundingClientRect().toJSON() ?? null,
            })"""
        )
        if state != seen:
            seen = state
            take.mark(json.dumps(state))
        await page.wait_for_timeout(100)
    await take.stop()
    await page.get_by_role("button", name="End simulation").first.click()


TAKES = {"data": record_data, "detect": record_detect, "guide": record_guide}


async def main():
    wanted = sys.argv[2:] or list(TAKES)
    # The guide starts from the alert that the detection take leaves on the screen
    if "guide" in wanted and "detect" not in wanted:
        wanted.insert(wanted.index("guide"), "detect")
    OUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            channel="chrome",
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                f"--use-file-for-fake-audio-capture={SPEECH_WAV}%noloop",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        context = await browser.new_context(viewport=VIEW, permissions=["microphone"])
        page = await context.new_page()
        cdp = await context.new_cdp_session(page)
        await sign_in(page)
        for name in wanted:
            print(name)
            await TAKES[name](page, cdp)
        await browser.close()


asyncio.run(main())
