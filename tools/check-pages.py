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
    "llm-light/index.html",
]

# Old URLs that stay as redirect stubs, mapped to where they now point. The page
# was live at the old path, so links and search results still use it. A stub is
# not a page: it has no nav or footer, only a redirect, so it is checked for that
# and nothing else.
REDIRECTS = {
    "claude-light/index.html": "/llm-light/",
}

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

    problems.extend(band_problems(rel, html))

    return problems


def band_problems(rel, html):
    """Tier tables must scale with team size, with no flat open-ended top tier.

    A "200+" row read as one price for any team above 200, so a company of 800
    could fairly expect to pay what a company of 200 pays. Bands now run without
    gaps from 1 developer to 999, 1,000 and up is by email, and from 200 up every
    band adds the same step. A typo in a list price or a skipped band breaks the
    published ladder without anything looking wrong on the page.
    """
    rows = []
    for row in re.findall(r"<tr>.*?</tr>", html, flags=re.S):
        tier = re.search(r'<button[^>]*\bdata-tier="([^"]*)"', row)
        if tier:
            price = re.search(r'<td class="price"[^>]*>([^<]*)</td>', row)
            rows.append((tier.group(1), price.group(1) if price else ""))
    if not rows:
        return []

    problems = []
    bands = []
    for label, price in rows:
        m = re.fullmatch(r"(\d+) to (\d+) developers", label)
        if not m:
            problems.append('tier "%s" is not a closed "N to M developers" band' % label)
            continue
        bands.append((int(m.group(1)), int(m.group(2)), price))

    expected = 1
    for low, high, _price in bands:
        if low != expected:
            problems.append("tier bands leave a gap or overlap: expected one to start at "
                            "%d, found %d to %d" % (expected, low, high))
        expected = high + 1
    if expected != 1000:
        problems.append("tier bands should end at 999, but the next would start at %d" % expected)
    if not re.search(r"1,000 or more", html):
        problems.append('no "1,000 or more" row, so a larger team has no route to a price')

    # Pages not yet on sale have blank price cells; there is no ladder to check.
    amounts = []
    for low, _high, price in bands:
        m = re.search(r"([\d,]+)\s*$", price)
        if low >= 200 and m:
            amounts.append(int(m.group(1).replace(",", "")))
    steps = {b - a for a, b in zip(amounts, amounts[1:])}
    if len(steps) > 1:
        problems.append("list prices from 200 developers up do not rise by one step: %s" % amounts)
    elif steps and steps.pop() <= 0:
        problems.append("list prices from 200 developers up do not rise: %s" % amounts)

    # The label in app.js is what the checkout code knows the tier by.
    app = os.path.join(ROOT, os.path.dirname(rel), "app.js")
    if os.path.exists(app):
        for label in re.findall(r"label: '([^']*\+[^']*)'", open(app, encoding="utf-8").read()):
            problems.append('%s still has the open-ended label "%s"'
                            % (os.path.join(os.path.dirname(rel), "app.js"), label))
    return problems


def unlisted_pages():
    """HTML files in the tree that PAGES does not name.

    Every check above runs only on the pages listed, so a new page left out of
    PAGES passes by never being looked at. Walking the tree makes adding a page
    without listing it a failure instead of a silent gap.
    """
    found = set()
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for name in filenames:
            if name.endswith(".html"):
                found.add(os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/"))
    return sorted(found - set(PAGES) - set(REDIRECTS))


def check_redirect(rel, target):
    """A redirect stub must send browsers and crawlers to its target."""
    html = read(rel)
    problems = []
    if not re.search(r'<meta http-equiv="refresh" content="0;\s*url=%s"' % re.escape(target), html):
        problems.append("no <meta http-equiv=\"refresh\"> to %s" % target)
    if not re.search(r'<link rel="canonical" href="https://deversity\.se%s"' % re.escape(target), html):
        problems.append("no canonical link to https://deversity.se%s" % target)
    if not os.path.exists(os.path.join(ROOT, target.lstrip("/"), "index.html")):
        problems.append("redirects to %s, which has no index.html" % target)
    return problems


def main():
    failed = 0
    for rel in unlisted_pages():
        failed += 1
        print("FAIL %s" % rel)
        print("     not in PAGES, so none of these checks run on it")
    for rel in PAGES:
        problems = check(rel)
        if problems:
            failed += 1
            print("FAIL %s" % rel)
            for p in problems:
                print("     %s" % p)
        else:
            print("ok   %s" % rel)
    for rel, target in REDIRECTS.items():
        problems = check_redirect(rel, target)
        if problems:
            failed += 1
            print("FAIL %s (redirect)" % rel)
            for p in problems:
                print("     %s" % p)
        else:
            print("ok   %s -> %s" % (rel, target))
    total = len(PAGES) + len(REDIRECTS) + len(unlisted_pages())
    print("\n%d page(s) checked, %d failed" % (total, failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
