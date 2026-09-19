"""Verify the dedicated Apple key, then optionally install it in GitHub Secrets.

Requires cryptography. Never prints the private key, JWT or HTTP response body.
"""
import argparse
import base64
import json
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, utils

ISSUER = 'c4a9f038-9424-4a54-a563-89f1c2df1f3b'
APP_ID = '6813565278'
BUNDLE_ID = 'com.kokicoder.photosweep'
REPOSITORY = 'Koki-coder-crypto/PhotoSweep'


def encoded(value):
    return base64.urlsafe_b64encode(value).rstrip(b'=')


def token(private_bytes, key_id):
    key = serialization.load_pem_private_key(private_bytes, password=None)
    if not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(key.curve, ec.SECP256R1):
        raise ValueError('Expected an Apple P-256 private key')
    now = int(time.time())
    header = {'alg': 'ES256', 'kid': key_id, 'typ': 'JWT'}
    claims = {'iss': ISSUER, 'iat': now, 'exp': now + 300, 'aud': 'appstoreconnect-v1'}
    message = b'.'.join(encoded(json.dumps(part, separators=(',', ':')).encode()) for part in (header, claims))
    r, s = utils.decode_dss_signature(key.sign(message, ec.ECDSA(hashes.SHA256())))
    return (message + b'.' + encoded(r.to_bytes(32, 'big') + s.to_bytes(32, 'big'))).decode()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def verify(private_bytes, key_id):
    request = urllib.request.Request(
        f'https://api.appstoreconnect.apple.com/v1/apps/{APP_ID}',
        headers={'Authorization': 'Bearer ' + token(private_bytes, key_id)})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=30) as response:
        app = json.load(response)['data']
    if app['id'] != APP_ID or app['attributes']['bundleId'] != BUNDLE_ID:
        raise ValueError('Apple returned a different app identity')


def install(name, value):
    result = subprocess.run(['gh', 'secret', 'set', name, '--repo', REPOSITORY,
                             '--env', 'apple-distribution'], input=value, capture_output=True)
    if result.returncode:
        raise RuntimeError(f'GitHub secret update failed: {name}. Values were not printed.')
    print(f'Installed {name}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key', type=Path, required=True)
    parser.add_argument('--key-id', required=True)
    parser.add_argument('--install', action='store_true')
    args = parser.parse_args()
    if args.key.name != f'AuthKey_{args.key_id}.p8':
        raise ValueError('Key filename and key ID must match')
    private_bytes = args.key.read_bytes()
    verify(private_bytes, args.key_id)
    print(f'Apple authentication verified for PhotoSweep ({APP_ID}).')
    if args.install:
        install('ASC_PRIVATE_KEY', private_bytes)
        install('ASC_ISSUER_ID', ISSUER.encode())
        install('ASC_KEY_ID', args.key_id.encode())


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Apple authentication failed: HTTP {error.code}. No secrets changed.') from None
    except urllib.error.URLError:
        raise SystemExit('Apple connection failed. No secrets changed.') from None
    except (OSError, ValueError, KeyError, TypeError, RuntimeError) as error:
        # Avoid library exception text that might contain credential input.
        raise SystemExit(f'Delivery key setup failed ({type(error).__name__}); check file, identity and GitHub access.') from None
