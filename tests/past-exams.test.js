import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateQuestions,mergeQuestions,key} from '../model.js';
const rows=JSON.parse(readFileSync(new URL('../past-exams.json',import.meta.url)));
test('879問を年度・A/Bごとに正答番号とPDFページ付きで検証',()=>{
  assert.equal(validateQuestions(rows).length,879);
  assert.equal(new Set(rows.map(q=>q.year)).size,9);
  for(const year of new Set(rows.map(q=>q.year))){
    for(const group of ['問題A','問題B']){
      const qs=rows.filter(q=>q.year===year&&q.category===group);
      assert.deepEqual(qs.map(q=>Number(q.number)),Array.from({length:qs.length},(_,i)=>i+1));
      assert.equal(qs.length,group==='問題B'?35:['令和8年度','令和7年度','令和6年度'].includes(year)?66:61);
      assert.ok(qs.every(q=>q.pdfPage>0&&q.answerUrl&&q.pdfUrl));
    }
  }
});
test('原本表のA/B別の既知の正答を照合',()=>{
  const answer=(year,part,n)=>rows.find(q=>q.year===year&&q.category===part&&q.number===n).answer;
  assert.equal(answer('令和8年度','問題A','1'),3);
  assert.equal(answer('令和8年度','問題B','5'),4);
  assert.equal(answer('令和3年度','問題A','61'),2);
  assert.equal(answer('令和3年度','問題B','35'),3);
});
test('追加は重複せず既存問題の識別キーを保持する',()=>{
  const merged=mergeQuestions(rows,rows);assert.equal(merged.length,879);assert.equal(key(merged[0]),key(rows[0]));
});
test('取り込みPDFに危険なURLや不正ページを許可しない',()=>{
  assert.throws(()=>validateQuestions([{...rows[0],pdfUrl:'javascript:alert(1)'}]),/URL/);
  assert.throws(()=>validateQuestions([{...rows[0],pdfPage:0}]),/ページ/);
});
