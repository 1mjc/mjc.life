# How to edit mjc

Everything you can read on the site lives in plain text files here. Edit one, then run:

    python3 _source/build.py

(Needs Python 3, nothing to install. It rewrites the .html pages in the site root; commit them.)
On Windows, type `python` instead of `python3`:  `python _source/build.py`
It stops with a plain message if something in a file is missing.

## Where things are

| You want to change                                   | Open                                  |
|------------------------------------------------------|---------------------------------------|
| The headline under "mjc", the nav, map branch names, services, about, contact, footer wording | `content/site.txt` |
| A project's words, details, links, images, order     | `content/projects/<name>.md`          |
| Artwork: titles, dates, tattoos, process, mint links | `content/art.md`                      |
| Videos                                               | `content/projects/video.md`           |

Lines starting with `#` are notes to yourself and are ignored.
Inside any text: `*italic*`, `**bold**`, `[link text](https://...)`.

## A project file (`content/projects/*.md`)

The top block (between the `---` lines) is the card on the map and the facts list:

- `branch:` which map branch it hangs from (one of the ids under `[branches]` in site.txt: worlds, ads, platforms, experiments, art).
- `order:` smaller number = earlier. It sets the order of projects inside their branch on the map (top to bottom), the Work page and the "next project" links. The branches themselves are ordered by `[branches]` in site.txt.
- `theme:` the look (emp, mango, vvv, dirt, arch, vr, ink, reel). Each is its own colours and typeface in `assets/css/style.css`.
- `card:` the one line on the map card. `tagline:` the line at the top of the open project.
- `image:` the card picture (a path inside `assets/images`). Leave it out for no picture.
- `meta:` the Type / Role / Status list. `shots:` pictures: `- file | alt text | caption`.

Below the block, every `## Heading` is a section. A section can be paragraphs, `- ` bullet lists or `1. ` numbered lists.
`## ~diagram: Title` makes a text diagram: put the ASCII art in a ``` fence, then a plain sentence describing it for screen readers.

**Add a project:** copy any file in `content/projects/`, change `id:` (any unique word), `page:` (the .html name), the words, and pick a `branch:` and `order:`.
A brand-new look needs a new `.t-yourtheme` block in `assets/css/style.css` (copy one of the existing ones).

**Remove a project:** delete its file.  **Add a branch:** add a line under `[branches]` in site.txt.

## Art (`content/art.md`)

Each `## Title` block is one piece. The outside view shows a tile: image, title, date. Clicking it opens a small window with details and process; click outside it, or press Esc, to put it away.
Pieces are grouped into toggles: Tattoos first (add `group: tattoo`), then one toggle per year from `date:` (newest first), then Undated.
See the how-to at the top of the file (date, medium, size, placement, process_images, mint link, `draft: yes` to hide).
The Instagram and Manifold links at the top of the Art window are the first lines of that file.

## Video

Add lines under `videos:` in `content/projects/video.md`: `title | link | year | one line`.
YouTube and Vimeo links play on the page (nothing loads from them until someone presses play); other links open in a new tab.

## Fonts

Every project has its own typeface, all self-hosted in `assets/fonts` (see FONTS.txt there for names and licences).
