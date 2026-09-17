import {act, renderHook, waitFor} from '@testing-library/react-native';
import {useLibraryAnalysis} from '../src/state/useLibraryAnalysis';
import type {Photo, PhotoFingerprint, PhotoRepository, Permission} from '../src/domain/types';

const photos:Photo[]=[0,1].map(i=>({id:`p${i}`,uri:`file:///p${i}`,width:100,height:100,createdAt:10,modifiedAt:20,screenshot:false}));
const prints:PhotoFingerprint[]=photos.map(p=>({id:p.id,hash:'0123456789abcdef',quality:300,favorite:false,exactEligible:true}));
function repository():PhotoRepository {
  return {fingerprints:jest.fn(async(ids)=>prints.filter(p=>ids.includes(p.id))),contentDigests:jest.fn(async(ids)=>ids.map(id=>({id,digest:'a'.repeat(64)}))),permission:async()=> 'full',selectMore:async()=>{},page:async()=>({items:photos}),resolve:async()=>photos[0]!,inspect:async()=>({present:[],missing:[],inaccessible:[]}),deleteRequested:async()=> 'cancelled',subscribe:()=>()=>{}};
}
test('analysis publishes byte-confirmed groups, reuses unchanged fingerprints and invalidates edited assets',async()=>{
  const repo=repository();
  const hook=renderHook(({items}:{items:Photo[]})=>useLibraryAnalysis(repo,items,'full',false),{initialProps:{items:photos}});
  await waitFor(()=>expect(hook.result.current.status).toBe('complete'));
  expect(hook.result.current.groups[0]?.kind).toBe('duplicate');
  hook.rerender({items:[...photos]});
  await waitFor(()=>expect(hook.result.current.status).toBe('complete'));
  expect(repo.fingerprints).toHaveBeenCalledTimes(1);
  hook.rerender({items:[{...photos[0]!,modifiedAt:30},photos[1]!]});
  await waitFor(()=>expect(repo.fingerprints).toHaveBeenCalledTimes(2));
  expect(repo.fingerprints).toHaveBeenLastCalledWith(['p0']);
  await waitFor(()=>expect(hook.result.current.status).toBe('complete'));
});
test('permission revocation discards results from an in-flight native analysis',async()=>{
  const repo=repository();let finish!:(value:PhotoFingerprint[])=>void;
  repo.fingerprints=jest.fn(()=>new Promise(resolve=>{finish=resolve;}));
  const hook=renderHook(({permission}:{permission:Permission})=>useLibraryAnalysis(repo,photos,permission,false),{initialProps:{permission:'full' as Permission}});
  await waitFor(()=>expect(repo.fingerprints).toHaveBeenCalled());
  hook.rerender({permission:'denied'});
  await act(async()=>{finish(prints);});
  expect(hook.result.current.status).toBe('idle');expect(hook.result.current.groups).toEqual([]);
  expect(repo.contentDigests).not.toHaveBeenCalled();
});
test('unavailable local thumbnails are counted, without inventing similarity groups',async()=>{
  const repo=repository();repo.fingerprints=jest.fn(async()=>[]);
  const hook=renderHook(()=>useLibraryAnalysis(repo,photos,'limited',false));
  await waitFor(()=>expect(hook.result.current.status).toBe('complete'));
  expect(hook.result.current.unavailable).toBe(2);expect(hook.result.current.groups).toEqual([]);
});
test('native analysis errors leave a retryable error state',async()=>{
  const repo=repository();repo.fingerprints=jest.fn(async()=>{throw new Error('native failure');});
  const hook=renderHook(()=>useLibraryAnalysis(repo,photos,'full',false));
  await waitFor(()=>expect(hook.result.current.status).toBe('error'));
  expect(hook.result.current.error).toBe('native failure');
});
