# scholarstreet-org — Claude Code Context

## What this is
The scholarstreet.org marketing and public-facing website for Scholar Street, a Virginia 501(c)(3) Scholarship Granting Organization (SGO). This is separate from the Scholarship Insights LLC platform (ScholarPath repo).

## Pages
- index.html — homepage
- donate.html — donor-facing giving page
- contact.html — contact page
- impact.html — impact/outcomes page
- leadership.html — board and leadership page
- platform.html — how the platform works
- how-giving-works.html — donor education
- why-25f.html — explains the federal Education Freedom Tax Credit (IRC §25F)
- news.html + news/*.html — **generated**; articles copied from the Substack newsletter

## News (Substack sync)
- `scripts/sync_substack.py` reads the Substack RSS feed and writes `news/<slug>.html`, the article list in `news.html`, and `sitemap.xml`. Standard library only.
- `.github/workflows/sync-substack.yml` runs it Mondays 13:00 UTC and on demand ("Run workflow"), then commits and pushes, which deploys. Every run also commits `scripts/last-sync.txt` so GitHub never disables the schedule for inactivity (60 days in a public repo).
- `news.html` is the template for article pages: edit its nav/footer/CSS like any other page, but never hand-edit inside the `<!-- HEAD -->` / `<!-- MAIN -->` markers or any file in `news/` — the next sync overwrites them. Rerun the script after changing `news.html`.
- Nav/footer changes must be made in all pages *including* `news.html`.
- `_redirects` 404s `/CLAUDE.md`, `/scripts/*`, `/news/data/*`, `/.github/*` — Netlify publishes the whole repo.

## Entity rules (critical)
- This site belongs to Scholar Street (the nonprofit). Never blend it with Scholarship Insights LLC content.
- "Scholar Street" is always two words in all public-facing content on this site.
- Never reference: ScholarPath, scholarstreet.io, internal Supabase/Salesforce IDs, UAT artifacts, or Scholarship Insights LLC internal details.

## Working style
- Short direct answers. Code snippets over explanations.
- Never include credentials, API keys, or donor/family personal data in any file.
- This is a public repo — nothing sensitive goes here.
