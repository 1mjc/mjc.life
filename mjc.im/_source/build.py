#!/usr/bin/env python3
"""
mjc site builder.  Plain Python 3, nothing to install.

    python3 _source/build.py

Reads the words from  _source/content/site.txt  and  _source/content/projects/*.md
and writes the finished HTML pages into the site root (the folder above _source).
Commit the generated .html files like any others; Vercel just serves them.
"""
import html
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CONTENT = os.path.join(HERE, "content")
IMG = "assets/images/"


# ----------------------------------------------------------------------------
# tiny text helpers (a very small slice of markdown)
# ----------------------------------------------------------------------------
def esc(s):
    return html.escape(s, quote=True)


def inline(s):
    """*italic*  **bold**  [text](link) — everything else is plain text."""
    s = html.escape(s, quote=False)

    def link(m):
        href = m.group(2)
        ext = ' target="_blank" rel="noopener"' if href.startswith("http") else ""
        return f'<a href="{href}"{ext}>{m.group(1)}</a>'

    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    return s


def blocks(text):
    """Paragraphs, '- ' bullet lists and '1. ' numbered lists."""
    out = []
    for chunk in re.split(r"\n\s*\n", text.strip()):
        lines = [l.rstrip() for l in chunk.strip().split("\n") if l.strip()]
        if not lines:
            continue
        if all(l.startswith("- ") for l in lines):
            out.append("<ul>" + "".join(f"<li>{inline(l[2:])}</li>" for l in lines) + "</ul>")
        elif all(re.match(r"\d+\.\s", l) for l in lines):
            out.append("<ol>" + "".join("<li>" + inline(re.sub(r'^\d+\.\s', '', l)) + "</li>" for l in lines) + "</ol>")
        else:
            out.append(f"<p>{inline(' '.join(lines))}</p>")
    return "".join(out)


def die(msg):
    sys.stderr.write("\nBUILD ERROR: " + msg + "\n\n")
    sys.exit(1)


# ----------------------------------------------------------------------------
# reading content
# ----------------------------------------------------------------------------
def parse_site(path):
    sec, key, data = None, None, {}
    for raw in open(path, encoding="utf-8").read().split("\n"):
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = re.match(r"\[([a-z_]+)\]$", line.strip())
        if m:
            sec, key = m.group(1), None
            data[sec] = {}
            continue
        if sec is None:
            continue
        if line.startswith("- "):
            k = key or "_items"
            data[sec].setdefault(k, []).append([x.strip() for x in line[2:].split("|")])
            continue
        k, _, v = line.partition(":")
        k, v = k.strip(), v.strip()
        if v == "":
            key = k
            data[sec].setdefault(k, [])
        else:
            key = None
            data[sec][k] = v
    return data


def parse_project(path):
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    if not m:
        die(f"{os.path.basename(path)}: the top of the file needs a --- block.")
    fm, body = m.group(1), m.group(2)
    d, key = {}, None
    for line in fm.split("\n"):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.startswith(" "):
            s = line.strip()
            if s.startswith("- "):
                d[key].append([x.strip() for x in s[2:].split("|")])
            else:
                k, v = s.split(":", 1)
                d[key].append((k.strip(), v.strip()))
        else:
            k, _, v = line.partition(":")
            k, v = k.strip(), v.strip()
            if v == "":
                d[k], key = [], k
            else:
                d[k], key = v, None
    for need in ("id", "page", "theme", "branch", "order", "name", "kind", "card", "tagline"):
        if need not in d:
            die(f"{os.path.basename(path)}: missing '{need}:' at the top.")
    d["order"] = float(d["order"])
    d.setdefault("meta", [])
    d.setdefault("shots", [])
    d.setdefault("gallery", [])
    d.setdefault("videos", [])
    d.setdefault("layout", "")
    d.setdefault("image", None)
    d.setdefault("seo_title", f"{d['name']} | mjc")
    d.setdefault("seo_description", d["card"])
    parts = re.split(r"^## (.+)$", body, flags=re.M)
    rows, diagram = [], None
    for i in range(1, len(parts), 2):
        head, text = parts[i].strip(), parts[i + 1]
        if head.startswith("~diagram:"):
            fence = re.search(r"```[^\n]*\n(.*?)\n```", text, re.S)
            art = fence.group(1) if fence else ""
            sr = re.sub(r"```.*?```", "", text, flags=re.S).strip()
            diagram = (head[len("~diagram:"):].strip(), art, " ".join(sr.split()))
        else:
            rows.append((head, blocks(text)))
    d["rows"], d["diagram"] = rows, diagram
    return d



MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-") or "piece"


def fmt_date(raw):
    m = re.match(r"(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?", raw or "")
    if not m:
        return "", "", ""
    y, mo, dd = m.group(1), m.group(2), m.group(3)
    if dd and mo:
        return y, f"{int(dd)} {MONTHS[int(mo) - 1]} {y}", f"{y}-{int(mo):02d}-{int(dd):02d}"
    if mo:
        return y, f"{MONTHS[int(mo) - 1]} {y}", f"{y}-{int(mo):02d}"
    return y, y, y


def parse_art(path):
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n(.*)", raw, re.S)
    if not m:
        die("art.md: the top of the file needs a --- block.")
    top = {}
    for line in m.group(1).split("\n"):
        if line.strip() and not line.lstrip().startswith("#") and ":" in line:
            k, _, v = line.partition(":")
            top[k.strip()] = v.strip()
    parts = re.split(r"^## (.+)$", m.group(2), flags=re.M)
    pieces, seen = [], set()
    for i in range(1, len(parts), 2):
        title, text = parts[i].strip(), parts[i + 1].strip("\n")
        header, _, rest = text.partition("\n\n")
        e, key = {"process_images": []}, None
        for line in header.split("\n"):
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if line.startswith(" "):
                e["process_images"].append([x.strip() for x in line.strip()[2:].split("|")])
            else:
                k, _, v = line.partition(":")
                if k.strip() != "process_images":
                    e[k.strip()] = v.strip()
        if e.get("draft", "").lower() in ("yes", "true", "1"):
            continue
        before, _, after = rest.partition("### Process")
        e["title"], e["details"], e["process"] = title, blocks(before), blocks(after)
        slug = base = slugify(title)
        n = 2
        while slug in seen:
            slug, n = f"{base}-{n}", n + 1
        seen.add(slug)
        e["slug"] = slug
        e["year"], e["when"], e["iso"] = fmt_date(e.get("date", ""))
        e["tattoo"] = e.get("group", "art").lower() == "tattoo"
        pieces.append(e)
    pieces.sort(key=lambda e: e.get("date", ""), reverse=True)
    return top, pieces


SITE = parse_site(os.path.join(CONTENT, "site.txt"))
PROJECTS = sorted(
    (parse_project(os.path.join(CONTENT, "projects", f))
     for f in os.listdir(os.path.join(CONTENT, "projects")) if f.endswith(".md")),
    key=lambda p: p["order"])
BYID = {p["id"]: p for p in PROJECTS}
ART_TOP, ART = parse_art(os.path.join(CONTENT, "art.md"))
for i, p in enumerate(PROJECTS):
    p["next"] = PROJECTS[i + 1]["id"] if i + 1 < len(PROJECTS) else None
    p["rank"] = i + 1

S = SITE["site"]
EMAIL = S["email"]
NAME = S["name"]
NAV = [(h, l) for l, h in (x[:2] for x in SITE["nav"]["_items"])]
BRANCHES = SITE["branches"]["_items"]
for p in PROJECTS:
    if p["branch"] not in [b[0] for b in BRANCHES]:
        die(f"{p['name']}: branch '{p['branch']}' isn't listed under [branches] in site.txt.")

SITE_URL = S.get("url", "https://mjc.im").rstrip("/") + "/"
FAVICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
           "%3Crect width='32' height='32' fill='%23ffffff'/%3E%3Ctext x='16' y='23' font-family='Garamond,Georgia,serif' "
           "font-size='20' text-anchor='middle' fill='%23111111'%3Emjc%3C/text%3E%3C/svg%3E")

LD = ('<script type="application/ld+json">\n{"@context":"https://schema.org","@type":"Person","name":"%s","alternateName":"mjc",'
      '"jobTitle":"%s","email":"%s","url":"%s","sameAs":["%s"],"description":"%s"}\n</script>'
      % (NAME, S.get("job_title", ""), EMAIL, SITE_URL, S["linkedin"], S["description"].replace('"', "'")))

# the black-ink theme is drawn with these SVG filters (rough edges, grit, wobbly letters)
INK_DEFS = """<svg class="defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
<filter id="ink-edge" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="7" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="22" xChannelSelector="R" yChannelSelector="G" result="rough"/>
<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3" result="grain"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  16 0 0 0 -2.5" result="holes"/>
<feComposite in="rough" in2="holes" operator="in"/>
</filter>
<filter id="ink-rough" x="-6%" y="-6%" width="112%" height="112%">
<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="9" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="ink-text" x="-4%" y="-8%" width="108%" height="116%">
<feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="2" seed="2" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G"/>
</filter>
</svg>
"""


def write(name, content):
    path = os.path.join(ROOT, name)
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def head(title, desc, extra="", home=False, image=None, path=""):
    scripts = '<script src="assets/js/web.js" defer></script>\n<script src="assets/js/sheet.js" defer></script>\n' if home else ""
    # link previews (LinkedIn, iMessage, email): a big picture + the page's real address
    img = SITE_URL + IMG + (image or S["share_image"])
    url = SITE_URL + ("" if path in ("", "index.html") else path)
    extra = (f'<link rel="canonical" href="{esc(url)}">\n<meta property="og:url" content="{esc(url)}">\n'
             f'<meta property="og:image" content="{esc(img)}">\n<meta name="twitter:image" content="{esc(img)}">\n') + extra
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="author" content="{esc(NAME)}">
<meta name="theme-color" content="#ffffff">
<meta property="og:type" content="website">
<meta property="og:site_name" content="mjc">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{FAVICON}">
<link rel="preload" href="assets/fonts/eb-garamond-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/css/style.css">
<script>document.documentElement.classList.add('js')</script>
<script src="assets/js/mjc.js" defer></script>
<script src="assets/js/art.js" defer></script>
{scripts}{extra}</head>
"""


def nav_html(active=""):
    items = ""
    for href, label in NAV:
        cur = ' aria-current="page"' if href == active else ""
        items += f'<li><a href="{href}"{cur}>{inline(label)}</a></li>'
    return f'<nav aria-label="Main"><ul>{items}</ul></nav>'


def inner_header(active):
    return f"""<body>
{INK_DEFS}<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
<a class="brand" href="index.html" aria-label="mjc, home">mjc</a>
{nav_html(active)}
</header>
<main id="main">
"""


FOOT_CORE = f"""</main>
<footer class="site-footer">
{nav_html()}
<p class="legal"><a href="mailto:{EMAIL}">{EMAIL}</a> &middot; <a href="{esc(S["linkedin"])}" rel="me noopener" target="_blank">LinkedIn</a> &middot; <a href="{esc(S["cv"])}" target="_blank">CV</a> &middot; &copy; {S.get("year", "")} mjc</p>
</footer>
"""
CLOSE = "</body>\n</html>\n"


def page(fname, title, desc, active, body, extra="", image=None):
    write(fname, head(title, desc, extra, image=image, path=fname) + inner_header(active) + body + FOOT_CORE + CLOSE)


# ----------------------------------------------------------------------------
# project pieces
# ----------------------------------------------------------------------------
def meta_html(items):
    return '<dl class="meta">' + "".join(f"<div><dt>{esc(k)}</dt><dd>{inline(v)}</dd></div>" for k, v in items) + "</dl>"


def shots_html(shots, rv):
    if not shots:
        return ""
    figs = "".join(
        f'<figure class="shot{rv}" data-hide-missing><img src="{IMG}{esc(s[0])}" alt="{esc(s[1])}" loading="lazy" decoding="async">'
        f"<figcaption>{esc(s[2]) if len(s) > 2 else ''}</figcaption></figure>" for s in shots)
    return f'<div class="shots cols-{len(shots)}">{figs}</div>'


def diagram_html(d, rv):
    if not d:
        return ""
    label, art, sr = d
    return (f'<figure class="diagram{rv}"><p class="label">{esc(label)}</p>'
            f'<div class="scroll" role="region" aria-label="{esc(label)}" tabindex="0"><pre aria-hidden="true">{html.escape(art, quote=False)}</pre></div>'
            f'<p class="sr-only">{esc(sr)}</p></figure>')


def rows_html(rows, rv):
    return '<div class="rows">' + "".join(
        f'<section class="row{rv}"><h2>{inline(h)}</h2><div class="txt">{b}</div></section>' for h, b in rows) + "</div>"


def art_pieces_html():
    groups = []
    tat = [e for e in ART if e["tattoo"]]
    if tat:
        groups.append(("Tattoos", tat))
    years = sorted({e["year"] for e in ART if not e["tattoo"] and e["year"]}, reverse=True)
    for y in years:
        groups.append((y, [e for e in ART if not e["tattoo"] and e["year"] == y]))
    und = [e for e in ART if not e["tattoo"] and not e["year"]]
    if und:
        groups.append(("Undated", und))
    out = ""
    for gi, (name, items) in enumerate(groups):
        tiles = ""
        for e in items:
            when = f'<time datetime="{e["iso"]}">{esc(e["when"])}</time>' if e["when"] else ""
            tiles += (f'<li data-hide-missing><a class="tile" href="{IMG}{esc(e["image"])}" data-art="{e["slug"]}">'
                      f'<span class="tim"><img src="{IMG}{esc(e["image"])}" alt="{esc(e.get("alt", e["title"]))}" loading="lazy" decoding="async"></span>'
                      f'<span class="tt">{inline(e["title"])}</span>{when}</a></li>')
        op = " open" if gi == 0 else ""
        out += (f'<details class="agroup"{op}><summary><span class="gname">{esc(name)}</span>'
                f'<span class="gcount">{len(items)}</span></summary><ul class="agrid">{tiles}</ul></details>')
    return out


def art_links_html():
    links = ""
    if ART_TOP.get("instagram_url"):
        links += f'<a href="{esc(ART_TOP["instagram_url"])}" target="_blank" rel="noopener">{esc(ART_TOP.get("instagram_label", "instagram"))}</a>'
    if ART_TOP.get("manifold_url"):
        links += f'<a href="{esc(ART_TOP["manifold_url"])}" target="_blank" rel="noopener">{esc(ART_TOP.get("manifold_label", "manifold.xyz"))}</a>'
    return f'<p class="alinks">{links}</p>' if links else ""


def art_templates_html():
    out = ""
    for e in ART:
        meta = "".join(f"<div><dt>{k}</dt><dd>{inline(e[key])}</dd></div>"
                       for k, key in (("Medium", "medium"), ("Size", "size"), ("Placement", "placement"), ("Date", "when")) if e.get(key))
        meta = f'<dl class="ameta">{meta}</dl>' if meta else ""
        proc = ""
        if e["process"] or e["process_images"]:
            figs = "".join(
                f'<figure data-hide-missing><img src="{IMG}{esc(pi[0])}" alt="{esc(pi[1] if len(pi) > 1 else "")}" loading="lazy" decoding="async">'
                f'<figcaption>{inline(pi[1]) if len(pi) > 1 else ""}</figcaption></figure>' for pi in e["process_images"])
            proc = f'<h3>Process</h3>{e["process"]}' + (f'<div class="aproc">{figs}</div>' if figs else "")
        mint = ""
        if e.get("mint"):
            mint = f'<p class="amint"><a href="{esc(e["mint"])}" target="_blank" rel="noopener">{esc(e.get("mint_label", "collect on manifold"))} &nearr;</a></p>'
        kind = "Tattoo" if e["tattoo"] else "Artwork"
        out += (f'<template id="a-{e["slug"]}"><article class="awin-in"><div class="awin-fig"><img src="{IMG}{esc(e["image"])}" alt="{esc(e.get("alt", e["title"]))}"></div>'
                f'<div class="awin-txt"><p class="label">{kind}{(" · " + esc(e["when"])) if e["when"] else ""}</p><h2>{inline(e["title"])}</h2>{meta}'
                f'{e["details"]}{proc}{mint}</div></article></template>\n')
    return out


AWIN = """<div class="awin" id="awin" hidden>
<div class="awin-back" data-aclose></div>
<div class="awin-card" role="dialog" aria-modal="true" aria-label="Artwork details">
<button class="awin-x" type="button" data-aclose>close <span aria-hidden="true">&times;</span></button>
<div class="awin-body"></div>
</div>
</div>
"""


ART_BLOCK = art_templates_html() + AWIN


def videos_html(vs):
    if not vs:
        return ""
    out = ""
    for v in vs:
        title = v[0]
        url = v[1] if len(v) > 1 else ""
        date = v[2] if len(v) > 2 else ""
        note = v[3] if len(v) > 3 else ""
        yt = re.search(r"(?:youtu\.be/|v=|embed/|shorts/)([\w-]{11})", url)
        vm = re.search(r"vimeo\.com/(?:video/)?(\d+)", url)
        embed = (f"https://www.youtube-nocookie.com/embed/{yt.group(1)}?autoplay=1&rel=0" if yt
                 else f"https://player.vimeo.com/video/{vm.group(1)}?autoplay=1" if vm else "")
        play = '<span class="vtri" aria-hidden="true"></span><span class="vname">' + inline(title) + "</span>"
        if embed:
            box = f'<button class="vplay" type="button" data-embed="{esc(embed)}" aria-label="Play {esc(title)}">{play}</button>'
        else:
            box = f'<a class="vplay" href="{esc(url)}" target="_blank" rel="noopener">{play}</a>'
        cap = (f'<figcaption>{("<time>" + esc(date) + "</time> ") if date else ""}{inline(note)}</figcaption>' if (date or note) else "")
        out += f'<figure class="vid">{box}{cap}</figure>'
    return f'<div class="vids">{out}</div>'


def render_inner(p, reveal):
    rv = " reveal" if reveal else ""
    head_html = (f'<header class="isl-head"><p class="label">{inline(p["kind"])}</p><h1>{inline(p["name"])}</h1>'
                 f'<p class="tagline">{inline(p["tagline"])}</p></header>')
    if p["layout"] == "art":
        return head_html + art_links_html() + rows_html(p["rows"], rv) + (art_pieces_html() or "")
    meta = meta_html(p["meta"]) if p["meta"] else ""
    return head_html + meta + videos_html(p["videos"]) + shots_html(p["shots"], rv) + diagram_html(p["diagram"], rv) + rows_html(p["rows"], rv)


PP = SITE["project_pages"]


def render_next(p):
    if p["next"]:
        n = BYID[p["next"]]
        return (f'<nav class="next" aria-label="Next project"><a class="next-link" href="{n["page"]}" data-open="{n["id"]}">'
                f'<span class="label">{esc(PP["next_label"])}</span><span class="next-title">{inline(n["name"])}</span></a></nav>')
    return (f'<nav class="next" aria-label="Back to the start"><a class="next-link" href="index.html#main" data-close="1">'
            f'<span class="label">{esc(PP["end_label"])}</span><span class="next-title">{esc(PP["end_title"])}</span></a></nav>')


for p in PROJECTS:
    body = f"""<article>
<div class="wrap">
<a class="back" href="index.html#main">{esc(PP["back"])}</a>
<div class="island t-{p["theme"]}">
{render_inner(p, True)}
</div>
{render_next(p)}
</div>
</article>
"""
    share = p["image"] or (p["shots"][0][0] if p.get("shots") else None)
    page(p["page"], p["seo_title"], p["seo_description"], "work.html", body + (ART_BLOCK if p["layout"] == "art" else ""), image=share)


# ----------------------------------------------------------------------------
# map cards and hubs
# ----------------------------------------------------------------------------
def card(p, node=False, parent=None, chain=None, d="0s"):
    attrs = f' data-open="{p["id"]}"'
    cls = "card"
    if node:
        cls = "n card"
        attrs += f' data-id="{p["id"]}" data-parent="{parent}" data-o="{p["rank"]}"' + (f' data-chain="{chain}"' if chain else "")
    thumb = (f'<div class="thumb"><img src="{IMG}{esc(p["image"])}" alt="" loading="lazy" decoding="async"></div>' if p["image"] else "")
    return (f'<a class="{cls} t-{p["theme"]}" href="{p["page"]}"{attrs} style="--d:{d};--o:{p["rank"]}">\n'
            f'{thumb}<div class="cbody"><p class="k">{inline(p["kind"])}</p><h3>{inline(p["name"])}</h3><p class="c">{inline(p["card"])}</p></div>\n</a>\n')


def hub(hid, label, cap, link=None):
    el = (f'<a class="hub strong" href="{esc(link)}">{inline(label)}</a>' if link else f'<button class="hub" type="button">{inline(label)}</button>')
    return f'<div class="n hubw" data-id="{hid}" data-parent="root">{el}<p class="cap">{inline(cap)}</p></div>\n'


STAGGER = [26, 0, 58, 16, 72, 6, 44]
DELAYS = ["-2s", "-4s", "-1s", "-5s", "-3s", "-6s", "-2.5s", "-3.5s"]
cols = ""
live = [b for b in BRANCHES if any(p["branch"] == b[0] for p in PROJECTS)]
k = 0
for bi, b in enumerate(live):
    bid, label, cap = b[0], b[1], b[2]
    link = b[3] if len(b) > 3 and b[3] else None
    inner = hub(f"h-{bid}", label, cap, link)
    prev = None
    leaves = ""
    for p in (q for q in PROJECTS if q["branch"] == bid):
        # each card sits in a .leaf so the phone tree can draw its connector lines (the card itself clips its corners)
        leaves += '<div class="leaf">' + chr(10) + card(p, True, f"h-{bid}", chain=prev, d=DELAYS[k % len(DELAYS)]) + '</div>' + chr(10)
        prev = p["id"]
        k += 1
    inner += '<div class="leaves">' + chr(10) + leaves + '</div>' + chr(10)
    cols += f'<div class="col" style="--s:{STAGGER[bi % len(STAGGER)]}px">\n{inner}</div>\n'

HERO = SITE["hero"]
MAP = SITE["map"]
CL = SITE["home_closing"]
HOME = f"""<body class="home">
{INK_DEFS}<a class="skip" href="#main">Skip to content</a>
<header class="hero">
{nav_html()}
<h1 class="title" aria-label="mjc"><span class="ltr" aria-hidden="true">m</span><span class="ltr" aria-hidden="true">j</span><span class="ltr" aria-hidden="true">c</span></h1>
<div class="tag">
<p class="a"><mark>{inline(HERO["tagline"])}</mark></p>
<p class="b">{inline(HERO["sub"])}</p>
</div>
<p class="cue" aria-hidden="true">&darr;</p>
</header>
<main id="main">
<section class="web" data-web aria-label="{esc(MAP["label"])}">
<svg class="web-svg" aria-hidden="true" focusable="false"></svg>
<span class="root-dot" data-id="root" aria-hidden="true"></span>
<div class="web-grid" style="--n:{len(live)}">
{cols}</div>
</section>

<section class="hello">
<p class="h">{inline(CL["heading"])}</p>
<p><a class="btn" href="contact.html">{inline(CL["button"])}</a></p>
<p><a class="email textlink" href="mailto:{EMAIL}">{EMAIL}</a></p>
</section>
"""
templates = "".join(
    f'<template id="p-{p["id"]}" data-theme="{p["theme"]}" data-file="{p["page"]}"><div class="sheet-inner">{render_inner(p, False)}{render_next(p)}</div></template>\n'
    for p in PROJECTS)
SHEET = """<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Project details" hidden>
<button class="sheet-close" type="button">close <span aria-hidden="true">&times;</span></button>
<div class="sheet-body"></div>
</div>
"""
write("index.html", head(S["title"], S["description"], extra=LD + "\n", home=True) + HOME + FOOT_CORE + templates + ART_BLOCK + SHEET + CLOSE)

# ----------------------------------------------------------------------------
# work
# ----------------------------------------------------------------------------
W = SITE["work"]
WORK = f"""<div class="page-head">
<p class="label">{inline(W["label"])}</p>
<h1>{inline(W["title"])}</h1>
<p class="intro">{inline(W["intro"])}</p>
</div>
<div class="wrap">
<div class="list">
{"".join(card(p) for p in PROJECTS)}</div>
</div>
"""
page("work.html", W["seo_title"], W["seo_description"], "work.html", WORK)

# ----------------------------------------------------------------------------
# services
# ----------------------------------------------------------------------------
V = SITE["services"]
offers = "".join(f"<div><h3>{inline(o[0])}</h3><p>{inline(o[1])}</p></div>" for o in V["offers"])
why = "".join(f"<div><h3>{inline(o[0])}</h3><p>{inline(o[1])}</p></div>" for o in V["why"])
starts = "".join(f"<div><h3>{inline(o[0])}</h3><p>{inline(o[1])}</p></div>" for o in V["starts"])
SERVICES = f"""<div class="page-head">
<p class="label">{inline(V["label"])}</p>
<h1>{inline(V["title"])}</h1>
<p class="intro">{inline(V["intro"])}</p>
</div>
<div class="prose">
<section class="offer">
{offers}
</section>
<section>
<h2>{inline(V["why_heading"])}</h2>
<div class="why">
{why}
</div>
</section>
<section>
<h2>{inline(V["start_heading"])}</h2>
<div class="start3">
{starts}
</div>
<p class="muted" style="margin-top:1.2em">{inline(V["start_note"])}</p>
</section>
<section>
<p>{inline(V["solo"])}</p>
<p><a class="btn" href="contact.html">{inline(V["button"])}</a></p>
<p class="muted">{inline(V["back_note"])}</p>
</section>
</div>
"""
page("services.html", V["seo_title"], V["seo_description"], "services.html", SERVICES)

# ----------------------------------------------------------------------------
# about
# ----------------------------------------------------------------------------
A = SITE["about"]
secs = ""
for row in A["sections"]:
    cls = ' class="quote"' if len(row) > 2 and row[2].strip().lower() == "quote" else ""
    secs += f'<section>\n<h2>{inline(row[0])}</h2>\n<p{cls}>{inline(row[1])}</p>\n</section>\n'
ABOUT = f"""<div class="page-head">
<p class="label">{inline(A["label"])}</p>
<h1>{inline(A["title"])}</h1>
</div>
<div class="prose">
<section>
<p class="big">{inline(A["big"])}</p>
</section>
{secs}<section>
<p><a class="btn" href="contact.html">{inline(A["button"])}</a></p>
</section>
</div>
"""
page("about.html", A["seo_title"], A["seo_description"], "about.html", ABOUT)

# ----------------------------------------------------------------------------
# contact
# ----------------------------------------------------------------------------
C = SITE["contact"]
CONTACT = f"""<div class="page-head">
<p class="label">{inline(C["label"])}</p>
<h1>{inline(C["title"])}</h1>
<p class="intro">{inline(C["intro"])}</p>
</div>
<div class="contact">
<a class="email-link" href="mailto:{EMAIL}">{EMAIL}</a>
<p class="muted">{inline(C["linkedin_note"])} <a class="textlink" href="{esc(S["linkedin"])}" rel="me noopener" target="_blank">LinkedIn</a>.</p>
<p class="muted">{inline(C["form_note"])}</p>
<form data-hello data-to="{EMAIL}">
<div class="field"><label for="name">{esc(C["name_label"])}</label><input id="name" name="name" autocomplete="name" required></div>
<div class="field"><label for="brand">{esc(C["brand_label"])}</label><input id="brand" name="brand" autocomplete="organization"></div>
<div class="field"><label for="message">{esc(C["message_label"])}</label><textarea id="message" name="message" required placeholder="{esc(C["message_placeholder"])}"></textarea></div>
<button class="btn" type="submit">{esc(C["submit"])}</button>
<p class="form-note" id="form-note" hidden>{esc(C["fallback"])} {EMAIL}.</p>
<noscript><p class="form-note">{esc(C["nojs"])} {EMAIL} directly.</p></noscript>
</form>
</div>
"""
page("contact.html", C["seo_title"], C["seo_description"], "contact.html", CONTACT)

# ----------------------------------------------------------------------------
# 404 (Vercel serves 404.html for any address that doesn't exist)
# ----------------------------------------------------------------------------
NF = SITE["notfound"]
NOTFOUND = f"""<div class="page-head">
<p class="label">{inline(NF["label"])}</p>
<h1>{inline(NF["title"])}</h1>
<p class="intro">{inline(NF["intro"])}</p>
<p><a class="btn" href="index.html#main">{inline(NF["button"])}</a></p>
</div>
"""
# <base href="/"> keeps styles and links working even at a deep broken address like /a/b/c
write("404.html", head(NF["title"] + " | mjc", NF["intro"].split(".")[0] + ".").replace("<head>\n", '<head>\n<base href="/">\n<meta name="robots" content="noindex">\n', 1)
      + inner_header("") + NOTFOUND + FOOT_CORE + CLOSE)

print(f"built {len(PROJECTS)} projects + 6 pages into {ROOT}")
