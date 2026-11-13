from pathlib import Path
p=Path(__file__).with_name('verify-onboarding.cjs');s=p.read_text(encoding='utf-8')
old="assert(fs.existsSync(path.join(home,'test-data/pairing.json')),JSON.stringify({invitation,files:fs.readdirSync(path.join(home,'test-data'))}));"
new="await until(()=>{try{return JSON.parse(fs.readFileSync(path.join(home,'test-data/pairing.json'))).attemptId===invitation.attemptId;}catch{return false;}});"
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf-8')
p=Path(__file__).with_name('create-report-0185.py');s=p.read_text(encoding='utf-8').replace("'checks',36)","'checks',37)").replace('total==384','total==385');p.write_text(s,encoding='utf-8')
