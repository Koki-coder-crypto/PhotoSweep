"""Fail closed before App Store submission. This is not a substitute for device evidence."""
import json, re, sys
from pathlib import Path
root = Path(__file__).resolve().parent
data = json.loads((root/'ReleaseChecklist.json').read_text(encoding='utf-8'))
missing = [key for key in ['operatorName','supportEmail','supportURL','privacyURL','termsURL','appStoreConnectAppID','approvedBinaryBuild'] if not data[key]]
missing += [key for key, value in data['evidence'].items() if not isinstance(value, dict) or value.get('status') != 'PASS' or not value.get('evidence')]
for key in ['supportURL','privacyURL','termsURL']:
    if data[key] and not data[key].startswith('https://'): missing.append(key + ': HTTPS required')
if data['supportEmail'] and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data['supportEmail']): missing.append('supportEmail: invalid')
if missing:
    print('NOT READY FOR SUBMISSION\n' + '\n'.join('- ' + item for item in missing)); sys.exit(1)
print('Release evidence is complete. Verify the same binary and manually release only after user review.')
