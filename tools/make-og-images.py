"""Regenerates the Open Graph share cards in assets/og/.

The cards are committed, so this only needs running when the wording, the palette
or the mascot changes. Requires Pillow and the Segoe UI / Consolas faces that ship
with Windows; on another OS point FONTS at equivalents.

    python tools/make-og-images.py
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "og")
W, H = 1200, 630                      # the size every platform crops from

FONTS = {
    "bold": r"C:\Windows\Fonts\segoeuib.ttf",
    "regular": r"C:\Windows\Fonts\segoeui.ttf",
    "mono": r"C:\Windows\Fonts\consolab.ttf",
}

# Heisenbug, the same 5x7 grid the homepage draws in text.
MASCOT = [
    "  \\ /  ",
    " (o o) ",
    "-(   )-",
    "-( | )-",
    "-(_|_)-",
]

CARDS = [
    {
        "file": "og-deversity.png",
        "bg": "#0a0f16",
        "accent": "#3ecf8e",
        "ink": "#e9eef5",
        "muted": "#97a4b4",
        "mark": "D",
        "wordmark": "Deversity",
        "headline": ["Concurrency bugs,", "forced out of hiding."],
        "sub": "async-test-lib, a JUnit 5 extension that stress-tests JVM code "
               "under maximum thread contention.",
        "foot": "deversity.se   ·   Free for non-commercial use",
        "mascot": True,
    },
    {
        "file": "og-llmfw.png",
        "bg": "#07070a",
        "accent": "#00f5ff",
        "ink": "#f1f5f9",
        "muted": "#94a3b8",
        "mark": "</>",
        "wordmark": "llm-fw",
        "headline": ["The local prompt", "injection firewall."],
        "sub": "Inspects every request your tools send to LLM providers, blocks "
               "injection in real time, forwards clean traffic untouched.",
        "foot": "deversity.se/llmfw   ·   No cloud calls, no telemetry",
        "mascot": False,
    },
    {
        "file": "og-vibetags.png",
        "bg": "#07070a",
        "accent": "#3ecf8e",
        "ink": "#f1f5f9",
        "muted": "#94a3b8",
        "mark": "@",
        "wordmark": "VibeTags",
        "headline": ["AI guardrails,", "compiled from your code."],
        "sub": "A compile-time Java annotation processor that generates CLAUDE.md, "
               ".cursorrules and the rest from your own source.",
        "foot": "deversity.se/vibetags   ·   Free and open source, MIT",
        "mascot": False,
    },
]


def font(name, size):
    return ImageFont.truetype(FONTS[name], size)


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=fnt) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def glow(size, box, colour, blur):
    """A soft accent wash, drawn once and blurred rather than computed per pixel."""
    layer = Image.new("RGB", size, "black")
    ImageDraw.Draw(layer).ellipse(box, fill=colour)
    return layer.filter(ImageFilter.GaussianBlur(blur))


def build(card):
    img = Image.new("RGB", (W, H), card["bg"])
    # The homepage carries a radial accent wash behind the hero; echo it here.
    img = Image.blend(img, glow((W, H), (760, -260, 1500, 420), card["accent"], 190), 0.16)
    d = ImageDraw.Draw(img)

    accent, ink, muted = card["accent"], card["ink"], card["muted"]

    # Logo: the rounded square from the favicon, with the mark centred in it.
    d.rounded_rectangle((72, 62, 128, 118), radius=14, outline=accent, width=3)
    mark_font = font("bold", 30 if len(card["mark"]) == 1 else 19)
    d.text((100, 90), card["mark"], font=mark_font, fill=accent, anchor="mm")
    d.text((146, 90), card["wordmark"], font=font("bold", 34), fill=ink, anchor="lm")

    y = 214
    for i, line in enumerate(card["headline"]):
        d.text((72, y), line, font=font("bold", 68), fill=accent if i else ink)
        y += 84

    y += 22
    sub_font = font("regular", 27)
    for line in wrap(d, card["sub"], sub_font, 760 if card["mascot"] else 1010):
        d.text((72, y), line, font=sub_font, fill=muted)
        y += 40

    d.line((72, H - 108, 200, H - 108), fill=accent, width=3)
    d.text((72, H - 74), card["foot"], font=font("regular", 23), fill=muted)

    if card["mascot"]:
        # The mascot is text on the site, so it is text here too.
        mono = font("mono", 40)
        my = 250
        for row in MASCOT:
            d.text((W - 96, my), row, font=mono, fill="#e0895f", anchor="ra")
            my += 46

    path = os.path.join(OUT, card["file"])
    img.save(path, "PNG", optimize=True)
    print("%-22s %6.1f KB" % (card["file"], os.path.getsize(path) / 1024))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for c in CARDS:
        build(c)
