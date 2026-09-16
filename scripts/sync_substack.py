"""Copy Scholar Street's Substack articles onto scholarstreet.org.

Reads the public RSS feed, writes one page per article to news/<slug>.html,
rebuilds the article list in news.html, and regenerates sitemap.xml.

news.html is the template: every article page is news.html with its
<!-- HEAD --> and <!-- MAIN --> regions swapped out, so the nav, footer and
styles only ever need editing in one place (the same place as every other
page). Run it after changing news.html's chrome to carry the change into the
article pages.

Standard library only, so the GitHub Action needs no install step.

    python scripts/sync_substack.py            # fetch the live feed
    python scripts/sync_substack.py feed.xml   # use a saved copy

Articles are never deleted. The feed only carries the most recent posts, so
an article missing from it has aged out, not been unpublished; its page stays.
To remove one, delete news/<slug>.html and news/data/<slug>.json by hand.
"""

import email.utils
import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

FEED_URL = "https://scholarstreet.substack.com/feed"
API_URL = "https://scholarstreet.substack.com/api/v1"
SITE = "https://scholarstreet.org"
ROOT = Path(__file__).resolve().parent.parent
NEWS_DIR = ROOT / "news"
# One JSON file per article. The feed drops old posts, so these -- not the
# feed -- are the record the list page and sitemap are built from.
DATA_DIR = NEWS_DIR / "data"
TEMPLATE = ROOT / "news.html"

NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
}

# Pages listed in the sitemap alongside the articles, in nav order.
STATIC_PAGES = [
    "", "impact.html", "platform.html", "leadership.html", "news.html",
    "contact.html",
    "donate.html",
]


# ---------------------------------------------------------------------------
# Article HTML cleanup
# ---------------------------------------------------------------------------

ALLOWED = {
    "p", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "strong", "b",
    "em", "i", "a", "br", "hr", "img", "figure", "figcaption", "sup", "sub",
    "code", "pre", "table", "thead", "tbody", "tr", "th", "td",
}
# Every HTML void element, not just the allowed ones: an <input> or <source>
# inside a dropped widget has no end tag, and counting it as open would skip
# the rest of the article.
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "source", "track", "wbr"}
KEEP_ATTRS = {"a": {"href"}, "img": {"src", "alt"}}
# Substack widgets with no meaning off Substack. Dropped with everything
# inside them.
DROP_CLASSES = (
    "subscription-widget", "subscribe-widget", "button-wrapper",
    "share", "captioned-button", "digest-post-embed", "embedded-post",
    "image-link-expand", "footnote-anchor-wrap",
)
# Tags whose contents are never article text.
DROP_TAGS = {"script", "style", "form", "input", "button", "svg", "iframe"}


class Cleaner(HTMLParser):
    """Keep article markup, drop Substack's classes, widgets and scripts."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.skip_depth = 0      # >0 while inside a dropped element
        self.stack = []          # open tags, to know when a skip ends

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag not in VOID:
            self.stack.append(tag)
        if self.skip_depth:
            if tag not in VOID:
                self.skip_depth += 1
            return
        cls = attrs.get("class") or ""
        if tag in DROP_TAGS or any(c in cls for c in DROP_CLASSES):
            if tag not in VOID:
                self.skip_depth = 1
            return
        if tag not in ALLOWED:
            return
        kept = []
        for name in sorted(KEEP_ATTRS.get(tag, ())):
            value = attrs.get(name)
            if value is None:
                continue
            if name in ("href", "src") and not re.match(r"https?://|mailto:", value):
                continue
            kept.append(f' {name}="{html.escape(value, quote=True)}"')
        if tag == "a":
            kept.append(' target="_blank" rel="noopener"')
        if tag == "img":
            kept.append(' loading="lazy"')
        self.out.append(f"<{tag}{''.join(kept)}>")

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag in self.stack:
            while self.stack and self.stack.pop() != tag:
                pass
        if self.skip_depth:
            self.skip_depth -= 1
            return
        if tag in ALLOWED:
            self.out.append(f"</{tag}>")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1] == tag:
            self.handle_endtag(tag)

    def handle_data(self, data):
        if not self.skip_depth:
            self.out.append(data)

    def handle_entityref(self, name):
        if not self.skip_depth:
            self.out.append(f"&{name};")

    def handle_charref(self, name):
        if not self.skip_depth:
            self.out.append(f"&#{name};")


def clean_html(raw):
    c = Cleaner()
    c.feed(raw)
    c.close()
    body = "".join(c.out)
    body = re.sub(r"<p>\s*</p>", "", body)
    return body.strip()


# ---------------------------------------------------------------------------
# Feed
# ---------------------------------------------------------------------------

# Substack sits behind Cloudflare, which answers urllib's default
# "Python-urllib" user agent with an error page (code 1010) instead of the feed.
USER_AGENT = ("Mozilla/5.0 (compatible; ScholarStreetNewsSync/1.0; "
              "+https://scholarstreet.org/news.html)")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def read_feed(source):
    data = Path(source).read_bytes() if source else fetch(FEED_URL)
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        # A block page or outage. Fail the run loudly rather than carry on
        # with nothing and look like there were no new articles.
        sys.exit(f"feed is not XML -- blocked or down? First bytes: {data[:200]!r}")
    articles = []
    for item in root.iter("item"):
        link = (item.findtext("link") or "").strip()
        m = re.search(r"/p/([a-z0-9-]+)", link)
        body = item.findtext("content:encoded", namespaces=NS) or ""
        if not m or not body.strip():
            continue
        # Paid posts reach the feed truncated. Publishing half an article
        # would be worse than publishing none.
        if "paywall" in body:
            print(f"skip (paid, truncated in feed): {link}")
            continue
        published = email.utils.parsedate_to_datetime(item.findtext("pubDate"))
        enclosure = item.find("enclosure")
        articles.append({
            "slug": m.group(1),
            "title": html.unescape((item.findtext("title") or "").strip()),
            "description": html.unescape((item.findtext("description") or "").strip()),
            "author": (item.findtext("dc:creator", namespaces=NS) or "Scholar Street").strip(),
            "date": published.strftime("%Y-%m-%d"),
            "substack_url": link,
            "image": enclosure.get("url") if enclosure is not None else "",
            "body": clean_html(body),
        })
    return articles


def read_api(known_slugs):
    """Articles the feed is missing, from Substack's post API.

    Substack caches the feed per edge server, and on the day an article is
    published some servers keep handing out the old copy for hours. The
    archive endpoint is current, so it catches what the feed has not caught up
    to yet. It is undocumented: if it fails or changes shape, warn and rely on
    the feed alone -- the article will arrive on a later run.
    """
    try:
        listing = json.loads(fetch(f"{API_URL}/archive?sort=new&limit=12"))
    except Exception as e:  # noqa: BLE001 -- any failure here is non-fatal
        print(f"warning: archive API unavailable ({e}); using feed only")
        return []
    articles = []
    for item in listing:
        slug = item.get("slug")
        if not slug or slug in known_slugs or item.get("audience") != "everyone":
            continue
        try:
            post = json.loads(fetch(f"{API_URL}/posts/{slug}"))
            body = post["body_html"]
            published = post["post_date"][:10]
        except Exception as e:  # noqa: BLE001
            print(f"warning: could not fetch {slug} from API ({e})")
            continue
        if not body or "paywall" in body:
            continue
        bylines = post.get("publishedBylines") or []
        articles.append({
            "slug": slug,
            "title": (post.get("title") or "").strip(),
            "description": (post.get("subtitle") or post.get("description") or "").strip(),
            "author": bylines[0]["name"] if bylines else "Scholar Street",
            "date": published,
            "substack_url": post.get("canonical_url") or f"https://scholarstreet.substack.com/p/{slug}",
            "image": post.get("cover_image") or "",
            "body": clean_html(body),
        })
        print(f"from API (not yet in feed): {slug}")
    return articles


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

def region(page, name, replacement, filename="news.html"):
    pattern = re.compile(rf"(<!-- {name}:START -->).*?(<!-- {name}:END -->)", re.S)
    if not pattern.search(page):
        sys.exit(f"{filename} is missing its <!-- {name}:START/END --> markers")
    return pattern.sub(lambda m: m.group(1) + "\n" + replacement + "\n" + m.group(2), page)


def nice_date(iso):
    y, mo, d = iso.split("-")
    months = ["January", "February", "March", "April", "May", "June", "July",
              "August", "September", "October", "November", "December"]
    return f"{months[int(mo) - 1]} {int(d)}, {y}"


def esc(s):
    return html.escape(s, quote=True)


def head_block(title, description, url, image="", kind="website"):
    lines = [
        f"<title>{esc(title)}</title>",
        f'<meta name="description" content="{esc(description)}">',
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:type" content="{kind}">',
        f'<meta property="og:title" content="{esc(title)}">',
        f'<meta property="og:description" content="{esc(description)}">',
        f'<meta property="og:url" content="{url}">',
    ]
    if image:
        lines.append(f'<meta property="og:image" content="{esc(image)}">')
    return "\n".join(lines)


def article_page(template, a):
    url = f"{SITE}/news/{a['slug']}.html"
    page = region(template, "HEAD", head_block(
        f"{a['title']} — Scholar Street SGO", a["description"], url,
        a["image"], "article"))
    main = f"""<section class="page-hero">
  <div class="ph-bg-circle a"></div><div class="ph-bg-circle b"></div>
  <div class="wrap">
    <div class="s-eyebrow"><a href="news.html" class="crumb">News</a></div>
    <h1 class="ph-title">{esc(a['title'])}</h1>
    {f'<p class="ph-sub">{esc(a["description"])}</p>' if a["description"] else ""}
    <p class="post-meta">{esc(a['author'])} &middot; <time datetime="{a['date']}">{nice_date(a['date'])}</time></p>
  </div>
</section>

<section>
  <div class="wrap">
    <article class="post-body">
{a['body']}
    </article>
    <div class="post-foot">
      <p>This article first appeared in the Scholar Street newsletter.
      <a href="https://scholarstreet.substack.com/subscribe" target="_blank" rel="noopener">Subscribe on Substack</a>
      to get new articles by email.</p>
      <div class="post-actions">
        <a href="news.html" class="btn-outline">&larr; All News</a>
        <a href="donate.html" class="btn-gold">Support Scholar Street</a>
      </div>
    </div>
  </div>
</section>"""
    page = region(page, "MAIN", main)
    # Article pages live one directory down. Point the site's own relative
    # links (nav, footer, buttons) back up; absolute URLs are left alone.
    return re.sub(r'(href|src)="(?![a-z]+:|/|#|\.\./)([^"]+)"', r'\1="../\2"', page)


def index_main(articles):
    if articles:
        cards = "\n".join(f"""      <a class="news-card reveal" href="news/{a['slug']}.html">
        <time datetime="{a['date']}">{nice_date(a['date'])}</time>
        <h2>{esc(a['title'])}</h2>
        {f'<p>{esc(a["description"])}</p>' if a["description"] else ""}
        <span class="news-more">Read article &rarr;</span>
      </a>""" for a in articles)
    else:
        cards = '      <p class="s-lead">New articles will appear here.</p>'
    return f"""<section class="page-hero">
  <div class="ph-bg-circle a"></div><div class="ph-bg-circle b"></div>
  <div class="wrap">
    <div class="s-eyebrow">News &amp; Analysis</div>
    <h1 class="ph-title">What we&rsquo;re <em>watching.</em></h1>
    <p class="ph-sub">Plain-language analysis of the federal Education Freedom Tax Credit (IRC &#167;25F)
    for families, donors, schools and fellow scholarship organizations &mdash; what the rules say,
    what is still unresolved, and what it means for students.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="news-list">
{cards}
    </div>
    <div class="news-subscribe">
      <p>Get new articles by email.</p>
      <a href="https://scholarstreet.substack.com/subscribe" target="_blank" rel="noopener" class="btn-gold">Subscribe on Substack</a>
    </div>
  </div>
</section>"""


def latest_section(articles):
    """The homepage's newest-three block. Empty (no section at all) until
    there is an article to show."""
    if not articles:
        return ""
    cards = "\n".join(f"""      <a class="latest-card reveal" href="news/{a['slug']}.html">
        <time datetime="{a['date']}">{nice_date(a['date'])}</time>
        <h3>{esc(a['title'])}</h3>
        <span class="latest-more">Read article &rarr;</span>
      </a>""" for a in articles[:3])
    return f"""<section>
  <div class="wrap">
    <div class="s-eyebrow">Latest from Scholar Street</div>
    <h2 class="s-title">What we&rsquo;re <em>watching.</em></h2>
    <div class="latest-grid">
{cards}
    </div>
    <div class="latest-all"><a href="news.html" class="btn-outline">All News</a></div>
  </div>
</section>"""


def sitemap(articles):
    urls = [f"  <url><loc>{SITE}/{p}</loc></url>" for p in STATIC_PAGES]
    urls += [
        f"  <url><loc>{SITE}/news/{a['slug']}.html</loc><lastmod>{a['date']}</lastmod></url>"
        for a in articles
    ]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(urls) + "\n</urlset>\n")


def write_if_changed(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT).as_posix()}")
    return True


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else None
    fetched = read_feed(source)
    print(f"feed: {len(fetched)} article(s)")
    if not source:
        fetched += read_api({a["slug"] for a in fetched})
    for a in fetched:
        write_if_changed(DATA_DIR / f"{a['slug']}.json",
                         json.dumps(a, indent=2, ensure_ascii=False) + "\n")

    articles = [json.loads(p.read_text(encoding="utf-8"))
                for p in DATA_DIR.glob("*.json")]
    articles.sort(key=lambda a: (a["date"], a["slug"]), reverse=True)

    template = TEMPLATE.read_text(encoding="utf-8")
    template = region(template, "HEAD", head_block(
        "News — Scholar Street SGO",
        "Analysis of the federal Education Freedom Tax Credit (IRC 25F) from "
        "Scholar Street: what the rules say, what is unresolved, and what it "
        "means for families, donors and schools.",
        f"{SITE}/news.html"))
    template = region(template, "MAIN", index_main(articles))
    write_if_changed(TEMPLATE, template)

    for a in articles:
        write_if_changed(NEWS_DIR / f"{a['slug']}.html", article_page(template, a))
    home = ROOT / "index.html"
    write_if_changed(home, region(home.read_text(encoding="utf-8"), "LATEST",
                                  latest_section(articles), "index.html"))
    write_if_changed(ROOT / "sitemap.xml", sitemap(articles))


if __name__ == "__main__":
    main()
