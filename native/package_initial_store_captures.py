"""Initial submission: two inspected real screens per locale, not synthetic UI.

The full seven-screen capture suite remains separate and is not marked passed.
"""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SCREENS = {
    '01-organize': ('写真も動画も。\n見てから、整理。', 'Your photos and videos.\nReady to organize.'),
    'review-monthly': ('もっと整理したいなら。\nPhotoSweep Pro', 'Ready for more?\nPhotoSweep Pro'),
}

def main(source, output, font):
    manifest = json.loads((source / 'store-captures-manifest.json').read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=True)
    records = []
    for lang in ('ja', 'en'):
        for position, (name, copy) in enumerate(SCREENS.items(), 1):
            matches = [a for t in manifest for a in t['attachments']
                       if a['suggestedHumanReadableName'].startswith(f'{lang}-{name}_')]
            if len(matches) != 1:
                raise ValueError(f'Exactly one real capture required for {lang}/{name}')
            path = source / matches[0]['exportedFileName']
            with Image.open(path) as original:
                if original.size != (1320, 2868):
                    raise ValueError(f'Unexpected native size: {original.size}')
                screen = original.convert('RGB')
            canvas = Image.new('RGB', (1284, 2778), '#F2F6FF')
            draw = ImageDraw.Draw(canvas)
            title = copy[0 if lang == 'ja' else 1]
            heading = ImageFont.truetype(str(font), 76)
            if draw.multiline_textbbox((0, 0), title, font=heading)[2] > 1130:
                heading = ImageFont.truetype(str(font), 66)
            draw.multiline_text((76, 60), title, font=heading, fill='#102448', spacing=8)
            caption = ('月額・買い切りから選べます' if lang == 'ja' else 'Monthly or lifetime access') if name == 'review-monthly' else 'PhotoSweep'
            draw.text((80, 272), caption, font=ImageFont.truetype(str(font), 30), fill='#146EF5')
            screen.thumbnail((1100, 2340), Image.Resampling.LANCZOS)
            x = (1284 - screen.width) // 2
            draw.rounded_rectangle((x-6, 354, x+screen.width+6, 366+screen.height), radius=28, fill='#C8D7EC')
            canvas.paste(screen, (x, 360))
            target = output / f'{lang}-{position:02d}-{name}.png'
            canvas.save(target, optimize=True)
            records.append({'locale':lang,'file':target.name,'source':path.name,
                            'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    (output / 'provenance.json').write_text(json.dumps({
        'captureRun':35611307866,'appSourceRevision':'8e25d2060f96c9af822b84671bea2a6722ac286f',
        'build':'20010','scope':'Initial four images only; full capture flow NOT passed',
        'screens':records},ensure_ascii=False,indent=2),encoding='utf-8')

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source',type=Path);p.add_argument('output',type=Path)
    p.add_argument('--font',type=Path,required=True)
    args=p.parse_args();main(args.source,args.output,args.font)
