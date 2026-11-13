from pathlib import Path
import json,subprocess,os,sys
root=Path(__file__).resolve().parents[2];logs=root/'work/software-main/final-0185';env=dict(os.environ,TEMP=str(logs/'temp'),TMP=str(logs/'temp'),PYTHONIOENCODING='utf-8')
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
with (logs/'02.log').open('w',encoding='utf-8') as stream:r=subprocess.run(['node','work/software-main/verify-capture-preview.cjs'],cwd=root,env=env,stdout=stream,stderr=subprocess.STDOUT)
print('\n'.join((logs/'02.log').read_text(encoding='utf-8').splitlines()[-9:]),flush=True)
d=json.loads((logs/'run.json').read_text(encoding='utf-8'));d['runs'][1]['exitCode']=r.returncode;(logs/'run.json').write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8');sys.exit(r.returncode)
