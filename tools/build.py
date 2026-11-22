"""Build the dependency-free site with an explicit list of public files."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / '_site'
PAGES = ('contact', 'developer', 'feed', 'about', 'archives', 'categories', 'tags')

def build():
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir()
    for name in ('index.html', '404.html', 'feed.xml', 'app-ads.txt', '.nojekyll'):
        shutil.copy2(ROOT / name, OUTPUT / name)
    for name in PAGES:
        shutil.copytree(ROOT / name, OUTPUT / name)
    for name in ('css', 'images', 'img/favicons'):
        shutil.copytree(ROOT / 'assets' / name, OUTPUT / 'assets' / name)
    print(f'Built {OUTPUT}')

if __name__ == '__main__':
    build()
