# scholarstreet-org — Claude Code Context

## What this is
The scholarstreet.org marketing and public-facing website for Scholar Street, a Virginia 501(c)(3) Scholarship Granting Organization (SGO). This is separate from the Scholarship Insights LLC platform (ScholarPath repo).

## Pages
- index.html — homepage
- donate.html — donor-facing giving page
- contact.html — contact page
- impact.html — impact/outcomes, and since 2026-09-15 also the "Why §25F" and "How It Works" sections that used to be why-25f.html and how-giving-works.html; those URLs now 301 to its #why-25f / #how-it-works anchors
- leadership.html — board and leadership page
- platform.html — how the platform works
- news.html + news/*.html — **generated**; articles copied from the Substack newsletter

## News (Substack sync)
- `scripts/sync_substack.py` reads the Substack RSS feed and writes `news/<slug>.html`, the article list in `news.html`, `sitemap.xml`, and the extensionless-path 301s between the `# EXTENSIONLESS:START/END` markers in `_redirects`. Standard library only.
- **Sync by hand, locally:** `python scripts/sync_substack.py`, check the new page, then commit and push (a push to main deploys). Run it the day an article is published, then Request Indexing for the new scholarstreet.org URL in Search Console — the Substack copy declares its own canonical, so the earlier-crawled copy tends to win.
- No scheduled run. Substack's Cloudflare returns 403 to GitHub's runners, so the Monday schedule was removed 2026-09-28. `.github/workflows/sync-substack.yml` remains as a manual "Run workflow" button but hits the same 403.
- `news.html` is the template for article pages: edit its nav/footer/CSS like any other page, but never hand-edit inside the `<!-- HEAD -->` / `<!-- MAIN -->` markers or any file in `news/` — the next sync overwrites them. Rerun the script after changing `news.html`.
- Nav/footer changes must be made in all pages *including* `news.html`.
- `_redirects` 404s `/CLAUDE.md`, `/scripts/*`, `/news/data/*`, `/.github/*` — Netlify publishes the whole repo.
- Canonical URLs are the `.html` ones. Every sitemap page's extensionless path (`/impact`) 301s to it, because Netlify served both with a 200 and Google picked the extensionless copy. The sync script generates those rules from `STATIC_PAGES` plus the articles — add a new page to `STATIC_PAGES`, not to `_redirects`.

## Entity rules (critical)
- This site belongs to Scholar Street (the nonprofit). Never blend it with Scholarship Insights LLC content.
- "Scholar Street" is always two words in all public-facing content on this site.
- Never reference: ScholarPath, scholarstreet.io, internal Supabase/Salesforce IDs, UAT artifacts, or Scholarship Insights LLC internal details.

## Working style
- Short direct answers. Code snippets over explanations.
- Never include credentials, API keys, or donor/family personal data in any file.
- This is a public repo — nothing sensitive goes here.
