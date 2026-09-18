# PhotoSweep — Casual Sweep / 05A

採用: 2026-09-18。ユーザーが05Aを選択し、実装を依頼。

くすんだブルーの地にコーラルのほうき、クリームの持ち手。丸い3つの毛束と一つの弧で「払う」動きを表現。以前の黄色×青の版から置き換えた。

`photosweep-broom.png` は組み込み image_gen による05Aの生成原本。ピクセル編集せず保存。`node tools/render-assets.mjs` が Expo の画像処理で1024pxの `assets/icon.png` と512pxの `assets/splash-icon.png` に変換する。iOSの角丸は素材に焼き込まない。

ホーム、オンボーディング、読込画面は既存の共通 `BrandMark` から `assets/icon.png` を使用。Web favicon も同じ画像。アプリの配色や機能には変更なし。

元の探索案: `artifacts/icon-exploration/casual/05A.png`（Git/EAS送信対象外）。編集参照: `artifacts/icon-exploration/motion/05.png`。

## Final prompt (built-in edit mode)

```text
Use case: logo-brand. EDIT the supplied PhotoSweep concept 05 broom icon. Preserve the defining gesture: short handle rising upper-right at45 degrees, broad fan sweeping left with backward-curving bristles, and ONE curved sweep underneath. Refine it to be MORE CASUAL AND QUIETLY PLAYFUL, without loud colors or childish toy styling. Shorten and thicken the handle a little, round the tips and edges, reduce to exactly THREE broad bristle lobes with TWO spacious separations. Turn the metallic sharp underline into a friendly thick tapered curve. Strong compact silhouette, balanced negative space and optical alignment. Broad head and short handle approximately1.6:1 visual weight, not a drawn mathematical diagram. No sparkles, eyes, face, text, extra objects, confetti, blur or tiny details. Artwork occupies72% canvas with14%safe padding. Output one square full-bleed1024x1024 iOS icon; paint an OPAQUE SOLID BACKGROUND all the way to every corner (not cutout/transparency), no pre-rounded outer corners. The reference is composition guidance; change palette/material as requested. Matte softly rounded almost-flat 2.5D. Broom head muted warm coral #E98D78, handle and collar warm ivory #FFF2DE, swipe curve pale peach #F5C9AA. Full opaque background medium dusty denim blue #617994, neither deep navy nor bright cobalt. Very shallow relief, extremely restrained shadow. No glossy highlights, no metallic surface. Most balanced casual version.
```

