"""News check for the scheduled state-table job (scripts/state-updates-prompt.md).

  python scripts/gnews.py              national feed + one feed per state not
                                       opted in, past 7 days, numbered
  python scripts/gnews.py resolve 3 12 real article URLs for those numbers

Google News only hands out redirect links, so `resolve` asks Google for the
article address behind each one. Standard library only. The numbered list
is cached in the system temp folder between the two commands.
"""
import datetime
import email.utils
import html
import json
import os
import re
import sys
import tempfile
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(tempfile.gettempdir(), 'ss-gnews-items.json')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/129.0 Safari/537.36'}
TERMS = ('("Education Freedom Tax Credit" OR "federal scholarship tax credit" OR '
         '"scholarship tax credit" OR "tax credit scholarship" OR '
         '"school choice tax credit")')
# No "25F": India's Industrial Disputes Act has a Section 25F whose court
# rulings flood the results, and quoting "Section 25F" breaks the query.
DAYS = 7


def get(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
    return urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'ignore')


def states_to_search():
    """(name, governor, status) for every state not opted in, read from the data file."""
    src = open(os.path.join(ROOT, 'state-status-data.js'), encoding='utf-8').read()
    names = dict(re.findall(r'\b([A-Z]{2}): \'([^\']+)\'', src))
    out = []
    for code, body in re.findall(r'^    "([A-Z]{2})": \{(.*?)^    \}', src, re.S | re.M):
        status = re.search(r'"status": "([^"]+)"', body).group(1)
        gov = re.search(r'"currentGovernor": "([^"]+)"', body)
        if status != 'opted-in':
            out.append((names[code], gov.group(1) if gov else '', status))
    return out


def feed(query):
    url = ('https://news.google.com/rss/search?q=' + urllib.parse.quote_plus(query)
           + '&hl=en-US&gl=US&ceid=US:en')
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=DAYS)
    items = []
    for it in re.findall(r'<item>.*?</item>', get(url), re.S):
        date = email.utils.parsedate_to_datetime(re.search(r'<pubDate>(.*?)</pubDate>', it).group(1))
        if date < cutoff:
            continue
        source = re.search(r'<source url="([^"]*)">(.*?)</source>', it)
        items.append({
            'date': date.strftime('%Y-%m-%d'),
            'title': html.unescape(re.search(r'<title>(.*?)</title>', it).group(1)),
            'outlet': html.unescape(source.group(2)) if source else '',
            'link': re.search(r'<link>(.*?)</link>', it).group(1),
        })
    return sorted(items, key=lambda i: i['date'], reverse=True)


def run():
    groups = [('NATIONAL', f'{TERMS} when:{DAYS}d')]
    for name, gov, status in states_to_search():
        who = f'"{name}" OR "{gov.split()[-1]}"' if gov else f'"{name}"'
        groups.append((f'{name} [{status}, {gov or "governor unknown"}]',
                       f'({who}) {TERMS} when:{DAYS}d'))
    numbered = []
    for label, query in groups:
        try:
            items = feed(query)
        except Exception as e:  # report and keep going; the prompt has a fallback
            print(f'\n== {label}: FEED FAILED ({e})')
            continue
        print(f'\n== {label}: {len(items)}')
        for it in items:
            numbered.append(it)
            print(f'  [{len(numbered)}] {it["date"]} | {it["title"]}')
    json.dump(numbered, open(CACHE, 'w', encoding='utf-8'))
    print(f'\n{len(numbered)} items. Get article URLs with: python scripts/gnews.py resolve <numbers>')


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
        it = items[int(n) - 1]
        try:
            url = resolve_link(it['link'])
        except Exception as e:
            url = f'COULD NOT RESOLVE ({e}); search the outlet\'s site for the title'
        print(f'[{n}] {it["date"]} | {it["title"]}\n     {url}')


if __name__ == '__main__':
    if sys.argv[1:2] == ['resolve']:
        resolve(sys.argv[2:])
    else:
        run()
