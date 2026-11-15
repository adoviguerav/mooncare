"""Builds the crew app mini demo (demo-app/) from apps/mobile, without changing its code.

Usage: python tools/build_app_demo.py  (run from apps/landing/pitch; needs Node and the apps/mobile dependencies)

The app is built as it is, with relative paths. Its calls to /api are answered in the browser by
demo-app/demo-api.js, from the snapshot of real data in demo/data/snapshot.js. No service worker and no
install: the mini demo must not stay on the visitor's device.
"""
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

PITCH = Path(__file__).resolve().parent.parent
MOBILE = PITCH.parent.parent / "mobile"
OUT = PITCH / "demo-app"
KEEP = {"demo-api.js"}  # written by hand, not by the build

BANNER = (
    '<p class="demo-strip" role="note">Demo · any 6-digit PIN signs in · real data, nothing is saved</p>\n'
    "<style>.demo-strip{position:fixed;top:0;left:0;right:0;z-index:50;margin:0;padding:3px 10px;"
    "font:500 11px/1.4 'Space Grotesk',system-ui,sans-serif;text-align:center;color:#c6d6e5;"
    "background:rgb(5 13 26 / .75);pointer-events:none}</style>\n"
)


def main() -> None:
    with tempfile.TemporaryDirectory() as build_dir:
        npx = shutil.which("npx") or "npx"
        subprocess.run([npx, "vite", "build", "--base", "./", "--outDir", build_dir, "--emptyOutDir"], cwd=MOBILE, check=True)
        build = Path(build_dir)

        for item in OUT.iterdir() if OUT.exists() else []:
            if item.name in KEEP:
                continue
            shutil.rmtree(item) if item.is_dir() else item.unlink()
        OUT.mkdir(exist_ok=True)
        shutil.copytree(build / "assets", OUT / "assets")
        shutil.copy(build / "icon.svg", OUT / "icon.svg")

        # A module script does not run from a file (file://), so the landing could not be opened with a double
        # click. The bundle has no import, export or import.meta: wrapped in a function, it runs as a plain script.
        for bundle in (OUT / "assets").glob("*.js"):
            code = bundle.read_text(encoding="utf-8")
            assert not re.search(r"(^|[;}])\s*(import|export)\b|import\.meta", code), f"{bundle.name} needs to be a module"
            bundle.write_text('(function(){"use strict";\n' + code + "\n})();\n", encoding="utf-8", newline="\n")

        html = (build / "index.html").read_text(encoding="utf-8")
        html = html.replace(" crossorigin", "").replace('<script type="module" ', "<script ")
        html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
        html = html.replace('href="/icon.svg"', 'href="icon.svg"')
        html = html.replace("<title>Mooncare</title>", "<title>Mooncare · Crew app demo</title>")
        module = re.search(r'\s*<script src="\./assets/[^"]+\.js"></script>', html)
        assert module, "the built index.html has no script"
        html = html[: module.start()] + html[module.end() :]
        scripts = '<script src="../demo/data/snapshot.js"></script>\n<script src="demo-api.js"></script>\n' + module.group(0).strip() + "\n"
        html = html.replace("<body>", "<body>\n" + BANNER, 1).replace("</body>", scripts + "</body>", 1)
        (OUT / "index.html").write_text(html, encoding="utf-8", newline="\n")
        print("built", OUT)


main()
