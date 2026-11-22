"""Check published routes, local assets, anchors, and the ads file."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
from build import OUTPUT, ROOT

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
ET.parse(OUTPUT / 'feed.xml')
assert (OUTPUT / 'app-ads.txt').read_bytes() == (ROOT / 'app-ads.txt').read_bytes(), 'app-ads.txt changed during build'
assert not errors, '\n'.join(errors)
print(f'Passed: {len(pages)} pages, local links/assets/anchors, Atom XML, and exact app-ads.txt copy.')
