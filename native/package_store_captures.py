"""Package real XCTest screenshots; never replace app text, values or media.

Requires Pillow. Run only on visually inspected captures from the candidate's
app sources. Outputs remain local artifacts until separately reviewed/uploaded.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

COPY = {
    '01-organize': ('写真も動画も。\n見てから、整理。', 'Review your photos.\nKeep what matters.'),
    '02-comparison': ('同じ写真を見比べて。\n残す一枚を選ぼう。', 'Compare duplicates.\nChoose what stays.'),
    '03-monthly-swipe': ('月を選んで、\nすいすい整理。', 'Pick a month.\nSwipe to sort.'),
    '04-large-videos': ('大きい動画から、\n見直そう。', 'Start with\nyour largest videos.'),
    '05-compression': ('残したい動画を、\n小さなコピーに。', 'Keep the video.\nMake a smaller copy.'),
    '06-candidates': ('消す前に、\nもう一度確認。', 'One last look\nbefore you delete.'),
    '07-result': ('整理した結果が、\nひと目でわかる。', 'See what\nyou cleared.'),
}


def package(source, output, font_path, revision):
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    captures = {}
    for test in manifest:
        for item in test['attachments']:
            match = re.match(r'^(ja|en)-(0[1-7]-[a-z-]+|review-monthly|review-lifetime)_', item['suggestedHumanReadableName'])
            if match:
                key = tuple(match.groups())
                if key in captures:
                    raise ValueError(f'Duplicate capture: {key}; choose one verified test run')
                captures[key] = source / item['exportedFileName']
    expected = {(lang, name) for lang in ('ja', 'en') for name in [*COPY, 'review-monthly', 'review-lifetime']}
    missing = expected - captures.keys()
    if missing:
        raise ValueError(f'Incomplete capture set: {sorted(missing)}')
    output.mkdir(parents=True, exist_ok=True)
    title_font = ImageFont.truetype(str(font_path), 80)
    small_font = ImageFont.truetype(str(font_path), 32)
    evidence = {'appSourceRevision': revision, 'screenshots': []}
    for (lang, name), path in sorted(captures.items()):
        with Image.open(path) as raw:
            if raw.size not in ((1320, 2868), (1290, 2796)):
                raise ValueError(f'Unexpected native screenshot dimensions: {path.name}: {raw.size}')
            screen = raw.convert('RGB')
        native_path = output / f'{lang}-{name}-original.png'
        screen.save(native_path)
        if name.startswith('review-'):
            target = native_path
        else:
            canvas = Image.new('RGB', (1290, 2796), '#F2F6FF')
            draw = ImageDraw.Draw(canvas)
            title = COPY[name][0 if lang == 'ja' else 1]
            draw.multiline_text((76, 62), title, font=title_font, fill='#102448', spacing=4)
            caption = ('Pro・対応するSDR動画' if lang == 'ja' else 'Pro • Supported SDR videos') if name == '05-compression' else 'PhotoSweep'
            draw.text((80, 278), caption, font=small_font, fill='#146EF5')
            screen.thumbnail((1110, 2360), Image.Resampling.LANCZOS)
            x = (1290 - screen.width) // 2
            draw.rounded_rectangle((x - 7, 363, x + screen.width + 7, 377 + screen.height), radius=32, fill='#C8D7EC')
            canvas.paste(screen, (x, 370))
            target = output / f'{lang}-{name}.png'
            canvas.save(target, optimize=True)
        evidence['screenshots'].append({'locale': lang, 'screen': name, 'sourceSHA256': hashlib.sha256(path.read_bytes()).hexdigest(), 'output': target.name})
    (output / 'capture-provenance.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--font', type=Path, required=True)
    parser.add_argument('--revision', required=True)
    args = parser.parse_args()
    package(args.source, args.output, args.font, args.revision)
