import {importData, key, record, mergeQuestions} from './model.js';
const $ = id => document.getElementById(id);
let questions=[], history={}, queue=[], index=0, selected=null, answered=false;
let currentPdf='';
function showPdf(show) {
  $('pdf-view').hidden=!show;
  $('toggle-pdf').setAttribute('aria-expanded',String(show));
  $('toggle-pdf').textContent=show?'PDFを閉じる':'この画面でPDFを表示';
  if(show) $('pdf-view').src=currentPdf; else $('pdf-view').removeAttribute('src');
}
$('toggle-pdf').onclick=()=>showPdf($('pdf-view').hidden);
function focusQuestion(){if(matchMedia('(max-width:700px)').matches)$('question-title').scrollIntoView({behavior:'smooth',block:'start'});}
function save() { try { localStorage.setItem('doboku-study-v1', JSON.stringify({questions,history})); } catch { $('import-status').textContent='保存できませんでした。学習データをファイルに書き出してください。'; } }
function stats() {
  const entries=questions.map(q=>history[key(q)]).filter(Boolean);
  const attempts=entries.reduce((s,h)=>s+h.attempts,0), correct=entries.reduce((s,h)=>s+h.correct,0);
  $('total').textContent=questions.length; $('attempts').textContent=attempts;
  $('rate').textContent=attempts ? Math.round(correct/attempts*100)+'%' : '—';
  $('wrong').textContent=entries.filter(h=>!h.lastCorrect).length;
}
function filters() {
  for (const field of ['year','category']) {
    $(field).replaceChildren(new Option('すべて',''), ...[...new Set(questions.map(q=>q[field]))].map(v=>new Option(v,v)));
  }
}
function render() {
  $('pdf-area').hidden=true; currentPdf=''; showPdf(false);
  selected=null; answered=false; $('choices').replaceChildren(); $('result').replaceChildren(); $('check').disabled=true; $('check').hidden=false; $('next').hidden=true;
  const q=queue[index];
  if (!q) { $('question-title').textContent='対象の問題はありません。'; $('meta').textContent='年度・分野・出題モードを変更してください。'; $('position').textContent=''; $('source').textContent=''; $('badge').textContent='学習'; $('check').hidden=true; return; }
  $('badge').textContent=q.category; $('position').textContent=`${index+1} / ${queue.length}`;
  $('meta').textContent=`${q.year} · ${q.exam} · 問${q.number}`;
  $('question-title').textContent=q.text; $('source').textContent=q.source ? `出典：${q.source}` : '出典：未登録';
  if(q.pdfUrl) {
    const url=q.pdfUrl+`#page=${q.pdfPage}&view=FitH`;
    $('pdf-area').hidden=false; currentPdf=url; $('pdf-link').href=url;
    showPdf(!matchMedia('(max-width:700px)').matches);
    $('pdf-link').textContent=`原本のPDF ${q.pdfPage}ページを開く ↗`;
  }
  q.choices.forEach((c,i)=>{
    const b=document.createElement('button'); b.className='choice'; b.setAttribute('aria-pressed','false');
    const n=document.createElement('span'); n.textContent=i+1; b.append(n,document.createTextNode(c));
    b.onclick=()=>{ if(answered) return; selected=i+1; for(const el of $('choices').children){el.classList.remove('selected');el.setAttribute('aria-pressed','false');} b.classList.add('selected'); b.setAttribute('aria-pressed','true'); $('check').disabled=false; };
    $('choices').append(b);
  });
}
function start(shuffle=false) {
  queue=questions.filter(q=>(!$('year').value||q.year===$('year').value)&&(!$('category').value||q.category===$('category').value)&&($('mode').value==='all'||($('mode').value==='wrong'?history[key(q)]?.lastCorrect===false:!history[key(q)])));
  if(shuffle) for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]];}
  index=0; render();
}
$('start').onclick=()=>{start();focusQuestion();}; $('shuffle').onclick=()=>{start(true);focusQuestion();};
$('check').onclick=()=>{
  if(selected===null||answered) return;
  answered=true; const q=queue[index]; history=record(history,q,selected); save(); stats();
  [...$('choices').children].forEach((b,i)=>{b.disabled=true;if(i+1===q.answer)b.classList.add('correct');else if(i+1===selected)b.classList.add('incorrect');});
  const title=document.createElement('strong'); title.textContent=selected===q.answer?'正解です！':`正解は ${q.answer} です。`;
  const explanation=document.createElement('p'); explanation.textContent=q.explanation||'この問題には解説が登録されていません。';
  $('result').append(title,explanation); $('check').hidden=true; $('next').hidden=false; $('next').textContent=index+1===queue.length?'学習を終える':'次の問題へ →';
  if(q.answerUrl){const a=document.createElement('a');a.href=q.answerUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='原本の正答表を確認する ↗';$('result').append(a);}
};
$('next').onclick=()=>{
  if(index+1<queue.length){index++;render();focusQuestion();}else{ $('pdf-area').hidden=true;$('pdf-view').removeAttribute('src');$('question-title').textContent='今回の学習が完了しました。';$('choices').replaceChildren();$('result').textContent='間違えた問題は、出題モード「間違えた問題」から復習できます。';$('next').hidden=true;$('source').textContent=''; }
};
function download(data,name) { const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
$('export').onclick=()=>download({questions,history},'doboku-study-backup.json');
$('sample').onclick=()=>download({questions:[{year:'2025',exam:'1級・第一次検定',number:'1',category:'土工',text:'ここに問題文',choices:['選択肢1','選択肢2','選択肢3','選択肢4'],source:'出典のURL'}],answers:[{year:'2025',exam:'1級・第一次検定',number:'1',answer:2,explanation:'ここに解説'}]},'question-template.json');
function validateHistory(data, qs) {
  if(data===undefined) return {};
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('学習履歴の形式が不正です。');
  const out={};for(const q of qs){const h=data[key(q)];if(!h)continue;if(!Number.isInteger(h.attempts)||h.attempts<1||!Number.isInteger(h.correct)||h.correct<0||h.correct>h.attempts||typeof h.lastCorrect!=='boolean')throw new Error('学習履歴の値が不正です。');out[key(q)]=h;} return out;
}
$('file').onchange=async e=>{
  try { const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw new Error('5MB以下のJSONファイルを選んでください。');
    const data=JSON.parse(await file.text()), next=importData(data), nextHistory=validateHistory(data.history,next);
    if(!confirm(`${next.length}問を取り込み、現在の問題と履歴を置き換えます。よろしいですか？`))return;
    questions=next;history=nextHistory;save();filters();stats();start();$('import-status').textContent=`${questions.length}問を取り込みました。`;
  }catch(e){$('import-status').textContent=`取り込みできませんでした：${e.message}`;}finally{$('file').value='';}
};
try {
  const cached=localStorage.getItem('doboku-study-v1');
  if(cached){const data=JSON.parse(cached);questions=importData(data);history=validateHistory(data.history,questions);}
}catch{$('import-status').textContent='保存済みデータを読み込めませんでした。バックアップから復元できます。';}
async function loadBuiltin() {const res=await fetch('./past-exams.json');if(!res.ok)throw new Error('過去問データを取得できませんでした。');return importData(await res.json());}
$('builtin').onclick=async()=>{try{questions=mergeQuestions(questions,await loadBuiltin());save();filters();stats();start();$('import-status').textContent='収録過去問を追加しました。既存の問題と学習履歴は保持しています。';}catch(e){$('import-status').textContent=e.message;}};
if(!questions.length){try{questions=await loadBuiltin();}catch(e){$('import-status').textContent=e.message;}}
filters();stats();start();
