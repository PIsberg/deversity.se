#!/usr/bin/env python3
"""Validate the static pages: markup closes, assets resolve, wiring is present.

Written after the 2026 redesign shipped two breakages that no browser reports:

  * pricing.html lost its closing </body></html>. Browsers auto-close, so the
    page renders and only a validator notices.
  * pricing.html lost its Paddle <script> block when the page was rebuilt. The
    Buy buttons and #checkout-status were still in the markup, so the page
    looked finished while every Buy button did nothing at all.

Neither is visible on the rendered page, which is why they need a check rather
than another look. Everything here runs offline, against the working tree.

Usage: python tools/check-pages.py
"""
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))

PAGES = [
    "404.html",
    "index.html",
    "pricing.html",
    "privacy.html",
    "refunds.html",
    "terms.html",
    "llmfw/index.html",
    "vibetags/index.html",
]

# Every page shares the header, footer and behaviour in assets/, so every page
# has to opt into them the same way.
REQUIRED = [
    (r'<html lang="en">', "no <html lang>"),
    (r'class="skip-link"', "no skip link"),
    (r'id="main"', 'no id="main" landmark to skip to'),
    (r"documentElement\.classList\.add\('js'\)",
     "no inline js-class script; the mobile menu will not collapse"),
    (r'src="/assets/site\.js"', "does not load /assets/site.js"),
    (r'href="/assets/site\.css"', "does not load /assets/site.css"),
]

VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "source", "track", "wbr",
}


def read(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


def strip_svg_and_code(html):
    """Drop <svg> subtrees and script/style bodies before parsing tags."""
    html = re.sub(r"<svg\b.*?</svg>", "", html, flags=re.S | re.I)
    html = re.sub(r"<script\b.*?</script>", "", html, flags=re.S | re.I)
    html = re.sub(r"<style\b.*?</style>", "", html, flags=re.S | re.I)
    return re.sub(r"<!--.*?-->", "", html, flags=re.S)


def unclosed_tags(html):
    """Return the tags left open at end of document, outermost first."""
    stack = []
    for m in re.finditer(r"<(/?)([a-zA-Z][\w-]*)([^>]*?)(/?)>", strip_svg_and_code(html)):
        closing, name, selfclose = m.group(1), m.group(2).lower(), m.group(4)
        if name in VOID or selfclose:
            continue
        if not closing:
            stack.append(name)
        elif name in stack:
            del stack[stack.index(name):]
    return stack


def local_refs(rel, html):
    """Every same-origin href/src on the page, as repo-relative paths."""
    out = []
    for m in re.finditer(r'(?:src|href)="([^"]+)"', html):
        ref = m.group(1)
        if ref.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        path = ref.split("#")[0].split("?")[0]
        if not path:
            continue
        if path.startswith("/"):
            out.append((ref, path.lstrip("/")))
        else:
            out.append((ref, os.path.normpath(os.path.join(os.path.dirname(rel), path))))
    return out


def css_class_names(text):
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    names = set()
    for m in re.finditer(r"([^{}]+)\{", text):
        for name in re.findall(r"\.(-?[_a-zA-Z][\w-]*)", m.group(1)):
            names.add(name)
    return names


def script_class_names(rel, html):
    """Class names any script on the page could add or query at runtime.

    Split each quoted literal on whitespace: a script that does
    className = 'buy buy-link' is using both names, and matching the literal
    whole would report the second one as an orphan.
    """
    sources = [html] if "<script" in html else []
    for js in ("assets/site.js", "assets/mascot.js",
               os.path.join(os.path.dirname(rel), "app.js")):
        full = os.path.join(ROOT, js)
        if os.path.exists(full):
            sources.append(open(full, encoding="utf-8").read())
    names = set()
    for text in sources:
        for literal in re.findall(r"""['"]([^'"
]{0,120})['"]""", text):
            for token in literal.lstrip(".").split():
                if re.fullmatch(r"[a-zA-Z][\w-]*", token):
                    names.add(token)
    return names


def check(rel):
    problems = []
    html = read(rel)

    left = unclosed_tags(html)
    if left:
        problems.append("never closed: %s" % ", ".join("<%s>" % t for t in left))

    for pattern, message in REQUIRED:
        if not re.search(pattern, html):
            problems.append(message)

    for ref, path in local_refs(rel, html):
        if not os.path.exists(os.path.join(ROOT, path)):
            problems.append('href/src "%s" resolves to %s, which does not exist' % (ref, path))

    # A Buy button is only a button. Something on the page has to open the
    # checkout, or the control is decoration over a dead click.
    if re.search(r'<button[^>]*\bclass="buy\b', html):
        if "cdn.paddle.com" not in html:
            problems.append("has Buy buttons but never loads paddle.js")
        if not (re.search(r"Paddle\.Checkout\.open", html)
                or re.search(r'<script src="app\.js"', html)):
            problems.append("has Buy buttons but nothing calls Paddle.Checkout.open")
        if not re.search(r'id="checkout-status"', html):
            problems.append("has Buy buttons but no #checkout-status to report a failed checkout")

    # Class names in the markup that no stylesheet the page loads defines, and
    # no script uses either. Usually a leftover from an earlier design: it reads
    # as a styling hook while doing nothing.
    defined = set()
    for _ref, path in local_refs(rel, html):
        full = os.path.join(ROOT, path)
        if path.endswith(".css") and os.path.exists(full):
            defined |= css_class_names(open(full, encoding="utf-8").read())
    for m in re.finditer(r"<style[^>]*>(.*?)</style>", html, flags=re.S):
        defined |= css_class_names(m.group(1))
    used = set()
    for m in re.finditer(r'class="([^"]*)"', html):
        used |= set(m.group(1).split())
    orphans = sorted(used - defined - script_class_names(rel, html))
    if orphans:
        problems.append("class names with no rule and no script use: %s" % ", ".join(orphans))

    return problems


def main():
    failed = 0
    for rel in PAGES:
        problems = check(rel)
        if problems:
            failed += 1
            print("FAIL %s" % rel)
            for p in problems:
                print("     %s" % p)
        else:
            print("ok   %s" % rel)
    print("\n%d page(s) checked, %d failed" % (len(PAGES), failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
