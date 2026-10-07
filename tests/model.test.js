import test from 'node:test';
import assert from 'node:assert/strict';
import {importData, key, record} from '../model.js';
const q={year:'2025',exam:'第一次',number:'1',text:'問題',choices:['A','B']};
test('書き出したバックアップから問題を復元する',()=>assert.equal(importData({questions:[{...q,answer:2}],history:{}})[0].answer,2));
test('年度・試験・番号で順序に依存せず結合する',()=>{
  const second={...q,number:'2'};
  const data=importData({questions:[q,second],answers:[{...second,answer:2},{...q,answer:1}]});
  assert.deepEqual(data.map(x=>x.answer),[1,2]);
});
test('異なる年度を混同しない',()=>assert.throws(()=>importData({questions:[q],answers:[{...q,year:'2024',answer:1}]}),/正答が見つかりません/));
test('欠落・余剰・重複の解答を拒否する',()=>{
  assert.throws(()=>importData({questions:[q],answers:[]}),/正答が見つかりません/);
  assert.throws(()=>importData({questions:[q],answers:[{...q,answer:1},{...q,number:'2',answer:1}]}),/対応する問題/);
  assert.throws(()=>importData({questions:[q],answers:[{...q,answer:1},{...q,answer:2}]}),/重複/);
});
test('正答範囲と問題重複を検証する',()=>{
  assert.throws(()=>importData([{...q,answer:3}]),/正答番号/);
  assert.throws(()=>importData([{...q,answer:1},{...q,answer:1}]),/重複/);
});
test('誤答後の復習正解を記録する',()=>{
  const question={...q,answer:2};let h=record({},question,1);assert.equal(h[key(q)].lastCorrect,false);
  h=record(h,question,2);assert.equal(h[key(q)].lastCorrect,true);assert.equal(h[key(q)].attempts,2);assert.equal(h[key(q)].correct,1);
});
