"""Inspect an internal preview IPA without requiring Xcode (not signature validation)."""
import argparse
import datetime
import hashlib
import json
import plistlib
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('ipa', type=Path)
parser.add_argument('--version', required=True)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
with zipfile.ZipFile(args.ipa) as archive:
    names = archive.namelist()
    info_name = next(n for n in names if n.startswith('Payload/') and n.count('/') == 2 and n.endswith('.app/Info.plist'))
    root = info_name.removesuffix('Info.plist')
    info = plistlib.loads(archive.read(info_name))
    assert info['CFBundleIdentifier'] == 'com.kokicoder.photosweep'
    assert info['CFBundleShortVersionString'] == args.version
    bundle = archive.read(root + 'main.jsbundle')
    assert bundle[:8] == bytes.fromhex('c61fbc03c103191f'), 'Missing embedded Hermes bytecode'
    prohibited = ['DEV CATALOG', 'catalog-session', 'demo-', 'dog.jpg', 'sea.jpg', 'src/dev/adapters', 'catalog-compression', 'PhotoSweep_Codex_UX_Upgrade', 'photosweep-ux-upgrade']
    assert not [s for s in prohibited if s.encode() in bundle], 'Development data found'
    if args.version == '1.3.0':
        assert all(marker in bundle for marker in [b'monthHintSeen', b'compressionStart', b'compressionSave']), '1.3 features missing'
    assert b'homeHintSeen' in bundle, 'Versioned onboarding missing'
    assert root + '_CodeSignature/CodeResources' in names, 'Code signature resources missing'
    profile_bytes = archive.read(root + 'embedded.mobileprovision')
    xml_start = profile_bytes.index(b'<?xml')
    xml_end = profile_bytes.index(b'</plist>', xml_start) + len(b'</plist>')
    profile = plistlib.loads(profile_bytes[xml_start:xml_end])
    assert profile.get('ProvisionedDevices'), 'Not an internal device distribution profile'
    assert profile['ExpirationDate'] > datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None), 'Expired profile'
    assert not profile['Entitlements'].get('get-task-allow'), 'Development profile used'
    report = {
        'bundleId': info['CFBundleIdentifier'], 'version': info['CFBundleShortVersionString'],
        'buildNumber': info['CFBundleVersion'], 'minimumOS': info.get('MinimumOSVersion'),
        'embeddedHermesBundleBytes': len(bundle), 'developmentMarkers': [],
        'versionedOnboardingPresent': True, 'codeSignaturePresent': True,
        'provisioningProfilePresent': True, 'registeredDeviceCount': len(profile['ProvisionedDevices']),
        'profileExpiresAt': profile['ExpirationDate'].isoformat() + 'Z',
        'debuggable': False, 'ipaBytes': args.ipa.stat().st_size,
        'sha256': hashlib.sha256(args.ipa.read_bytes()).hexdigest(),
        'cryptographicSignatureValidation': 'NOT_RUN (requires Apple tooling)',
        'actualDeviceExecution': 'NOT_RUN',
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + '\n', encoding='utf-8')
    print(rendered)
