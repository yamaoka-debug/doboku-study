"""Create a static hosting bundle without Git metadata, scripts, or source PDFs."""
from pathlib import Path
import shutil, zipfile
root=Path(__file__).resolve().parents[1]
out=root/'dist'
out.mkdir(exist_ok=True)
files=['index.html','style.css','app.js','model.js','mobile.js','past-exams.json','manifest.webmanifest','sw.js']
files += [str(p.relative_to(root)) for p in (root/'icons').glob('*.png')]
for name in files:
    target=out/name
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(root/name,target)
archive=root/'doboku-study-mobile.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for name in files:z.write(out/name,name)
print(f'Static site: {out}\nHosting bundle: {archive}')
