"""Small, dependency-free work harness: select checks, cache local passes, summarize CI."""
import argparse, hashlib, json, os, re, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT/'artifacts/native-harness'

def run(*args, check=True):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or 'Command failed')
    return result

def inputs():
    paths = [p for p in (ROOT/'native/PhotoSweep').rglob('*') if p.is_file()]
    paths += [ROOT/'native'/n for n in ['verify_source.py','localization.json','generate_localizations.py','Store/metadata.json']]
    paths += [ROOT/'assets/icon.png']
    return sorted(paths)

def fingerprint():
    digest = hashlib.sha256()
    for path in inputs():
        digest.update(path.relative_to(ROOT).as_posix().encode()); digest.update(path.read_bytes())
    return digest.hexdigest()

def select(paths):
    native = [p.replace('\\','/') for p in paths if p.startswith(('native/', '.github/workflows/native-ios.yml', 'tools/native_harness.py'))]
    product = [p for p in native if p.startswith(('native/PhotoSweep/','native/Tests/','native/UITests/')) or p in ['native/project.yml','native/localization.json','native/make_qa_media.swift','native/generate_localizations.py','.github/workflows/native-ios.yml','tools/native_harness.py']]
    if not product: return 'local'
    if all(p.startswith(('native/PhotoSweep/Core/','native/Tests/')) for p in product): return 'unit'
    return 'full'

def changes(base):
    if base:
        result = run('git','diff','--name-only',base,'HEAD',check=False)
        if result.returncode: return None
        return result.stdout.splitlines()
    tracked = run('git','diff','--name-only','HEAD').stdout.splitlines()
    return tracked + run('git','ls-files','--others','--exclude-standard').stdout.splitlines()

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('action',choices=['check','plan','ci','status','failure','self-test'])
parser.add_argument('--base'); parser.add_argument('--run'); parser.add_argument('--force',action='store_true')
args = parser.parse_args(); CACHE.mkdir(parents=True,exist_ok=True)
try:
    if args.action == 'self-test':
        assert select(['native/README.md','native/Store/website.json']) == 'local'
        assert select(['native/Store/metadata.json']) == 'local'
        assert select(['native/PhotoSweep/Core/Persistence.swift','native/Tests/ReviewTests.swift']) == 'unit'
        assert select(['native/PhotoSweep/UI/SwipeView.swift']) == 'full'
        assert select(['native/PhotoSweep/Services/Billing.swift']) == 'full'
        assert select(['native/localization.json']) == 'full'
        print('PASS: change classification; unsafe/mixed native changes retain full checks.')
    elif args.action == 'check':
        key = fingerprint(); cache = CACHE/'local-pass.json'
        old = json.loads(cache.read_text()) if cache.exists() else {}
        if not args.force and old.get('fingerprint') == key:
            print('REUSED local source checks: inputs unchanged. This is not a native build/device pass.')
        else:
            run(sys.executable,'native/generate_localizations.py')
            result = run(sys.executable,'native/verify_source.py')
            cache.write_text(json.dumps({'fingerprint':fingerprint(),'at':time.time()}))
            print(result.stdout.strip())
    elif args.action in ['plan','ci']:
        paths = changes(args.base)
        lane = 'full' if args.force or paths is None else select(paths)
        print(json.dumps({'lane':lane,'changed':len(paths) if paths is not None else 'unknown','tests': 'PhotoSweepTests' if lane=='unit' else ('all native tests' if lane=='full' else 'local source checks only')},ensure_ascii=False))
        if args.action=='ci':
            with open(os.environ['GITHUB_ENV'],'a') as stream: stream.write('NATIVE_CHECK_LANE='+lane+'\n')
    elif args.action=='status':
        cache = CACHE/'ci-status.json'
        old = json.loads(cache.read_text()) if cache.exists() else {}
        if not args.force and time.time()-old.get('at',0)<120 and old.get('requestedRun')==args.run:
            print(json.dumps({'cached':True,**old['result']}))
        else:
            if args.run:
                result=json.loads(run('gh','run','view',args.run,'--json','databaseId,status,conclusion,headSha,url').stdout)
            else:
                runs=json.loads(run('gh','run','list','--workflow','native-ios.yml','--branch','codex/swiftui-2','--limit','1','--json','databaseId,status,conclusion,headSha,url').stdout)
                result=runs[0] if runs else {'status':'none'}
            cache.write_text(json.dumps({'at':time.time(),'requestedRun':args.run,'result':result}));print(json.dumps(result))
    elif args.action=='failure':
        if not args.run: raise RuntimeError('--run is required')
        state=json.loads(run('gh','run','view',args.run,'--json','status,conclusion').stdout)
        if state['status']!='completed': raise RuntimeError('Run still active; do not download/repeatedly poll logs.')
        if state['conclusion']=='success': print('PASS; no failure logs needed.')
        else:
            result=run('gh','run','view',args.run,'--log-failed')
            lines=[line for line in result.stdout.splitlines() if re.search(r' error:|Test Case.*failed|TEST FAILED|BUILD FAILED|Executed .*tests',line)]
            print('\n'.join(lines[-25:]) or 'No compiler/test failure signature; inspect lightweight diagnostics.')
except (RuntimeError,ValueError,OSError) as error:
    print(str(error),file=sys.stderr);sys.exit(1)
