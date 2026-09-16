/** Read-only integrity checks for the handoff, not app/native tests. No dependencies. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const errors=[];const demand=(value,message)=>{if(!value)errors.push(message)};
const files=[];function walk(dir){for(const x of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory())walk(p);else files.push(p)}}walk(root);
const screens=read('design/screens.json'),ids=new Set(screens.map(s=>s.id));
demand(screens.length===48,'Expected 48 screens');demand(ids.size===48,'Duplicate screen IDs');
for(const s of screens){demand(fs.existsSync(path.join(root,s.image)),`Missing ${s.image}`);for(const t of s.transitions)demand(ids.has(t),`Unknown transition ${s.id} -> ${t}`)}
const copies=read('design/copy.ja.json');for(const s of screens)demand(s.id in copies,`Missing copy ${s.id}`);
const variants=read('design/state_variants.json');for(const v of variants)demand(ids.has(v.parent),`Unknown variant parent ${v.parent}`);
const acceptance=read('contracts/acceptance-scenarios.json').scenarios;demand(new Set(acceptance.map(x=>x.id)).size===acceptance.length,'Duplicate acceptance IDs');
const boardCount=fs.readdirSync(path.join(root,'design/boards')).filter(x=>/\.png$/.test(x)).length;demand(boardCount===12,'Expected 12 boards');
const pngCount=fs.readdirSync(path.join(root,'design/screens')).filter(x=>/\.png$/.test(x)).length;demand(pngCount===48,'Expected 48 PNGs');
const banned=files.filter(x=>/\.(?:ttf|otf|ttc|woff2?|p8|p12|mobileprovision|key)$/i.test(x));demand(!banned.length,'Font or credential files found');
const htmlFiles=['index.html','design/reference.html','design/animation-preview.html'];
for(const f of htmlFiles){const full=path.join(root,f);demand(fs.existsSync(full),`Missing ${f}`);if(!fs.existsSync(full))continue;const text=fs.readFileSync(full,'utf8');for(const m of text.matchAll(/(?:src|href)="([^"#]+)"/g)){const ref=m[1];if(/^(https?:|data:|mailto:|javascript:)/.test(ref))continue;demand(fs.existsSync(path.resolve(path.dirname(full),ref)),`Broken HTML reference: ${f} -> ${ref}`)}}
const layout=read('reports/REFERENCE_LAYOUT_CHECK.json');demand(layout.screens.every(x=>!x.overflowX),'Horizontal overflow in reference');
const required=['START_HERE.md','CODEX_START_PROMPT.md','PROVENANCE.md','AGENTS.md','config.example.json','docs/00_PRODUCT_BRIEF.md','docs/09_IMPLEMENTATION_TASKS.md','docs/10_TEST_PLAN.md','docs/11_APPLE_EAS_SETUP.md','docs/16_SOURCES.md','contracts/policy.mjs','contracts/policy.test.mjs','contracts/interfaces.ts'];
for(const f of required)demand(fs.existsSync(path.join(root,f)),`Missing required ${f}`);
const result={scope:'引き継ぎファイルの読み取り整合検査。アプリ・iPhone・StoreKitの検証ではない。',checkedAt:new Date().toISOString(),status:errors.length?'FAIL':'PASS',screens:screens.length,screenPngs:pngCount,boards:boardCount,stateVariants:variants.length,acceptanceScenarios:acceptance.length,nativeAcceptanceRun:acceptance.filter(x=>x.status!=='NOT_RUN').length,htmlFilesChecked:htmlFiles.length,fontFilesIncluded:0,errors};
console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
