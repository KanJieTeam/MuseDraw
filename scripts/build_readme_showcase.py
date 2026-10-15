"""Build the README's 1920x1080 photo collage (maintainers: Pillow==12.3.0)."""
import hashlib
import json
from pathlib import Path

FEATURED = ["05-mvp-whiteboard", "06-kafka-riso", "38-good-lesson-chalkboard",
            "03-gitops-terminal", "08-ai-agent-aurora", "17-onboarding-90-pastel",
            "20-customer-journey-terracotta", "42-gtd-whiteboard", "41-run-of-show-swiss"]
CASES = FEATURED + ["01-rag-editorial", "02-kubernetes-blueprint", "04-card-payment-swiss",
                   "07-observability-observatory", "09-microservices-bauhaus",
                   "10-postgres-failover-newsprint", "11-data-exchange-ink-wash",
                   "12-saas-tenancy-product", "13-food-delivery-c4", "14-game-backend-neon",
                   "16-okr-tree-enterprise", "19-product-roadmap-product",
                   "39-curriculum-map-metro", "56-prisma-journal", "62-crispr-workflow-journal"]


def build_showcase(root):
    from PIL import Image, ImageDraw, ImageFilter
    root = Path(root).resolve()
    # Positions are deliberately independent of rows and columns. Background
    # cards run beyond the frame and foreground cards overlap their neighbours,
    # like photographs scattered on a desk. Gallery originals stay untouched.
    # (case index, left, top, width, rotation); later cards are on top.
    placements = [(9, 1320, 1360, 660, 8), (10, -160, -70, 660, 8),
                  (11, 2760, -80, 620, -15), (12, 2190, 40, 650, -9),
                  (13, 120, 1330, 620, -11), (14, 2070, 1510, 660, 10),
                  (15, 2580, 80, 650, 15), (16, 520, 430, 620, 12),
                  (17, -150, 330, 660, -12), (18, 1840, 480, 640, 13),
                  (19, 10, 1110, 620, -8), (20, 1230, 110, 670, 12),
                  (21, 2680, 1480, 640, 11), (22, 490, -120, 630, -6),
                  (23, 2260, 970, 610, 9),
                  (0, 190, 120, 740, -13), (1, 1760, 10, 670, 9),
                  (2, 900, -40, 680, -8), (3, -20, 690, 800, 6),
                  (5, 2280, 630, 730, 12), (6, 1690, 1080, 730, -12),
                  (7, 620, 1280, 640, 13), (8, 2500, 1140, 640, -7),
                  (4, 1040, 590, 800, -10)]
    assert sorted(item[0] for item in placements) == list(range(len(CASES)))
    canvas = Image.new("RGB", (3200, 1800), "#11141d")
    glow = Image.new("RGB", canvas.size, "#11141d")
    light = ImageDraw.Draw(glow)
    light.ellipse((-400, -900, 2200, 1500), fill="#383150")
    light.ellipse((1800, 800, 3600, 2600), fill="#163c3d")
    canvas = Image.blend(canvas, glow.filter(ImageFilter.GaussianBlur(200)), 0.6).convert("RGBA")
    records = []
    for index, x, y, width, angle in placements:
        source = root / "gallery" / CASES[index] / "preview.jpg"
        with Image.open(source) as original:
            height = round(original.height * width / original.width)
            image = original.convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
        card = Image.new("RGBA", (width + 10, height + 10), "#d9dbe1")
        card.alpha_composite(image, (5, 5))
        card = card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
        shadow = Image.new("RGBA", (card.width + 60, card.height + 60))
        shadow.paste((0, 0, 0, 175), (30, 40), card.getchannel("A"))
        canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(13)), (x - 30, y - 24))
        canvas.alpha_composite(card, (x, y))
    for slug in CASES:
        source = root / "gallery" / slug / "preview.jpg"
        records.append({"slug": slug, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest()})
    canvas = canvas.resize((1920, 1080), Image.Resampling.LANCZOS)
    output = root / "assets/gallery/readme-showcase.jpg"
    canvas.convert("RGB").save(output, "JPEG", quality=84, optimize=True, progressive=True)
    manifest = {"width": canvas.width, "height": canvas.height, "layout": "scattered-overlap",
                "featured": FEATURED, "cases": records,
                "bytes": output.stat().st_size, "sha256": hashlib.sha256(output.read_bytes()).hexdigest()}
    (root / "assets/gallery/readme-showcase.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    result = build_showcase(Path(__file__).resolve().parents[1])
    print(json.dumps({"cases": len(result["cases"]), "bytes": result["bytes"], "size": [result["width"], result["height"]]}))
