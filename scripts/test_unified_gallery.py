"""The author artwork belongs in the existing gallery and its existing controls."""
import json
from pathlib import Path
import unittest
from gallery_catalog import gallery_catalog, gallery_prompts, gallery_source

ROOT=Path(__file__).resolve().parents[1]


class UnifiedGalleryTests(unittest.TestCase):
    def test_all_author_cases_join_original_gallery_with_distinct_share_ids(self):
        source=json.loads((ROOT/'gallery/collections/visual-cases/catalog.json').read_text(encoding='utf-8'))
        original=json.loads((ROOT/'gallery/catalog.json').read_text(encoding='utf-8'))
        merged=gallery_catalog(ROOT)['items']
        self.assertEqual(len(merged),len(source['items'])+len(original['items']))
        self.assertEqual(len({i['slug'] for i in merged}),300)
        self.assertEqual(sum(sum(counts.values()) for counts in gallery_catalog(ROOT)['summary'].values()),300)
        self.assertEqual(merged[180:],original['items'])
        for item,author in zip(merged[:180],source['items']):
            self.assertEqual(item['title'],author['title'])
            self.assertEqual(item['theme'],author['theme'])
            self.assertTrue((gallery_source(ROOT,item)/'scene.json').is_file())
            self.assertEqual(gallery_prompts(ROOT)['items'][item['slug']]['zh'],author['brief'])
            self.assertEqual(item['repoPath'],'gallery/'+item['path'])

    def test_original_page_owns_browsing_and_old_page_redirects(self):
        html=(ROOT/'assets/gallery/index.html').read_text(encoding='utf-8')
        self.assertNotIn('href="collections/visual-cases/"',html)
        for category in ['poster','data','research','office','teaching','engineering']:
            self.assertIn(f'data-category="{category}"',html)
        old=(ROOT/'gallery/collections/visual-cases/index.html').read_text(encoding='utf-8')
        self.assertIn('content="0;url=../../"',old)
        self.assertNotIn('<script',old)


if __name__=='__main__':unittest.main()
