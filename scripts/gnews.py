"""Checks for the scheduled state-table job (scripts/state-updates-prompt.md).

  python scripts/gnews.py              everything below, numbered
  python scripts/gnews.py --days 14    the same, over a set number of days
  python scripts/gnews.py resolve 3 12 real article URLs for those numbers
                                       (3:2 = the second copy of item 3)
  python scripts/gnews.py done         record that the job finished a run

The window runs back to the last finished run (the `done` command), so a run
missed while the computer was asleep leaves no gap: at least MIN_DAYS, at
most MAX_DAYS. The first line printed says which window was used.

Three sections:
  NEWS        Google News: once nationally, then per state for ALL 50 states.
              States not opted in get three searches (program terms;
              "voucher"/"school choice" wording; governor's office or
              spokesperson quotes); opted-in states get the program-terms
              search. Syndicated copies of the same story are collapsed into
              one numbered item, so every number is a distinct article to read.
  NEWSROOMS   each of those governors' own press releases: RSS where the
              office has a feed, otherwise the newsroom page's headlines.
              Pages that block scripts or need JavaScript are listed as
              OPEN IN BROWSER for the job to check by hand.
  LEGISLATION state bills about the program with an action in the window,
              all 50 states, from LegiScan. Needs a free API key in
              LEGISCAN_API_KEY; without one the section says SKIPPED. Capped
              at LEGISCAN_MAX_REQUESTS per run (one search per state).

Google News only hands out redirect links, so `resolve` asks Google for the
article address behind each one. Standard library only. The numbered list
is cached in the system temp folder between the two commands.
"""
import datetime
import difflib
import email.utils
import html
import json
import os
import re
import sys
import tempfile
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(tempfile.gettempdir(), 'ss-gnews-items.json')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'}
TERMS = ('("Education Freedom Tax Credit" OR "federal scholarship tax credit" OR '
         '"scholarship tax credit" OR "tax credit scholarship" OR '
         '"school choice tax credit" OR "Education Choice for Children Act" OR '
         '"private school tax credit")')
# No "25F" in news queries: India's Industrial Disputes Act has a Section 25F
# whose court rulings flood the results, and quoting "Section 25F" breaks the
# query. Coverage that calls the program a "voucher" misses TERMS, hence the
# second state query. Coverage also names the program by the law that
# created it: the "Education Choice for Children Act" or the "Big Beautiful
# Bill".
VOUCHER = ('("school voucher" OR "voucher program" OR "private school voucher" OR '
           '"school choice program") (federal OR Trump OR Treasury OR IRS OR '
           '"Big Beautiful Bill")')
OFFICE = ('(spokesperson OR spokeswoman OR spokesman OR "press secretary" OR '
          '"governor\'s office") ("tax credit" OR voucher OR "school choice")')
MIN_DAYS = 7
MAX_DAYS = 30
DAYS = MIN_DAYS  # set by run() from the last finished run
# Kept in .git so it stays with the checkout the job runs in and is never
# committed or published.
LAST_RUN = os.path.join(ROOT, '.git', 'state-job-last-run.txt')
# Google News RSS returns at most this many items per search.
FEED_CAP = 100
# LegiScan's free plan allows 10,000 requests a month. One run makes one
# getSearch per state (50), about 450 a month at two runs a week. The cap
# stops a bug or a loop from ever using more than this in a run.
LEGISCAN_MAX_REQUESTS = 60
# Headlines in a governor's newsroom or a bill title that concern the program.
TOPIC = re.compile(r'scholarship|school choice|voucher|education freedom|private school|'
                   r'25F|nonpublic', re.I)

# Governor newsrooms, checked 2026-10-02. ('rss', url) or ('page', url).
# 'browser' marks pages that block scripts or render with JavaScript.
NEWSROOMS = {
    'AZ': ('page', 'https://azgovernor.gov/news-releases'),
    'CA': ('rss', 'https://www.gov.ca.gov/feed/'),
    'CT': ('page', 'https://portal.ct.gov/governor/news/press-releases'),
    'DE': ('rss', 'https://news.delaware.gov/category/governor/governor-matt-meyer/feed/'),
    'HI': ('rss', 'https://governor.hawaii.gov/category/newsroom/office-of-the-governor-press-releases/feed/'),
    'IL': ('browser', 'https://gov.illinois.gov/newsroom/all-news.html'),
    'MA': ('browser', 'https://www.mass.gov/orgs/governor-maura-healey-and-lt-governor-kim-driscoll/news'),
    'MD': ('page', 'https://governor.maryland.gov/news/press-releases'),
    'ME': ('page', 'https://www.maine.gov/governor/mills/newsroom'),
    'MI': ('browser', 'https://www.michigan.gov/whitmer/news/press-releases'),
    'MN': ('browser', 'https://mn.gov/governor/newsroom/press-releases/'),
    'NJ': ('page', 'https://www.nj.gov/governor/news/2026/approved/news_archive.shtml'),
    'NM': ('page', 'https://www.governor.state.nm.us/press-releases/'),
    'NY': ('browser', 'https://www.governor.ny.gov/news'),
    'OR': ('page', 'https://apps.oregon.gov/oregon-newsroom/OR/GOV/Posts'),
    'PA': ('browser', 'https://www.pa.gov/governor/newsroom'),
    'RI': ('rss', 'https://governor.ri.gov/press-releases.xml'),
    'VT': ('rss', 'https://governor.vermont.gov/taxonomy/term/3/feed'),
    # WA's RSS feed (governor.wa.gov/rss/news.xml) stopped in January 2025.
    'WA': ('page', 'https://governor.wa.gov/news/news-releases'),
    'WI': ('browser', 'https://evers.wi.gov/Pages/Newsroom/Press-Releases.aspx'),
}

# How to read each browser-only newsroom, learned 2026-10-02.
BROWSER_TIPS = {
    'IL': 'The page holds the whole archive. Items read "Title / Press Release - '
          'Weekday, Month DD, YYYY"; the newest are at the top.',
    'MI': 'Each headline is followed by its date on the next line ("October 01, 2026", '
          'zero-padded).',
    'NY': 'Ignore the featured cards at the top. Scroll to the "All News" list below them: '
          'items read "Title / Mon D, YYYY | time". It runs about 45 items a week, and '
          'many are titled only "Statement from Governor Kathy Hochul" or are rush '
          'transcripts of press Q&As, so headlines are not enough. In the browser, fetch '
          '/news?page=0, 1, 2... until the dates pass the window, then search the full '
          'text of every item for the program (scholarship tax credit, education freedom, '
          'school choice, voucher, private school), skipping housing "Section 8 vouchers".',
    'PA': 'The list loads only through the search box below the header (it shows grey '
          'placeholders otherwise). Search "tax credit scholarship", then "school choice"; '
          'results are newest first, so check whether any falls in the window. Scroll to '
          'the results: they only draw when on screen.',
    'WI': 'Headlines read "Title — Month D, YYYY", newest first.',
}


def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')


def all_states():
    """(code, name, governor, status) for all 50 states, not opted in first, read from the data file."""
    src = open(os.path.join(ROOT, 'state-status-data.js'), encoding='utf-8').read()
    names = dict(re.findall(r'\b([A-Z]{2}): \'([^\']+)\'', src))
    out = []
    for code, body in re.findall(r'^    "([A-Z]{2})": \{(.*?)^    \}', src, re.S | re.M):
        status = re.search(r'"status": "([^"]+)"', body).group(1)
        gov = re.search(r'"currentGovernor": "([^"]+)"', body)
        out.append((code, names[code], gov.group(1) if gov else '', status))
    return sorted(out, key=lambda s: (s[3] == 'opted-in', s[1]))


def not_opted_in():
    return [s for s in all_states() if s[3] != 'opted-in']


def window():
    """(days, why): back to the last finished run, within MIN_DAYS..MAX_DAYS."""
    try:
        last = datetime.date.fromisoformat(open(LAST_RUN, encoding='utf-8').read().strip())
    except (OSError, ValueError):
        return MIN_DAYS, 'no finished run on record'
    days = (datetime.date.today() - last).days + 1
    why = f'last finished run {last.isoformat()}'
    if days > MAX_DAYS:
        return MAX_DAYS, why + f', capped at {MAX_DAYS} days: cover the gap before it by hand'
    return max(MIN_DAYS, days), why


def done():
    with open(LAST_RUN, 'w', encoding='utf-8') as f:
        f.write(datetime.date.today().isoformat())
    print(f'Recorded a finished run on {datetime.date.today().isoformat()}. The next window starts here.')


def cutoff():
    return datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=DAYS)


# ---- News ------------------------------------------------------------------

def feed(query):
    url = ('https://news.google.com/rss/search?q=' + urllib.parse.quote_plus(query)
           + '&hl=en-US&gl=US&ceid=US:en')
    items = []
    raw = re.findall(r'<item>.*?</item>', get(url), re.S)
    if len(raw) >= FEED_CAP:
        items.append({'capped': True})
    for it in raw:
        date = email.utils.parsedate_to_datetime(re.search(r'<pubDate>(.*?)</pubDate>', it).group(1))
        if date < cutoff():
            continue
        source = re.search(r'<source url="([^"]*)">(.*?)</source>', it)
        outlet = html.unescape(source.group(2)) if source else ''
        title = html.unescape(re.search(r'<title>(.*?)</title>', it).group(1))
        if outlet and title.endswith(' - ' + outlet):
            title = title[:-len(outlet) - 3]
        items.append({'date': date.strftime('%Y-%m-%d'), 'title': title, 'outlet': outlet,
                      'link': re.search(r'<link>(.*?)</link>', it).group(1)})
    return items


def norm(title):
    t = re.sub(r'[^a-z0-9 ]', '', title.lower())
    return re.sub(r'\b(on|the|a|an)\b', ' ', re.sub(r'\s+', ' ', t)).split()


def same_story(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio() > 0.85


def news(numbered):
    groups = [('NATIONAL', [f'{TERMS} when:{DAYS}d'])]
    for code, name, gov, status in all_states():
        last = gov.split()[-1] if gov else ''
        who = f'"{name}" OR "{last}"' if last else f'"{name}"'
        qs = [f'({who}) {TERMS} when:{DAYS}d']
        # The wider searches are about governors who haven't decided; for an
        # opted-in state they mostly add noise about its own state programs.
        if status != 'opted-in':
            qs.append(f'({who}) {VOUCHER} when:{DAYS}d')
            if last:
                qs.append(f'"{last}" {OFFICE} when:{DAYS}d')
        groups.append((f'{name} [{status}, {gov or "governor unknown"}]', qs))

    print('\n######## NEWS (each number is a distinct story; copies listed under it)')
    for label, queries in groups:
        found, failed, capped = [], [], False
        for q in queries:
            try:
                got = feed(q)
            except Exception as e:
                failed.append(str(e))
            else:
                capped = capped or any(i.get('capped') for i in got)
                found += [i for i in got if not i.get('capped')]
            time.sleep(0.5)
        if failed and not found:
            print(f'\n== {label}: FEED FAILED ({failed[0]})')
            continue
        stories = []          # this group's distinct stories
        for it in sorted(found, key=lambda i: i['date'], reverse=True):
            key = norm(it['title'])
            match = next((s for s in stories if same_story(s['key'], key)), None)
            if match:
                if all(c['link'] != it['link'] for c in match['copies']):
                    match['copies'].append(it)
                continue
            stories.append({'key': key, 'copies': [it]})
        print(f'\n== {label}: {len(stories)} stories'
              + (f' (a search failed: {failed[0]})' if failed else '')
              + (f' (a search hit Google\'s {FEED_CAP}-item limit, so some stories are '
                 'missing: cover this group with web searches too)' if capped else ''))
        for s in stories:
            first = s['copies'][0]
            seen = next((n for n, prev in enumerate(numbered, 1) if same_story(prev['key'], s['key'])), None)
            if seen:
                print(f'  = see [{seen}] {first["title"]}')
                continue
            numbered.append({'key': s['key'], 'copies': s['copies']})
            print(f'  [{len(numbered)}] {first["date"]} | {first["title"]} - {first["outlet"]}')
            if len(s['copies']) > 1:
                others = ', '.join(c['outlet'] for c in s['copies'][1:6])
                more = len(s['copies']) - 6
                print(f'        also: {others}' + (f' (+{more})' if more > 0 else ''))


# ---- Governor newsrooms ----------------------------------------------------

def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def newsroom(code, kind, url):
    if kind == 'browser':
        tip = BROWSER_TIPS.get(code)
        return (f'OPEN IN BROWSER (blocks scripts or needs JavaScript): {url}'
                + (f'\n     HOW: {tip}' if tip else ''))
    page = get(url)
    if kind == 'rss':
        recent, hits = 0, []
        for it in re.findall(r'<item>.*?</item>', page, re.S):
            d = re.search(r'<pubDate>(.*?)</pubDate>', it)
            if not d or email.utils.parsedate_to_datetime(d.group(1)) < cutoff():
                continue
            recent += 1
            title = text(re.search(r'<title>(.*?)</title>', it, re.S).group(1))
            body = text(re.search(r'<description>(.*?)</description>', it, re.S).group(1)) if '<description>' in it else ''
            if TOPIC.search(title + ' ' + body):
                link = re.search(r'<link>(.*?)</link>', it, re.S)
                hits.append(f'{title} | {link.group(1).strip() if link else url}')
        if not recent:
            return f'feed read, but no releases in the past {DAYS} days. Check the feed still updates: {url}'
        return f'{recent} releases in the past {DAYS} days' + ''.join(f'\n     MATCH: {h}' for h in hits)
    # A newsroom page: scan its headlines. Dates on these pages are not
    # reliable to parse, so every matching headline is shown.
    heads = []
    for href, label in re.findall(r'<a[^>]+href="([^"#]+)"[^>]*>(.*?)</a>', page, re.I | re.S):
        t = text(label)
        if len(t) > 30 and TOPIC.search(t):
            heads.append(f'{t[:120]} | {urllib.parse.urljoin(url, href)}')
    dates = re.findall(r'(?:January|February|March|April|May|June|July|August|September|October|'
                       r'November|December) \d{1,2}, 20\d\d|\b\d{1,2}/\d{1,2}/20\d\d\b|20\d\d-\d\d-\d\d', page)
    status = f'page read ({len(dates)} dates on it)' if dates else 'page read, but NO DATES FOUND: open it in a browser'
    return status + ''.join(f'\n     MATCH: {h}' for h in dict.fromkeys(heads))


def newsrooms():
    print(f'\n######## GOVERNOR NEWSROOMS (headlines about the program; past {DAYS} days where dated)')
    for code, name, gov, status in not_opted_in():
        kind, url = NEWSROOMS.get(code, ('missing', ''))
        if kind == 'missing':
            print(f'\n== {name}: NO NEWSROOM CONFIGURED: add one to NEWSROOMS in scripts/gnews.py')
            continue
        try:
            result = newsroom(code, kind, url)
        except Exception as e:
            result = f'FAILED ({e}): open in browser: {url}'
        print(f'\n== {name} ({gov}): {result}')


# ---- Legislation -----------------------------------------------------------

def legislation():
    print(f'\n######## LEGISLATION (bills about the program with an action in the past {DAYS} days)')
    key = os.environ.get('LEGISCAN_API_KEY', '')
    if not key:
        print('SKIPPED: no LEGISCAN_API_KEY. Get a free key at https://legiscan.com/legiscan '
              'and set it as a user environment variable.')
        return
    since = (datetime.date.today() - datetime.timedelta(days=DAYS)).isoformat()
    query = ('"scholarship tax credit" OR "tax credit scholarship" OR "education freedom" '
             'OR "scholarship granting organization"')
    used = 0
    for code, name, gov, status in all_states():
        if used >= LEGISCAN_MAX_REQUESTS:
            print(f'\nSTOPPED at {used} requests (LEGISCAN_MAX_REQUESTS); remaining states not searched.')
            return
        used += 1
        url = ('https://api.legiscan.com/?' + urllib.parse.urlencode(
            {'key': key, 'op': 'getSearch', 'state': code, 'query': query, 'year': 2}))
        try:
            res = json.loads(get(url)).get('searchresult', {})
        except Exception as e:
            print(f'\n== {name}: FAILED ({e})')
            continue
        bills = [b for k, b in res.items() if k != 'summary' and b.get('last_action_date', '') >= since]
        if not bills:
            continue
        print(f'\n== {name} [{status}]: {len(bills)}')
        for b in bills:
            print(f'     {b["bill_number"]} | {b["last_action_date"]} {b["last_action"]} | '
                  f'{b["title"][:120]} | {b["url"]}')
        time.sleep(0.3)
    print(f'\n{used} LegiScan requests; states not listed had no matching bill action.')


# ---- Entry points ----------------------------------------------------------

def run(days=None):
    global DAYS
    DAYS, why = (days, 'set with --days') if days else window()
    print(f'WINDOW: past {DAYS} days ({why})')
    numbered = []
    news(numbered)
    json.dump([{'copies': n['copies']} for n in numbered], open(CACHE, 'w', encoding='utf-8'))
    newsrooms()
    legislation()
    print(f'\n{len(numbered)} distinct stories. Get article URLs with: python scripts/gnews.py resolve <numbers>')


def resolve_link(link):
    aid = link.split('/articles/')[1].split('?')[0]
    page = get('https://news.google.com/rss/articles/' + aid)
    sig = re.search(r'data-n-a-sg="([^"]+)"', page).group(1)
    ts = re.search(r'data-n-a-ts="([^"]+)"', page).group(1)
    payload = [[['Fbv4je', json.dumps(['garturlreq', [
        ['X', 'X', ['X', 'X'], None, None, 1, 1, 'US:en', None, 1, None, None, None, None, None, 0, 1],
        'X', 'X', 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0], aid, int(ts), sig]), None, 'generic']]]
    resp = get('https://news.google.com/_/DotsSplashUi/data/batchexecute',
               data=urllib.parse.urlencode({'f.req': json.dumps(payload)}).encode(),
               headers={'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'})
    return json.loads(json.loads(resp.split('\n\n')[1])[0][2])[1]


def resolve(numbers):
    items = json.load(open(CACHE, encoding='utf-8'))
    for n in numbers:
        num, _, copy = n.partition(':')
        copies = items[int(num) - 1]['copies']
        it = copies[int(copy) - 1 if copy else 0]
        try:
            url = resolve_link(it['link'])
        except Exception as e:
            url = f'COULD NOT RESOLVE ({e}); search the outlet\'s site for the title'
        print(f'[{n}] {it["date"]} | {it["title"]} - {it["outlet"]}\n     {url}')
        if not copy and len(copies) > 1:
            print(f'     other copies: ' + ', '.join(f'{num}:{i} {c["outlet"]}' for i, c in enumerate(copies[1:], 2)))


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if sys.argv[1:2] == ['resolve']:
        resolve(sys.argv[2:])
    elif sys.argv[1:2] == ['done']:
        done()
    elif sys.argv[1:2] == ['--days']:
        run(int(sys.argv[2]))
    else:
        run()
