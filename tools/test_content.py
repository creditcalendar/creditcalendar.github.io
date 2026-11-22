"""Build temporary content to test publishing without adding sample public posts."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
fixture = ROOT / 'src/content/posts/migration-test-fixtures'
assert not fixture.exists(), f'Refusing to overwrite {fixture}'
fixture.mkdir()
try:
    for filename, title, date, draft in (
        ('published', 'Fixture public & searchable', '2020-01-01', False),
        ('draft', 'Fixture secret draft', '2020-01-01', True),
        ('future', 'Fixture future post', '2999-01-01', False),
    ):
        (fixture / f'{filename}.md').write_text(
            f'---\ntitle: "{title}"\ndescription: "Fixture description"\n'
            f'date: {date}\ndraft: {str(draft).lower()}\n'
            'tags: ["C++", "信用卡", "Points & Miles"]\ncategories: ["Guides"]\n---\n'
            '## A real Markdown heading\n\nUniqueBodySearchToken and **bold text**.\n'
        )
    with tempfile.TemporaryDirectory(prefix='credit-calendar-content-') as directory:
        subprocess.run(['npm', 'run', 'build', '--', '--outDir', directory], cwd=ROOT, check=True)
        output = Path(directory)
        article = output / 'posts/migration-test-fixtures/published/index.html'
        assert article.exists(), 'Published article missing'
        assert '<strong>bold text</strong>' in article.read_text(), 'Markdown did not render'
        for name in ('draft', 'future'):
            assert not (output / f'posts/migration-test-fixtures/{name}/index.html').exists()
        for route in ('feed', 'archives', 'search', 'tags/C++', 'tags/信用卡', 'tags/Points & Miles', 'categories/Guides'):
            text = (output / route / 'index.html').read_text()
            assert 'Fixture public' in text, f'Published entry missing from {route}'
            assert 'Fixture secret draft' not in text and 'Fixture future post' not in text, f'Unpublished content leaked to {route}'
        search = (output / 'search/index.html').read_text()
        assert 'UniqueBodySearchToken' in search, 'Full-text search body missing'
        items = ET.parse(output / 'feed.xml').findall('./channel/item')
        titles = [item.findtext('title') for item in items]
        assert 'Fixture public & searchable' in titles, 'RSS encoding or entry missing'
        assert 'Fixture secret draft' not in titles and 'Fixture future post' not in titles
    print('Passed: Markdown, RSS, archives, Unicode tags/categories, body search, draft/future exclusion.')
finally:
    shutil.rmtree(fixture)
