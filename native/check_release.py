"""Fail closed before App Store submission. This is not a substitute for device evidence."""
import argparse, json, re, sys
from pathlib import Path
root = Path(__file__).resolve().parent
data = json.loads((root/'ReleaseChecklist.json').read_text(encoding='utf-8'))
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--initial-submission', action='store_true', help='Review submission only; does not authorize public release or pass deferred checks')
args = p.parse_args()
missing = [key for key in ['operatorName','supportEmail','supportURL','privacyURL','termsURL','appStoreConnectAppID','approvedBinaryBuild'] if not data[key]]
checks = data['evidence']
if args.initial_submission:
    scope = data.get('initialSubmission', {})
    if scope.get('releaseMode') != 'MANUAL' or not scope.get('reason'):
        missing.append('initialSubmission: explicit scope and manual release required')
    required = ['nativeCI', 'simulatorJapaneseEnglish', 'oldAppUpgradeOnIPhone',
                'realDeletionAndUnknownResult', 'compressionQualityAudioOrientation',
                'sandboxPurchaseRestorePending', 'privacyLegalAndRegionalDeclarations',
                'storeKitIntegration', 'photoAnalysisRegression', 'initialStoreScreenshots']
    checks = {key: data['evidence'].get(key) for key in required}
missing += [key for key, value in checks.items() if not isinstance(value, dict) or value.get('status') != 'PASS' or not value.get('evidence')]
for key in ['supportURL','privacyURL','termsURL']:
    if data[key] and not data[key].startswith('https://'): missing.append(key + ': HTTPS required')
if data['supportEmail'] and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data['supportEmail']): missing.append('supportEmail: invalid')
if missing:
    print('NOT READY FOR SUBMISSION\n' + '\n'.join('- ' + item for item in missing)); sys.exit(1)
if args.initial_submission:
    print('Initial review-submission checks passed. This is NOT public-release approval. Deferred checks remain recorded and the full release gate is unchanged.')
else:
    print('Release evidence is complete. Verify the same binary and manually release only after user review.')
