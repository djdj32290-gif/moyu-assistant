from pathlib import Path
import re,json,hashlib,zipfile
root=Path(__file__).resolve().parents[2];src=root/'src';base=root/'work/moyu-0187-baseline/src'
changed=[]
for p in src.rglob('*'):
 if not p.is_file():continue
 name=p.relative_to(src).as_posix();old=base/name
 assert old.exists(),name
 if p.read_bytes()==old.read_bytes():continue
 if p.suffix in {'.json','.cs','.md','.py','.js'} and old.read_text(encoding='utf-8-sig').replace('0.18.6','0.18.7')==p.read_text(encoding='utf-8-sig'):continue
 changed.append(name)
assert sorted(changed)==['desktop/这个文件夹是什么.md','panel.js'],changed
css=lambda p:re.search(r'const BUTTON_CSS = `([\s\S]*?)`;',p.read_text(encoding='utf-8')).group(1)
assert css(src/'panel.js')==css(base/'panel.js')
record=json.loads((root/'work/native-video/portable-build-manifest.json').read_text(encoding='utf-8-sig'));assert record['version']=='0.18.7'
package=root/'outputs/摸鱼助手-免安装版-0.18.7.zip'
with zipfile.ZipFile(package) as z:
 assert len(z.namelist())==65 and z.testzip() is None
 for name,value in record['files'].items():assert hashlib.sha256(z.read('摸鱼助手/'+name)).hexdigest()==value
 for name,value in record['rootFiles'].items():assert hashlib.sha256(z.read(name)).hexdigest()==value
report={'version':'0.18.7','changesBeyondVersion':changed,'sharedButtonCSSUnchanged':True,'permissionsLibraryPlayerPairingUnchanged':True,'packageSHA256':hashlib.sha256(package.read_bytes()).hexdigest(),'sourceSHA256':hashlib.sha256((src/'panel.js').read_bytes()).hexdigest()}
(root/'work/software-main/source-review-0187.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('Reviewed: pointer behavior and README only; 65-file ZIP hashes match; permissions, CSS, canonical library and native player unchanged')
