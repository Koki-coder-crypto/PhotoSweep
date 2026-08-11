import assert from 'node:assert/strict';

function group(items) {
  const sorted=[...items].sort((a,b)=>a.createdAt-b.createdAt); const raw=[]; let current=[];
  const ratio=x=>x.width/Math.max(x.height,1);
  for (const item of sorted) {
    const prev=current[current.length-1];
    if (!prev) { current=[item]; continue; }
    const close=Math.abs(item.createdAt-prev.createdAt)<=8000;
    const shape=Math.abs(ratio(item)-ratio(prev))<0.02;
    const p1=item.width*item.height,p2=prev.width*prev.height;
    const res=Math.abs(p1-p2)/Math.max(p1,p2,1)<0.1;
    if(close&&shape&&res) current.push(item); else { if(current.length>=2) raw.push(current); current=[item]; }
  }
  if(current.length>=2) raw.push(current); return raw;
}
const base={width:4032,height:3024,estimatedBytes:100};
assert.equal(group([{...base,id:'a',createdAt:1000},{...base,id:'b',createdAt:5000}]).length,1);
assert.equal(group([{...base,id:'a',createdAt:1000},{...base,id:'b',createdAt:20000}]).length,0);
assert.equal(group([{...base,id:'a',createdAt:1000},{...base,id:'b',width:1000,height:1000,createdAt:2000}]).length,0);
console.log('scanner grouping logic: ok');
