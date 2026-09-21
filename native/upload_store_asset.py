"""Upload a reviewed PNG using Apple's asset reservation protocol.

Reservation JSON must contain data.type and data.relationships. Secrets and
temporary upload URLs are never printed. The journal makes completed uploads
idempotent. This tool does not submit an app or replace existing screenshots.
"""
import argparse
import hashlib
import json
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit
import install_delivery_key as signing

KINDS = {'appScreenshots', 'subscriptionAppStoreReviewScreenshots', 'inAppPurchaseAppStoreReviewScreenshots'}


def upload(image, reservation, key, key_id, journal):
    payload = json.loads(reservation.read_text(encoding='utf-8'))
    kind = payload['data']['type']
    if kind not in KINDS:
        raise ValueError('Unsupported asset resource')
    content = image.read_bytes()
    if content[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Reviewed PNG required')
    checksum = hashlib.md5(content).hexdigest()
    identity = hashlib.sha256((json.dumps(payload, sort_keys=True) + checksum).encode()).hexdigest()
    records = json.loads(journal.read_text()) if journal.exists() else {}

    def api(path, method='GET', body=None):
        request = urllib.request.Request('https://api.appstoreconnect.apple.com/v1/' + path,
            headers={'Authorization': 'Bearer ' + signing.token(key.read_bytes(), key_id), 'Content-Type': 'application/json'},
            method=method, data=json.dumps(body).encode() if body else None)
        with urllib.request.build_opener(signing.NoRedirect).open(request, timeout=45) as response:
            data = response.read()
        return json.loads(data) if data else {}

    if identity in records:
        asset = api(kind + '/' + records[identity])['data']
        state = asset['attributes']['assetDeliveryState']['state']
        if state in ('COMPLETE', 'UPLOAD_COMPLETE'):
            print(json.dumps({'id': asset['id'], 'state': state, 'file': image.name}))
            return
        if state == 'FAILED':
            raise ValueError('Previous reservation failed; inspect its errors before replacing it')
    else:
        payload['data']['attributes'] = {'fileName': image.name, 'fileSize': len(content)}
        asset = api(kind, 'POST', payload)['data']
        records[identity] = asset['id']
        journal.parent.mkdir(parents=True, exist_ok=True)
        temporary = journal.with_suffix('.tmp')
        temporary.write_text(json.dumps(records, indent=2))
        temporary.replace(journal)
    for operation in asset['attributes']['uploadOperations']:
        location = urlsplit(operation['url'])
        if location.scheme != 'https' or not location.hostname.endswith('.apple.com'):
            raise ValueError('Unexpected asset-upload destination')
        offset, length = operation['offset'], operation['length']
        if offset < 0 or length <= 0 or offset + length > len(content):
            raise ValueError('Invalid requested byte range')
        headers = {item['name']: item['value'] for item in operation['requestHeaders']}
        request = urllib.request.Request(operation['url'], method=operation['method'], headers=headers,
            data=content[offset:offset + length])
        with urllib.request.build_opener(signing.NoRedirect).open(request, timeout=60) as response:
            response.read()
    api(kind + '/' + asset['id'], 'PATCH', {'data': {'type': kind, 'id': asset['id'],
        'attributes': {'uploaded': True, 'sourceFileChecksum': checksum}}})
    result = api(kind + '/' + asset['id'])['data']
    print(json.dumps({'id': asset['id'], 'file': image.name, 'state': result['attributes']['assetDeliveryState']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('image', 'reservation', 'key', 'journal'):
        parser.add_argument('--' + name, type=Path, required=True)
    parser.add_argument('--key-id', required=True)
    args = parser.parse_args()
    try:
        upload(args.image, args.reservation, args.key, args.key_id, args.journal)
    except urllib.error.HTTPError as error:
        # Exception strings for upload failures can contain signed URLs.
        parser.exit(1, f'Asset request failed (HTTP {error.code}); reservation retained for inspection.\n')
    except urllib.error.URLError:
        parser.exit(1, 'Asset network request failed; reservation retained for retry.\n')
