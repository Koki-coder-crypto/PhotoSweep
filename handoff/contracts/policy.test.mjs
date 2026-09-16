import test from 'node:test';
import assert from 'node:assert/strict';
import {hasProAccess, recordDecision, quotaRemaining, mayUse, batchSize, offerView, reconcileDeletion, feedback, upsellPolicy, trialReminder} from './policy.mjs';
const now = 1_800_000_000_000;
const e = {verified:true, kind:'trial_active', expiresAtMs:now+1000};
const ledger = n => ({dayKey:'2026-09-16', assetIds:Array.from({length:n},(_,i)=>`a${i}`)});
const candidate = x => ({kind:'candidate',assetId:x,persisted:true});
const p={displayPrice:'￥480',period:'month',introOffer:{mode:'freeTrial',unit:'week',value:1}};
const u={trigger:'quota50', pro:false, blocked:false, alreadyShownToday:false};
const reminder={verified:true,trial:true,endsAtMs:now+7*86400000,nowMs:now,optedIn:true,permission:'granted',autoRenew:true};
const cases=[
 ['未検証isPro相当では解放しない',()=>assert.equal(hasProAccess({...e,verified:false},now),false)],
 ['検証済み有効trialは解放',()=>assert.equal(hasProAccess(e,now),true)],
 ['期限ちょうどは失効',()=>assert.equal(hasProAccess({...e,expiresAtMs:now},now),false)],
 ['更新停止でも期限内は有効',()=>assert.equal(hasProAccess({...e,autoRenew:false},now),true)],
 ['取消済み権利は無効',()=>assert.equal(hasProAccess({...e,revoked:true},now),false)],
 ['正当な旧買い切りは保持',()=>assert.equal(hasProAccess({verified:true,kind:'legacy_lifetime'},now),true)],
 ['graceは検証済みの期限内だけ',()=>assert.equal(hasProAccess({verified:true,kind:'grace',graceExpiresAtMs:now+100},now),true)],
 ['請求再試行だけで無期限Proにしない',()=>assert.equal(hasProAccess({verified:true,kind:'billing_retry'},now),false)],
 ['49から50枚目は許可',()=>assert.equal(recordDecision(ledger(49),candidate('new')).ledger.assetIds.length,50)],
 ['51枚目の新規判断は不許可',()=>assert.equal(recordDecision(ledger(50),candidate('new')).allowed,false)],
 ['上限でも同じ写真の再判断は枠不消費',()=>assert.equal(recordDecision(ledger(50),candidate('a1')).charged,false)],
 ['keepもcandidateと同じ枠',()=>assert.equal(recordDecision(ledger(1),{kind:'keep',assetId:'new',persisted:true}).charged,true)],
 ['見るだけでは枠不消費',()=>assert.equal(recordDecision(ledger(1),{kind:'view'}).ledger.assetIds.length,1)],
 ['skipは枠不消費',()=>assert.equal(recordDecision(ledger(1),{kind:'skip'}).charged,false)],
 ['undoで利用台帳は消さない',()=>assert.deepEqual(recordDecision(ledger(2),{kind:'undo'}).ledger,ledger(2))],
 ['永続化失敗では枠不消費',()=>assert.equal(recordDecision(ledger(1),{kind:'keep',assetId:'new',persisted:false}).charged,false)],
 ['Proは無料台帳を上書きしない',()=>assert.deepEqual(recordDecision(ledger(50),candidate('new'),true).ledger,ledger(50))],
 ['重複asset台帳は重複カウントしない',()=>assert.equal(quotaRemaining({assetIds:['a','a']}),49)],
 ['上限でも候補の本削除は無料',()=>assert.equal(mayUse('deleteSelected',0),true)],
 ['上限でも取り消しは無料',()=>assert.equal(mayUse('undo',0),true)],
 ['上限でも契約管理は無料',()=>assert.equal(mayUse('manageSubscription',0),true)],
 ['高度フィルタはPro',()=>assert.equal(mayUse('customDate',50),false)],
 ['残枠10なら10枚へ短縮',()=>assert.equal(batchSize({remainingAssets:100,freeRemaining:10}),10)],
 ['無料は要求100でも20枚区切り',()=>assert.equal(batchSize({requested:100,remainingAssets:100,freeRemaining:50}),20)],
 ['Pro100枚より写真少なければ短縮',()=>assert.equal(batchSize({requested:100,remainingAssets:35,freeRemaining:0,pro:true}),35)],
 ['無料枠0なら新規バッチ0',()=>assert.equal(batchSize({remainingAssets:100,freeRemaining:0}),0)],
 ['資格と正規1週offerがあればtrial',()=>assert.equal(offerView({product:p,eligibility:'eligible'}).mode,'trial')],
 ['体験対象外は有料として表示',()=>assert.equal(offerView({product:p,eligibility:'ineligible'}).mode,'paid')],
 ['資格不明では無料を約束しない',()=>assert.equal(offerView({product:p,eligibility:'unknown'}).mode,'blocked')],
 ['価格なしは固定値で代用しない',()=>assert.equal(offerView({product:{...p,displayPrice:''},eligibility:'eligible'}).mode,'blocked')],
 ['offerなしで7日を作らない',()=>assert.equal(offerView({product:{...p,introOffer:null},eligibility:'eligible'}).mode,'paid')],
 ['3日offerを7日と表示しない',()=>assert.equal(offerView({product:{...p,introOffer:{mode:'freeTrial',unit:'day',value:3}},eligibility:'eligible'}).trialDays,0)],
 ['端末購入制限を回避しない',()=>assert.equal(offerView({product:p,eligibility:'eligible',purchaseAllowed:false}).mode,'blocked')],
 ['削除OSキャンセルで候補維持',()=>assert.deepEqual(reconcileDeletion(['a','b'],{kind:'cancelled'}).remainingIds,['a','b'])],
 ['確認できた全件成功だけ祝う',()=>assert.equal(reconcileDeletion(['a'],{kind:'confirmed',deletedIds:['a']}).celebrate,true)],
 ['部分成功を全成功にしない',()=>assert.equal(reconcileDeletion(['a','b'],{kind:'confirmed',deletedIds:['a']}).state,'partial')],
 ['部分成功は未処理分だけ候補残す',()=>assert.deepEqual(reconcileDeletion(['a','b'],{kind:'confirmed',deletedIds:['a']}).remainingIds,['b'])],
 ['削除結果不明で成功表示しない',()=>assert.equal(reconcileDeletion(['a'],{kind:'unknown'}).celebrate,false)],
 ['0件成功は祝いではない',()=>assert.equal(reconcileDeletion([],{kind:'confirmed',deletedIds:[]}).celebrate,false)],
 ['依頼外assetの削除報告を拒否',()=>assert.throws(()=>reconcileDeletion(['a'],{kind:'confirmed',deletedIds:['b']}))],
 ['残すと候補は同じ触覚',()=>assert.equal(feedback('keep_committed'),feedback('candidate_committed'))],
 ['支払案内だけで成功振動しない',()=>assert.equal(feedback('paywall_opened'),'none')],
 ['失敗では成功振動しない',()=>assert.equal(feedback('delete_failed'),'none')],
 ['触覚オフ設定を守る',()=>assert.equal(feedback('delete_confirmed',false),'none')],
 ['上限は一度区切りを表示',()=>assert.equal(upsellPolicy(u),'limit_screen')],
 ['閉じた日には上限案内を繰り返さない',()=>assert.equal(upsellPolicy({...u,alreadyShownToday:true}),'none')],
 ['本人が機能を選べば料金を開く',()=>assert.equal(upsellPolicy({...u,trigger:'pro_feature',explicit:true,alreadyShownToday:true}),'open_paywall')],
 ['削除処理中は売り込まない',()=>assert.equal(upsellPolicy({...u,blocked:true}),'none')],
 ['Proには体験案内を出さない',()=>assert.equal(upsellPolicy({...u,pro:true}),'none')],
 ['結果画面は非モーダルの案内',()=>assert.equal(upsellPolicy({...u,trigger:'result'}),'inline_link')],
 ['通知は検証期限の48時間前',()=>assert.equal(trialReminder(reminder),now+5*86400000)],
 ['通知拒否なら予約しない',()=>assert.equal(trialReminder({...reminder,permission:'denied'}),null)],
 ['optin前に通知しない',()=>assert.equal(trialReminder({...reminder,optedIn:false}),null)],
 ['更新停止なら更新注意の予約を取り消す',()=>assert.equal(trialReminder({...reminder,autoRenew:false}),null)],
 ['短いsandbox期間で過去通知を即送信しない',()=>assert.equal(trialReminder({...reminder,endsAtMs:now+1000}),null)],
 ['不正な入力は無言で受け入れない',()=>assert.throws(()=>batchSize({remainingAssets:-1,freeRemaining:20}))],
];
for(const [name,fn] of cases) test(name,fn);
