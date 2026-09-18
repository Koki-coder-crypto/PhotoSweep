# PhotoSweep — Blue Broom

黄色の地に、青いほうきとコーラル色の留め具。小さな表示で識別できる一つのシルエットに絞り、丸みと控えめな立体感でポップさを表す。文字・星・写真カードは重ねない。

2026-09-18、組み込み image_gen で生成。`photosweep-broom.png` は生成原本（1254×1254、RGB、不透明）。`node tools/render-assets.mjs` で Expo の画像処理を使って1024pxのアプリアイコンと512pxの起動画面用素材を生成する。iOS用原稿に角丸は焼き込まない。

ホーム・導入・読込中は共通の BrandMark を使用。既存 `assets/icon.svg` は旧版の原稿であり、生成元には使用しない。

## Final prompt

```text
Use case: logo-brand. Asset type: final production iOS app icon for PhotoSweep, a premium Japanese photo and video cleanup app. Create ONE complete square 1024x1024 icon, edge-to-edge fully opaque, no rounded outer corners (iOS applies its own mask), no border, no mockup or phone. Primary request: an extremely simple, memorable BROOM symbol with the exuberant, tactile, playful energy associated with Zenly's visual world, but an original PhotoSweep identity. A single chunky broom leans diagonally from lower-left to upper-right, centered optically, occupying roughly 70 percent of the canvas with generous safe margins. Silhouette reads immediately at 48 pixels. Thick rounded handle and a wide short soft fan-shaped bristle head; only two broad inset bristle divisions, no fine hairs or realism. Saturated electric ultramarine blue broom, one small coral-pink collar where handle meets head, against a flat vibrant warm butter-yellow background. Sculptural matte soft-vinyl form with restrained rounded bevels and a single subtle contact shadow, almost like a beautifully crafted inflated graphic logo. Bold and delightful, not busy, not a household cleaning photograph. Straight-on camera, simple geometry, pristine edges. No text, no letters, no numbers, no sparkle stars, no particles, no gradients in the background, no extra objects, no face, no checkmarks, no existing brand logo. The blue broom is the sole iconic focal point. Deliver the actual final app icon artwork, not a presentation sheet.
```
