"""Validate the actual Release archive before export; no signing contents logged."""
import plistlib
import sys
from pathlib import Path

app = Path(sys.argv[1])
with (app/'Info.plist').open('rb') as stream:
    info = plistlib.load(stream)
assert info['CFBundleIdentifier'] == 'com.kokicoder.photosweep'
assert info['CFBundleShortVersionString'] == '2.0.0'
assert info['CFBundleVersion'] == sys.argv[2]
assert info['MinimumOSVersion'] == '16.4'
assert info['UIDeviceFamily'] == [1]
assert (app/'embedded.mobileprovision').is_file()
for item in app.rglob('*'):
    assert item.suffix.lower() not in ('.jsbundle', '.js', '.p8', '.p12'), 'Unexpected runtime or signing material in archive'
    assert not any(word in item.name.lower() for word in ('reactnative', 'hermes', 'expomodules', 'qa-media')), 'Development/legacy artifact found'
print('PASS: signed archive identity/version/iPhone deployment and no legacy JavaScript or private keys bundled.')
