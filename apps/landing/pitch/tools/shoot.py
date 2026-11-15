"""Screenshots of the real app for the pitch landing page, written as WebP to img/shots/.

Usage (run from apps/landing/pitch):
    python tools/shoot.py [WEB_APP_URL]

- The sign-in of the crew app comes from its mini demo (demo-app/), served on a local port while it runs.
- The panel, the alerts, one value and the data come from the dashboard mini demo (demo/index.html).
- The infection case is not in the mini demo: it comes from the real web app (apps/web), at WEB_APP_URL
  (default http://localhost:5173, with the moon server running). Pass "skip" to leave that screenshot as it is.

Needs Playwright and Chrome: uv run --no-project --with playwright --with pillow python tools/shoot.py
"""
import asyncio
import functools
import http.server
import sys
import threading
from pathlib import Path

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
DEMO = (ROOT / "demo" / "index.html").as_uri()
PHONE = {"width": 390, "height": 844}
LOCAL_PORT = 5181
WEB_APP = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
OUT = ROOT / "img" / "shots"
W, H = 820, 1180  # tablet portrait
COMMANDER = "1"  # Eva Lindqvist: three values out of range on the demo date
WEBP_QUALITY = 82


async def save(page, name):
    png = OUT / f"{name}.png"
    await page.screenshot(path=str(png))
    Image.open(png).save(OUT / f"{name}.webp", "WEBP", quality=WEBP_QUALITY)
    png.unlink()
    print("saved", f"{name}.webp")


async def demo_shot(page, name, steps):
    await page.goto(DEMO)
    await page.wait_for_timeout(500)
    for selector in steps:
        await page.click(selector)
        await page.wait_for_timeout(300)
    # Let the entry animations of the cards and the lines of the charts finish
    await page.wait_for_timeout(1500)
    await page.evaluate("scrollTo(0, 0)")
    await save(page, name)


async def infection_shot(page):
    await page.goto(WEB_APP)
    await page.evaluate("localStorage.clear()")
    await page.reload()
    await page.get_by_role("button", name="Simulate a possible infection").click()
    await page.get_by_role("button", name="Amara Okafor").click()
    await page.wait_for_timeout(800)
    alert = page.locator(".emergency-alert")
    if await alert.count() > 0:
        await alert.click()
    await page.wait_for_timeout(2500)
    await save(page, "infection")
    await page.evaluate("localStorage.clear()")


def serve_pitch():
    """The crew app demo is a built module app: browsers run it only over http, not from a file."""
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", LOCAL_PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


async def app_shot(browser):
    """The sign-in screen of the crew app mini demo, on a phone."""
    context = await browser.new_context(viewport=PHONE, device_scale_factor=2)
    page = await context.new_page()
    await page.goto(f"http://127.0.0.1:{LOCAL_PORT}/demo-app/index.html")
    await page.wait_for_timeout(2000)
    await save(page, "app")
    await context.close()


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    server = serve_pitch()
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel="chrome")
        await app_shot(browser)
        context = await browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=2)
        page = await context.new_page()

        await demo_shot(page, "home", [])
        await demo_shot(page, "today", [f'[data-crew="{COMMANDER}"]'])
        await demo_shot(page, "alerts", [f'[data-crew="{COMMANDER}"]', '[data-tab="alerts"]'])
        await demo_shot(page, "value", [f'[data-crew="{COMMANDER}"]', '[data-tab="alerts"]', '[data-indicator="glucose"]'])
        await demo_shot(page, "data", [f'[data-crew="{COMMANDER}"]', '[data-tab="data"]'])
        if WEB_APP != "skip":
            await infection_shot(page)
        await browser.close()
    server.shutdown()


asyncio.run(main())
