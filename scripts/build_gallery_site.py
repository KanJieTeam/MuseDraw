"""Create a Pages artifact containing only the public gallery and brand assets."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
destination = root / "output" / "site"
destination.mkdir(parents=True, exist_ok=True)
shutil.copytree(root / "docs" / "gallery", destination / "docs" / "gallery", dirs_exist_ok=True)
shutil.copytree(root / "assets" / "brand", destination / "assets" / "brand", dirs_exist_ok=True)
(destination / "index.html").write_text(
    '<!doctype html><html lang="zh-CN"><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    '<meta http-equiv="refresh" content="0;url=docs/gallery/">'
    '<title>MuseDraw 图集</title><a href="docs/gallery/">打开 MuseDraw 图集</a></html>\n',
    encoding="utf-8",
)
(destination / ".nojekyll").touch()
print("Public gallery artifact ready: output/site")
