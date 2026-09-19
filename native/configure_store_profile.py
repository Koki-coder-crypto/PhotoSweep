"""Reuse the existing signing certificate and install an App Store profile securely."""
import argparse
import base64
import json
import plistlib
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
import install_delivery_key as delivery


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key', type=Path, required=True)
    parser.add_argument('--key-id', required=True)
    args = parser.parse_args()
    auth = delivery.token(args.key.read_bytes(), args.key_id)
    opener = urllib.request.build_opener(delivery.NoRedirect)

    def api(path, body=None):
        req = urllib.request.Request('https://api.appstoreconnect.apple.com/v1/' + path,
            data=None if body is None else json.dumps(body).encode(),
            headers={'Authorization': 'Bearer ' + auth, 'Content-Type': 'application/json'})
        with opener.open(req, timeout=30) as response:
            return json.load(response)

    credentials = json.loads(Path('credentials.json').read_text())['ios']['distributionCertificate']
    private, cert, _ = load_key_and_certificates(Path(credentials['path']).read_bytes(), credentials['password'].encode())
    assert private is not None and cert is not None, 'Local signing identity missing'
    assert cert.not_valid_after_utc > datetime.now(timezone.utc), 'Local certificate expired'
    cert_bytes = cert.public_bytes(serialization.Encoding.DER)
    bundles = api('bundleIds?' + urllib.parse.urlencode({'filter[identifier]': delivery.BUNDLE_ID}))['data']
    assert len(bundles) == 1, 'Bundle identity must be unique'
    bundle_id = bundles[0]['id']
    certificates = api('certificates?limit=200')['data']
    matches = [c for c in certificates if base64.b64decode(c['attributes']['certificateContent']) == cert_bytes]
    assert len(matches) == 1 and matches[0]['attributes']['certificateType'] in ('DISTRIBUTION', 'IOS_DISTRIBUTION'), 'Existing distribution certificate not found'
    certificate_id = matches[0]['id']
    name = 'PhotoSweep Native App Store'
    profiles = api('profiles?' + urllib.parse.urlencode({'filter[name]': name, 'include': 'bundleId,certificates'}))['data']
    matching = [p for p in profiles if p['attributes']['profileType'] == 'IOS_APP_STORE'
        and p['attributes']['profileState'] == 'ACTIVE'
        and p['relationships']['bundleId']['data']['id'] == bundle_id
        and any(c['id'] == certificate_id for c in p['relationships']['certificates']['data'])]
    if matching:
        profile = matching[0]
    else:
        profile = api('profiles', {'data': {'type': 'profiles', 'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
            'relationships': {'bundleId': {'data': {'type': 'bundleIds', 'id': bundle_id}},
                'certificates': {'data': [{'type': 'certificates', 'id': certificate_id}]}}}})['data']
    raw = base64.b64decode(profile['attributes']['profileContent'])
    start = raw.index(b'<?xml'); end = raw.index(b'</plist>', start) + len(b'</plist>')
    details = plistlib.loads(raw[start:end])
    assert details['TeamIdentifier'] == ['7LXRYTBS7L'], 'Unexpected team'
    assert details['Entitlements']['application-identifier'] == '7LXRYTBS7L.' + delivery.BUNDLE_ID, 'Unexpected bundle'
    assert not details['Entitlements'].get('get-task-allow'), 'Development profile refused'
    assert 'ProvisionedDevices' not in details and not details.get('ProvisionsAllDevices'), 'App Store profile required'
    assert details['ExpirationDate'].replace(tzinfo=timezone.utc) > datetime.now(timezone.utc), 'Profile expired'
    assert cert_bytes in details['DeveloperCertificates'], 'Certificate mismatch'
    output = Path('credentials/ios/app-store.mobileprovision')
    output.parent.mkdir(parents=True, exist_ok=True); output.write_bytes(raw)
    delivery.install('IOS_PROFILE_BASE64', base64.b64encode(raw))
    print(json.dumps({'profileID': profile['id'], 'certificateID': certificate_id, 'bundleID': delivery.BUNDLE_ID,
        'type': 'IOS_APP_STORE', 'status': 'validated and installed'}))


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Apple profile API failed: HTTP {error.code}. Existing certificates were not modified.') from None
    except Exception as error:
        raise SystemExit(f'Profile setup stopped ({type(error).__name__}); no credential contents printed.') from None
