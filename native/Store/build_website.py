"""Build the bilingual static site. Missing formal contact details block publishing."""
import argparse, html, json, re, shutil
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--preview', action='store_true')
parser.add_argument('--output', type=Path, default=root.parent/'artifacts/native-site')
args = parser.parse_args()
config = json.loads((root/'ReleaseChecklist.json').read_text(encoding='utf-8'))
content = json.loads((root/'Store/website.json').read_text(encoding='utf-8'))
valid = bool(config['operatorName'] and re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', config['supportEmail']))
if not valid and not args.preview:
    raise SystemExit('Publishing blocked: provide the formal operator name and support email.')
out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
shutil.copyfile(root/'PhotoSweep/Resources/Assets.xcassets/AppIcon.appiconset/icon.png', out/'icon.png')
escape = html.escape
style = '''*{box-sizing:border-box}body{margin:0;background:#f7f9fd;color:#17243a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.8}a{color:#146af4;text-underline-offset:4px}a:focus-visible{outline:3px solid #f5625c;outline-offset:5px}header,main,footer{max-width:960px;margin:auto;padding:24px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap}nav{display:flex;gap:18px;flex-wrap:wrap}.brand{display:flex;align-items:center;gap:12px;font-weight:750;text-decoration:none;color:inherit}.brand img{width:46px;height:46px;border-radius:12px}.eyebrow{color:#146af4;font-size:14px;font-weight:700;letter-spacing:.12em}h1{font-size:clamp(32px,6vw,64px);line-height:1.24;letter-spacing:-.03em;max-width:790px;margin:20px 0 28px}h2{font-size:23px;line-height:1.4}section{padding:24px 28px;margin:20px 0;background:white;border:1px solid #e6ebf4;border-radius:22px}section p:last-child{margin-bottom:0}footer{font-size:14px;color:#52637a;padding-bottom:48px}.draft{background:#fff0d7;padding:12px;text-align:center;color:#573b0c}.contact{overflow-wrap:anywhere}@media(max-width:500px){header,main,footer{padding:18px}section{padding:20px}nav{gap:12px;font-size:14px}}@media(prefers-color-scheme:dark){body{background:#101722;color:#f0f4fb}section{background:#1a2535;border-color:#2b394c}footer{color:#bccadc}a,.eyebrow{color:#74aaff}}'''
for language, text in content.items():
    folder = out/language; folder.mkdir(exist_ok=True)
    other = 'en' if language == 'ja' else 'ja'
    for page, body in text['pages'].items():
        links = ''.join(f'<a href="{name}.html">{escape(label)}</a>' for name,label in text['nav'].items())
        sections = ''.join('<section><h2>'+escape(title)+'</h2>'+''.join('<p>'+escape(p)+'</p>' for p in paragraphs)+'</section>' for title, paragraphs in body['sections'])
        operator = config['operatorName'] or text['notReady']
        email = config['supportEmail']
        contact = f'<a href="mailto:{escape(email, quote=True)}">{escape(email)}</a>' if email else escape(text['notReady'])
        draft = '<div class="draft">'+escape(text['draft'])+'</div>' if args.preview else ''
        document = f'''<!doctype html><html lang="{language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="{escape(body['description'],quote=True)}"><title>{escape(body['title'])} · PhotoSweep</title>{'<meta name="robots" content="noindex">' if args.preview else ''}<style>{style}</style></head><body>{draft}<header><a class="brand" href="index.html"><img src="../icon.png" alt="" width="46" height="46">PhotoSweep</a><nav aria-label="{escape(text['navigation'])}">{links}<a href="../{other}/{page}.html" lang="{other}">{'English' if other=='en' else '日本語'}</a></nav></header><main><p class="eyebrow">PHOTOSWEEP · IPHONE</p><h1>{escape(body['title'])}</h1><p>{escape(body['description'])}</p>{sections}<section class="contact"><h2>{escape(text['contact'])}</h2><p>{escape(operator)}<br>{contact}</p></section></main><footer><nav>{links}</nav><p>PhotoSweep · iOS 16.4+</p></footer></body></html>'''
        (folder/(page+'.html')).write_text(document,encoding='utf-8')
(out/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PhotoSweep</title><h1>PhotoSweep</h1><p><a href="ja/index.html">日本語</a> · <a href="en/index.html">English</a></p></html>',encoding='utf-8')
print(f'Built {len(content)*4} localized pages in {out}. '+('PREVIEW ONLY; do not publish.' if args.preview else 'Formal contact fields validated.'))
