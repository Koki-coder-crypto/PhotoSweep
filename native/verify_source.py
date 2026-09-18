"""Fast checks available on Windows before cloud/native execution."""
import json, plistlib, re
from pathlib import Path
root = Path(__file__).resolve().parent
catalog = json.loads((root/'localization.json').read_text(encoding='utf-8'))
errors = []
for file in (root/'PhotoSweep').rglob('*.swift'):
    source = file.read_text(encoding='utf-8-sig')
    for key in re.findall(r'L\("([^"\\]+)"\)', source):
        if key not in catalog:
            errors.append(f'{file.name}: missing localization {key}')
    if 'import ExpoModulesCore' in source or 'import React' in source:
        errors.append(f'{file}: legacy runtime in native source')
for key, texts in catalog.items():
    if len(texts) != 2 or any(not text for text in texts): errors.append(f'{key}: incomplete translation')
    if sorted(re.findall(r'%(?:@|d|f)', texts[0])) != sorted(re.findall(r'%(?:@|d|f)', texts[1])):
        errors.append(f'{key}: format arguments differ')
for file in (root/'PhotoSweep').rglob('*.plist'):
    with file.open('rb') as stream: plistlib.load(stream)
with (root/'PhotoSweep/Resources/PrivacyInfo.xcprivacy').open('rb') as stream: plistlib.load(stream)
icon = root/'PhotoSweep/Resources/Assets.xcassets/AppIcon.appiconset/icon.png'
assert icon.read_bytes() == (root.parent/'assets/icon.png').read_bytes(), '05A icon must match approved asset'
assert not errors, '\n'.join(errors)
print(f'PASS: {len(catalog)} bilingual keys, format arguments, property lists, 05A icon and native runtime imports.')
