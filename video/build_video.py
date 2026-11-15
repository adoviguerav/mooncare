"""Builds the demo video: moon_care_demo.mp4 in the repo root, and video/moon_care_demo.srt.

Usage (from the repo root, after record_app.py has written its takes to TAKES_DIR):
    uv run --no-project --with playwright python video/build_video.py TAKES_DIR WORK_DIR [stills]

Every frame is a screenshot of scenes.html at one moment. The scenes of the app show the frames of a real
recording inside that page. With `stills` it writes only a few frames of each scene to WORK_DIR, to look at them.
Needs ffmpeg and the Chrome installed on the machine.
"""
import asyncio
import bisect
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

from playwright.async_api import Page, async_playwright
from playwright.async_api import TimeoutError as PlaywrightTimeout

HERE = Path(__file__).resolve().parent
TAKES = Path(sys.argv[1]).resolve()
WORK = Path(sys.argv[2]).resolve()
STILLS_ONLY = sys.argv[3:] == ["stills"]
# The video is the one thing kept outside this folder, where it is easy to find
VIDEO = HERE.parent / "moon_care_demo.mp4"
SUBTITLES = HERE / "moon_care_demo.srt"
FPS = 30
SIZE = {"width": 1920, "height": 1080}
# Around a cut inside a recording the app dips for a moment, so the jump reads as a cut and not as a glitch
CUT_DIP_SECONDS = 0.12
CUT_DIP_OPACITY = 0.2
SCREENSHOT_TRIES = 3
SCREENSHOT_TIMEOUT_MS = 10_000


@dataclass(frozen=True)
class Cut:
    """A piece of a take, from `before` seconds before one mark to `after` seconds after another."""

    start_mark: str
    before: float
    end_mark: str
    after: float


@dataclass(frozen=True)
class Scene:
    page_scene: str
    start: float
    end: float
    caption: str
    # Shown alone before the rest of the scene, one line after another
    intro: tuple[str, ...] = ()
    sub: str = ""
    note: str = ""
    take: str = ""
    cuts: tuple[Cut, ...] = field(default=())
    # How fast the clock of an animated scene runs, to fit an animation drawn for another length
    clock_speed: float = 1
    # A mark that carries the box of something to ring on the recording, from the moment it happens
    ring_mark: str = ""


# The length the architecture animation is drawn for in scenes.html
ARCHITECTURE_SECONDS = 4.5

# The script of the video. A mark is matched by the text it contains (see record_app.py).
SCENES = (
    Scene(
        "collect", 0, 10, "Every reading of the crew, in one place.",
        intro=("On the Moon, the link with Earth can drop.", "And getting home takes 3 to 11 days."),
    ),
    Scene(
        "app", 10, 14.4, "40+ parameters, each with its source. 21 with an alert rule.",
        take="data",
        cuts=(
            Cut("open Blood glucose", 1.2, "chart seen Blood glucose", -0.4),
        ),
    ),
    Scene(
        "app", 14.4, 19, "Models flag trouble before it grows.",
        note="Detection simulated in this prototype",
        take="detect",
        cuts=(Cut("simulate", 0.9, "stop", -1.7),),
    ),
    Scene(
        "app", 19, 24.2, "An AI voice guides the medical officer through NASA's own checklist.",
        take="guide",
        cuts=(
            Cut("open guide", 0.6, '"voice": "Speaking"', 0.4),
            Cut('"ticked": ["', 1.0, '"ticked": ["', 1.9),
        ),
        ring_mark='"ticked": ["',
    ),
    Scene(
        "architecture", 24.2, 27.3, "Built to work with or without Earth.",
        sub="Today the AI runs in the cloud. Next: on board.",
        clock_speed=ARCHITECTURE_SECONDS / 3.1,
    ),
    Scene("close", 27.3, 29.5, "NASA Space Apps Challenge 2026"),
)
# The narration: what is said and when (narration.json), spoken by generate_narration.mjs into WORK/narration
NARRATION = json.loads((HERE / "narration.json").read_text())
NARRATION_DIR = WORK / "narration"
# A line must end this long before the next one starts
NARRATION_GAP_SECONDS = 0.1
# The Space Apps guide asks to say in the metadata that the audio is generated
AUDIO_NOTE = "Narration generated with ElevenLabs text to speech. Animated scenes made with AI. App footage is real."


class Recording:
    """The frames of one scene of the app, cut from its take and fitted to the length of the scene."""

    def __init__(self, scene: Scene) -> None:
        folder = TAKES / scene.take
        frames = json.loads((folder / "frames.json").read_text())
        marks = json.loads((folder / "marks.json").read_text())
        self.files = [(folder / frame["file"]).as_uri() for frame in frames]
        self.times = [frame["time"] for frame in frames]
        self.pieces = [
            (find_mark(marks, cut.start_mark) - cut.before, find_mark(marks, cut.end_mark) + cut.after)
            for cut in scene.cuts
        ]
        ring = find_mark_entry(marks, scene.ring_mark) if scene.ring_mark else None
        self.ring_box = None if ring is None else json.loads(ring["label"])["tickedBox"]
        self.ring_time = None if ring is None else ring["time"]
        recorded = sum(end - start for start, end in self.pieces)
        self.speed = recorded / (scene.end - scene.start)
        print(f"{scene.take}: {recorded:.2f} s of recording at x{self.speed:.2f}")

    def frame_at(self, seconds: float) -> dict:
        """The frame to show `seconds` into the scene, and how visible it is."""
        left = seconds * self.speed
        dip = 1.0
        for index, (start, end) in enumerate(self.pieces):
            length = end - start
            is_last = index == len(self.pieces) - 1
            if left < length or is_last:
                to_cut = min(left if index > 0 else 99, (length - left) if not is_last else 99) / self.speed
                if to_cut < CUT_DIP_SECONDS:
                    dip = CUT_DIP_OPACITY + (1 - CUT_DIP_OPACITY) * max(0, to_cut) / CUT_DIP_SECONDS
                source_time = start + min(left, length)
                position = bisect.bisect_right(self.times, source_time) - 1
                frame = {"file": self.files[max(0, position)], "opacity": dip}
                if self.ring_time is not None and source_time >= self.ring_time:
                    frame["ring"] = {**self.ring_box, "age": (source_time - self.ring_time) / self.speed, "opacity": dip}
                return frame
            left -= length
        raise AssertionError("a recording has at least one piece")


def find_mark_entry(marks: list[dict], text: str) -> dict:
    for mark in marks:
        if text in mark["label"]:
            return mark
    raise ValueError(f"No mark contains {text!r}. Record the take again.")


def find_mark(marks: list[dict], text: str) -> float:
    return find_mark_entry(marks, text)["time"]


def build_shot(scene: Scene, recording: Recording | None, seconds: float) -> dict:
    shot = {
        "scene": scene.page_scene, "t": seconds * scene.clock_speed, "caption": scene.caption,
        "intro": list(scene.intro), "sub": scene.sub, "note": scene.note,
    }
    if recording is not None:
        shot["frame"] = recording.frame_at(seconds)
    return shot


async def photograph(page: Page, shot: dict, path: Path) -> None:
    """Draws one frame and saves it. Chrome now and then stalls on a screenshot: the page is loaded again and
    the frame drawn again, which gives the same picture because a frame depends only on its shot."""
    for attempt in range(SCREENSHOT_TRIES):
        try:
            await page.evaluate("shot => render(shot)", shot)
            await page.screenshot(path=str(path), timeout=SCREENSHOT_TIMEOUT_MS)
            return
        except PlaywrightTimeout:
            print(f"screenshot of {path.name} stalled, try {attempt + 1}")
            await page.reload()
            await page.evaluate("document.fonts.ready")
    raise RuntimeError(f"Chrome could not photograph {path.name} in {SCREENSHOT_TRIES} tries")


async def render_frames() -> int:
    """Writes the frames to WORK/frames and returns how many."""
    recordings = [Recording(scene) if scene.take else None for scene in SCENES]
    frames_dir = WORK / ("stills" if STILLS_ONLY else "frames")
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("*.png"):
        old.unlink()
    total = round(SCENES[-1].end * FPS)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome")
        page = await browser.new_page(viewport=SIZE)
        await page.goto((HERE / "scenes.html").as_uri())
        await page.evaluate("document.fonts.ready")
        if STILLS_ONLY:
            for number, scene in enumerate(SCENES, start=1):
                for part in (0.2, 0.3, 0.5, 0.7, 0.95):
                    seconds = (scene.end - scene.start) * part
                    shot = build_shot(scene, recordings[number - 1], seconds)
                    await photograph(page, shot, frames_dir / f"{number}_{part:.2f}.png")
        else:
            for index in range(total):
                at = index / FPS
                number = next(i for i, scene in enumerate(SCENES) if at < scene.end)
                scene = SCENES[number]
                shot = build_shot(scene, recordings[number], at - scene.start)
                await photograph(page, shot, frames_dir / f"{index:05d}.png")
                if index % 150 == 0:
                    print(f"frame {index} of {total}")
        await browser.close()
    return total


def measure_seconds(audio: Path) -> float:
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio)],
        check=True, capture_output=True, text=True,
    )
    return float(probe.stdout)


def find_narration_ends() -> list[float] | None:
    """When each line of the narration ends, or None when it has not been generated. Refuses a line that
    runs into the next one or past the end of the video."""
    clips = [NARRATION_DIR / f"{number}.mp3" for number in range(1, len(NARRATION) + 1)]
    if not all(clip.exists() for clip in clips):
        return None
    total = SCENES[-1].end
    ends = [line["start"] + measure_seconds(clip) for line, clip in zip(NARRATION, clips)]
    limits = [line["start"] for line in NARRATION[1:]] + [total]
    for number, (end, limit) in enumerate(zip(ends, limits), start=1):
        print(f"narration {number}: ends at {end:.2f} s, must end by {limit - NARRATION_GAP_SECONDS:.2f} s")
        if end > limit - NARRATION_GAP_SECONDS:
            raise ValueError(f"Line {number} of the narration is too long. Shorten it in narration.json.")
    return ends


def encode(with_narration: bool) -> None:
    total = SCENES[-1].end
    command = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(WORK / "frames" / "%05d.png")]
    video_options = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(FPS)]
    if with_narration:
        delayed = []
        for index, line in enumerate(NARRATION, start=1):
            command += ["-i", str(NARRATION_DIR / f"{index}.mp3")]
            delayed.append(f"[{index}:a]adelay={round(line['start'] * 1000)}:all=1[a{index}]")
        mixed = "".join(f"[a{index}]" for index in range(1, len(NARRATION) + 1))
        # Each line is laid at its start, and the track is padded and cut to the length of the picture
        mix = f"{mixed}amix=inputs={len(NARRATION)}:normalize=0,apad,atrim=0:{total}[narration]"
        command += [
            "-filter_complex", ";".join([*delayed, mix]), "-map", "0:v", "-map", "[narration]",
            *video_options, "-c:a", "aac", "-b:a", "192k", "-t", str(total), "-metadata", f"comment={AUDIO_NOTE}",
        ]
    else:
        command += [*video_options, "-an"]
    subprocess.run([*command, "-movflags", "+faststart", str(VIDEO)], check=True)


def format_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, rest = divmod(milliseconds, 3_600_000)
    minutes, rest = divmod(rest, 60_000)
    return f"{hours:02d}:{minutes:02d}:{rest // 1000:02d},{rest % 1000:03d}"


def write_subtitles(narration_ends: list[float] | None) -> None:
    """The subtitles are what the narration says. Without the audio, each line lasts until the next one."""
    ends = narration_ends or [line["start"] for line in NARRATION[1:]] + [SCENES[-1].end]
    blocks = [
        f"{number}\n{format_time(line['start'])} --> {format_time(end)}\n{line['text']}\n"
        for number, (line, end) in enumerate(zip(NARRATION, ends), start=1)
    ]
    SUBTITLES.write_text("\n".join(blocks), encoding="utf-8")


def main() -> None:
    narration_ends = find_narration_ends()
    asyncio.run(render_frames())
    if STILLS_ONLY:
        return
    if narration_ends is None:
        print(f"No narration in {NARRATION_DIR}: the video has no sound. Run generate_narration.mjs first.")
    encode(with_narration=narration_ends is not None)
    write_subtitles(narration_ends)
    print(f"wrote {VIDEO} and {SUBTITLES}")


main()
