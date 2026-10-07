"""Build verified answer/page metadata. PDFs are read from a local cache, not redistributed.
Requires Python 3, pymupdf and pdftotext. Use --cache /path/to/downloaded/pdfs.
"""
import argparse, hashlib, json, pathlib, re, subprocess, unicodedata
import pymupdf
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--cache',type=pathlib.Path,required=True);args=parser.parse_args()
rows=json.loads((root/'scripts/source-index.json').read_text())
questions=[];report=[]
# 2021 scanned original: transcribed and visually checked against its red answer rows.
manual=[
[3,2,4,2,4,1,3,3,1,2,3,4,3,3,1,2,2,3,1,2,4,3,1,3,3,4,4,1,3,1,4,2,1,4,2,3,2,1,2,1,4,3,1,2,1,2,4,1,2,4,1,4,3,4,3,1,4,3,2,3,2],
[2,1,2,1,3,2,2,3,1,4,2,1,1,4,4,3,1,4,3,4,3,2,3,4,3,1,2,2,4,1,2,1,2,4,3]]
for i,row in enumerate(rows[:9]):
 if i==5:
  answers=manual
 else:
  text=unicodedata.normalize('NFKC',subprocess.check_output(['pdftotext','-layout',str(args.cache/f'{i}-2.pdf'),'-']).decode())
  numeric=[]
  for line in text.splitlines():
   nums=[int(n) for n in re.findall(r'\b\d+\b',line)]
   if len(nums)>=13 and not re.search(r'No\.|http|まで|うち|~',line):numeric.append(nums)
  assert len(numeric)==10,(row['year'],numeric)
  answers=[sum([numeric[k] for k in [1,3,5]],[]),sum([numeric[k] for k in [7,9]],[])]
  for group,pairs in enumerate([[0,2,4],[6,8]]):
   numbering=sum([numeric[k] for k in pairs],[])
   assert numbering==list(range(1,len(answers[group])+1)),(row['year'],'answer numbering')
 for j,group in enumerate(answers):
  assert all(a in [1,2,3,4] for a in group)
  doc=pymupdf.open(args.cache/f'{i}-{j}.pdf');pages={}
  for p in doc:
   text=unicodedata.normalize('NFKC',p.get_text())
   for m in re.finditer(r'【No\.\s*(\d+)\s*】',text):
    n=int(m[1]);assert n not in pages,(row['year'],j,n,'duplicate');pages[n]=p.number+1
  assert sorted(pages)==list(range(1,len(group)+1)),(row['year'],j,'question/answer mismatch')
  exam=('1級・第一次検定' if i<=5 else '1級・学科試験')+'・問題'+('A' if j==0 else 'B')
  for n,a in enumerate(group,1):
   questions.append({'year':row['year'],'exam':exam,'number':str(n),'text':f'原本PDFの問{n}を解いてください。','choices':[f'原本の選択肢 {c}' for c in range(1,5)],'answer':a,'category':'問題'+('A' if j==0 else 'B'),'explanation':'掲載されている正答表に基づいて採点しています。原本に解説は掲載されていません。','source':'全国建設研修センター（どぼくじら.com掲載PDF）','pdfUrl':row['urls'][j],'pdfPage':pages[n],'answerUrl':row['urls'][2]})
 report.append({'year':row['year'],'counts':[len(g) for g in answers],'answerMethod':'manual-visual' if i==5 else 'text-table','sha256':[hashlib.sha256((args.cache/f'{i}-{j}.pdf').read_bytes()).hexdigest() for j in range(3)]})
(root/'past-exams.json').write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n')
(root/'scripts/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'{len(questions)} questions across {len(report)} years: validated answer numbering and all PDF question headings.')
