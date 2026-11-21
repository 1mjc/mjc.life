# mjc site

Plain HTML, CSS and JS. Put everything in your repo root and Vercel serves it as-is (no build command needed).

**To change words, projects or art, you never touch the HTML.** Edit the text files in `_source/content/`, then run

    python3 _source/build.py

and commit the regenerated `.html` pages. Full instructions: `_source/README.md`.

- `_source/` is the editable source (copy lives here). `.vercelignore` keeps it off the live site.
- `assets/` holds styles, scripts, self-hosted fonts and your images.
- Pages: index (the map), work, each project, services, about, contact.
