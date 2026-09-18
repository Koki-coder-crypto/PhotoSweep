"""One-time migration of inherited errors into the native bilingual catalog."""
import json, re, wave, math, struct
from pathlib import Path
root = Path(__file__).resolve().parent
source = root / 'PhotoSweep/Services/PhotoSweepCompression.swift'
text = source.read_text(encoding='utf-8-sig')
catalog = json.loads((root/'localization.json').read_text(encoding='utf-8'))
english = [
    'Cancelled. Your original is unchanged.',
    'The save result is unconfirmed. Check photo access and verify again.',
    'Check the result of the previous job first.',
    'Not enough working storage. Review unwanted videos first.',
    'Let your iPhone cool down, then try again.',
    'This video is not accessible.',
    'Slow motion, time-lapse and edited videos are not supported. The original is unchanged.',
    'This video format could not be loaded.',
    'HDR and other special formats are not supported in this version.',
    'The original video size could not be checked.',
    'Not enough space to convert and save. Review unwanted videos first.',
    'This video cannot be compressed with the selected setting.',
    'Conversion failed. Your original is unchanged.',
    'The output could not be verified. Your original is unchanged.',
    'The job has changed. Please check again.',
    'There is no compressed video ready to save.'
]
strings = list(dict.fromkeys(re.findall(r'"([^"\n]*[ぁ-んァ-ヶ一-龠][^"\n]*)"', text)))
if strings:
    assert len(strings) == len(english), (len(strings), strings)
    for index, (ja, en) in enumerate(zip(strings, english)):
        key = f'compression.error{index + 1}'
        catalog[key] = [en, ja]
        text = text.replace('"' + ja + '"', 'L("' + key + '")')
    source.write_text(text, encoding='utf-8')
catalog['settings.sound'] = ['Soft confirmation sound', '控えめな操作音']
(root/'localization.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
# Original 45 ms confirmation tone. Ambient audio respects the silent switch.
with wave.open(str(root/'PhotoSweep/Resources/confirmation.wav'), 'wb') as sound:
    sound.setnchannels(1); sound.setsampwidth(2); sound.setframerate(22050)
    sound.writeframes(b''.join(struct.pack('<h', int(3200 * math.sin(i / 22050 * 2 * math.pi * 880) * math.sin(math.pi * i / 992)**2)) for i in range(992)))
