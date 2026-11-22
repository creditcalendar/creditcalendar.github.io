"""Check Astro output, local links, RSS entries, and the advertising declaration."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'dist'

class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.links, self.ids = [], set()
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.add(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.links.append(attrs[key])

pages = {p: Document(p.read_text()) for p in OUTPUT.rglob('*.html')}
assert pages, 'No build output. Run npm run build first.'
for route in ('index.html', '404.html', 'contact/index.html', 'developer/index.html',
              'about/index.html', 'feed/index.html', 'archives/index.html',
              'tags/index.html', 'categories/index.html', 'search/index.html'):
    assert (OUTPUT / route).is_file(), f'Missing route: {route}'
errors = []
for path, doc in pages.items():
    for link in doc.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = OUTPUT / unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path) if url.path else path
        if target.is_dir():
            target /= 'index.html'
        if not target.is_file():
            errors.append(f'{path.relative_to(OUTPUT)}: missing {link}')
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            errors.append(f'{path.relative_to(OUTPUT)}: missing anchor {link}')
feed = ET.parse(OUTPUT / 'feed.xml').getroot()
assert feed.tag == 'rss' and feed.find('channel') is not None, 'Expected RSS feed'
for item in feed.findall('./channel/item'):
    assert item.findtext('title') and item.findtext('link'), 'Incomplete RSS item'
    target = OUTPUT / unquote(urlsplit(item.findtext('link')).path).lstrip('/') / 'index.html'
    assert target.is_file(), f'RSS article does not exist: {target}'
assert (OUTPUT / 'app-ads.txt').read_bytes() == (ROOT / 'public/app-ads.txt').read_bytes(), 'app-ads.txt changed during build'
for private_path in ('package.json', 'Gemfile', '_config.yml', 'src', 'tools', 'tests'):
    assert not (OUTPUT / private_path).exists(), f'Development file published: {private_path}'
assert not errors, '\n'.join(errors)
print(f'Passed: {len(pages)} pages, local links/assets/anchors, RSS, and app-ads.txt.')
