"""Validate profile without printing device IDs, certificates or other private material."""
import os, plistlib, pathlib, shutil, hashlib
from datetime import datetime, timezone
root = pathlib.Path(os.environ['RUNNER_TEMP'])
with (root/'profile.plist').open('rb') as stream: profile = plistlib.load(stream)
assert profile['TeamIdentifier'] == ['7LXRYTBS7L'], 'Wrong Apple team'
assert profile['Entitlements']['application-identifier'] == '7LXRYTBS7L.com.kokicoder.photosweep', 'Wrong bundle ID'
assert 'ProvisionedDevices' not in profile and not profile.get('ProvisionsAllDevices'), 'App Store profile required (not ad hoc or enterprise)'
assert not profile['Entitlements'].get('get-task-allow'), 'Development profile refused'
assert profile['ExpirationDate'].replace(tzinfo=timezone.utc) > datetime.now(timezone.utc), 'Expired profile'
assert len(profile['DeveloperCertificates']) == 1, 'Exactly one distribution identity required'
identity = hashlib.sha1(profile['DeveloperCertificates'][0]).hexdigest().upper()
uuid = profile['UUID']
target = pathlib.Path.home()/'Library/MobileDevice/Provisioning Profiles'
target.mkdir(parents=True, exist_ok=True); shutil.copyfile(root/'distribution.mobileprovision', target/(uuid+'.mobileprovision'))
with open(os.environ['GITHUB_ENV'], 'a') as stream: stream.write('PROFILE_UUID='+uuid+'\nSIGNING_IDENTITY='+identity+'\n')
options = {'method':'app-store-connect','teamID':'7LXRYTBS7L','signingStyle':'manual','signingCertificate':identity,'provisioningProfiles':{'com.kokicoder.photosweep':uuid},'manageAppVersionAndBuildNumber':False,'uploadSymbols':True}
with (root/'ExportOptions.plist').open('wb') as stream: plistlib.dump(options, stream)
print('Validated team, bundle ID and App Store distribution profile.')
