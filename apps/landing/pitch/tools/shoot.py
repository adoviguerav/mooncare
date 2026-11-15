"""Capture screenshots of the Mooncare app for the pitch landing page.

Usage: python3 tools/shoot.py  (run from apps/landing/pitch)
Writes WebP files to img/shots/.
"""
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / "app.html").as_uri()
OUT = ROOT / "img" / "shots"

# Space Grotesk is loaded from Google Fonts; fall back to Inter when offline.
FONT_CSS = 'body,button,input,textarea{font-family:"Space Grotesk",Inter,system-ui,sans-serif!important}'

W, H = 820, 1180  # tablet portrait


async def shot(page, name, hash_, setup=None, wait=900, clip=None):
    await page.goto(APP + "#landing")
    await page.add_style_tag(content=FONT_CSS)
    await page.evaluate(f"location.hash={hash_!r}")
    await page.wait_for_timeout(300)
    if setup:
        await page.evaluate(setup)
    await page.wait_for_timeout(wait)
    path = OUT / f"{name}.png"
    await page.screenshot(path=str(path), clip=clip)
    print("saved", path.name)


async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome")
        ctx = await b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2)
        await ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
        page = await ctx.new_page()

        await shot(page, "home", "landing", wait=1200)
        await shot(page, "today", "crew", wait=1600)
        await shot(page, "body", "body", wait=1200)
        await shot(page, "data", "parameters", wait=1800)
        await shot(page, "measure", "crew", setup="""
            openMeasure('bp');
            document.getElementById('mf_sys').value=134;
            document.getElementById('mf_dia').value=84;
            document.getElementById('msSave').click();
            const r=document.getElementById('msRes'); r.scrollIntoView({block:'end'});
        """, wait=900)
        await shot(page, "flare", "alerts", setup="""
            eta=372; inc.done=[true,true,false,false]; drawAlerts(); tick();
        """, wait=2200)
        await shot(page, "mission", "admin", wait=1200)
        await b.close()


asyncio.run(main())
