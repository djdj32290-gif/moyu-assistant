from pathlib import Path
p=Path(__file__).with_name('verify-live-data.cjs');s=p.read_text(encoding='utf-8');marker="fs.writeFileSync(path.join(__dirname,'live-data-verification.json')"
assert marker in s
s=s.replace(marker,Path(__file__).with_name('live-resolver-checks-0185.inc').read_text(encoding='utf-8')+'\n'+marker)
s=s.replace("const fs=require", "(async()=>{\nconst fs=require",1)+"\n})().catch(error=>{console.error(error);process.exitCode=1;});\n"
Path(__file__).with_name('verify-capture-data.cjs').write_text(s,encoding='utf-8')
p=Path(__file__).with_name('run-final-0185.py');s=p.read_text(encoding='utf-8').replace('verify-live-data.cjs','verify-capture-data.cjs');p.write_text(s,encoding='utf-8')
