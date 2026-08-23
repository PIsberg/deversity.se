#!/usr/bin/env python3
"""Validate the customer-wall logos in vibetags/logos/.

Written after convex.svg and newrelic.svg shipped broken: the greyscale pass
added a fill attribute to an <svg> root that already declared one, and browsers
parse an SVG loaded through <img> as strict XML, so a duplicate attribute makes
the whole file fail to render. Nothing on the page reports that; the image is
simply absent. These checks run without a browser.

Usage: python tools/check-logos.py
"""
import glob
import os
import re
import sys
import xml.etree.ElementTree as ET

NS = "{http://www.w3.org/2000/svg}"
SHAPES = {"path", "polygon", "circle", "rect", "ellipse", "polyline", "line"}
GREY = "#c2cad8"
LOGO_DIR = os.path.join(os.path.dirname(__file__), "..", "vibetags", "logos")

def check(path):
    """Return a list of problems with one SVG."""
    problems = []
    raw = open(path, encoding="utf-8").read()

    root_tag = re.search(r"<svg[^>]*>", raw)
    if not root_tag:
        return ["no <svg> root element"]
    if len(re.findall(r"\bfill=", root_tag.group(0))) > 1:
        problems.append("duplicate fill attribute on <svg> root; will not render via <img>")

    try:
        root = ET.parse(path).getroot()
    except ET.ParseError as exc:
        problems.append("not well-formed XML: %s" % exc)
        return problems

    if not root.get("viewBox"):
        problems.append("no viewBox; will not scale in the wall")

    root_fill = root.get("fill", "")
    visible = 0
    for el in root.iter():
        if el.tag.replace(NS, "") not in SHAPES:
            continue
        fill = el.get("fill")
        if fill is None:
            style = el.get("style", "") or ""
            m = re.search(r"fill\s*:\s*([^;]+)", style)
            fill = m.group(1).strip() if m else root_fill
        if fill and fill != "none":
            visible += 1
    if visible == 0:
        problems.append("every shape resolves to fill:none; renders blank")

    off = sorted(set(re.findall(r'(?:fill|stroke)="(?!none")([^"]+)"', raw)) - {GREY})
    if off:
        problems.append("non-grey colours present: %s" % ", ".join(off))
    return problems

def main():
    files = sorted(glob.glob(os.path.join(LOGO_DIR, "*.svg")))
    if not files:
        print("no SVGs found in %s" % LOGO_DIR)
        return 1
    failed = 0
    for path in files:
        problems = check(path)
        name = os.path.basename(path)
        if problems:
            failed += 1
            print("FAIL %s" % name)
            for p in problems:
                print("     %s" % p)
        else:
            print("ok   %s" % name)
    print("\n%d file(s) checked, %d failed" % (len(files), failed))
    return 1 if failed else 0

if __name__ == "__main__":
    sys.exit(main())
