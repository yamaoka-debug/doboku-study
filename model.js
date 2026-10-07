export const key = q => JSON.stringify([q.year, q.exam, q.number]);
export function validateQuestions(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('問題がありません。');
  const seen = new Set();
  return rows.map((q, i) => {
    if (!q || !['year','exam','number','text'].every(k => typeof q[k] === 'string' && q[k].trim()) || !Array.isArray(q.choices) || q.choices.length < 2 || !q.choices.every(c => typeof c === 'string' && c.trim())) throw new Error(`${i+1}件目の問題形式が不正です。`);
    if (!Number.isInteger(q.answer) || q.answer < 1 || q.answer > q.choices.length) throw new Error(`${i+1}件目の正答番号が不正です。`);
    if (seen.has(key(q))) throw new Error(`${i+1}件目の年度・試験・問題番号が重複しています。`);
    for (const field of ['pdfUrl','answerUrl']) {
      if (q[field] !== undefined && !isSafePdfUrl(q[field])) throw new Error(`${i+1}件目のPDFのURLが不正です。`);
    }
    if (q.pdfUrl && (!Number.isInteger(q.pdfPage) || q.pdfPage < 1)) throw new Error(`${i+1}件目のPDFページ番号が不正です。`);
    seen.add(key(q));
    return {...q, explanation: typeof q.explanation === 'string' ? q.explanation : '', category: typeof q.category === 'string' ? q.category : '未分類', source: typeof q.source === 'string' ? q.source : ''};
  });
}
export function isSafePdfUrl(value) {
  try { const u=new URL(value); return u.protocol==='https:' && u.hostname==='dobokujira.com' && !u.username && !u.password && !u.port && /^\/wp-content\/uploads\/.+\.pdf$/i.test(u.pathname); } catch { return false; }
}
export function mergeQuestions(existing, added) {
  const merged=new Map(existing.map(q=>[key(q),q]));
  for (const q of added) merged.set(key(q),q);
  return validateQuestions([...merged.values()]);
}
export function importData(data) {
  if (Array.isArray(data)) return validateQuestions(data);
  if (data && Array.isArray(data.questions) && data.answers === undefined) return validateQuestions(data.questions);
  if (!data || !Array.isArray(data.questions) || !Array.isArray(data.answers)) throw new Error('問題配列、または questions と answers を指定してください。');
  const answers = new Map();
  for (const a of data.answers) {
    if (!a || !['year','exam','number'].every(k => typeof a[k] === 'string' && a[k].trim())) throw new Error('解答の識別情報が不正です。');
    if (answers.has(key(a))) throw new Error('解答が重複しています。');
    answers.set(key(a), a);
  }
  const questions = data.questions.map(q => {
    if (!q) throw new Error('問題形式が不正です。');
    const a = answers.get(key(q));
    if (!a) throw new Error(`正答が見つかりません：${q.year} / ${q.exam} / ${q.number}`);
    answers.delete(key(q));
    return {...q, answer:a.answer, explanation:a.explanation ?? q.explanation};
  });
  if (answers.size) throw new Error('対応する問題のない解答があります。');
  return validateQuestions(questions);
}
export function record(history, q, choice) {
  const previous = history[key(q)] ?? {attempts:0, correct:0};
  return {...history, [key(q)]: {attempts:previous.attempts+1, correct:previous.correct+(choice===q.answer ? 1 : 0), lastCorrect:choice===q.answer, at:new Date().toISOString()}};
}
