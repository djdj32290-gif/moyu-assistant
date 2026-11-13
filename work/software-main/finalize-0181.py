from pathlib import Path
import subprocess,json,os,sys
root=Path(__file__).resolve().parents[2];logs=root/'work/software-main/final-0181'
record=json.loads((logs/'run.json').read_text(encoding='utf-8'));assert len(record['runs'])==14 and all(x['exitCode']==0 for x in record['runs'])
# Correct step references in explanatory text only; executable/runtime behavior
# is unchanged. Recheck both affected visible onboarding surfaces afterwards.
p=root/'src/setup.js';s=p.read_text(encoding='utf-8').replace('第②步','第③步');p.write_text(s,encoding='utf-8')
p=root/'work/software-main/verify-moyu.cjs';s=p.read_text(encoding='utf-8').replace("await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-未连接设置-0.18.1.png')});", "await until(()=>ui.locator('#dock').getAttribute('aria-pressed').then(s=>s==='true'));await sleep(200);await panel.screenshot({path:path.join(root,'outputs/摸鱼助手-未连接设置-0.18.1.png')});");p.write_text(s,encoding='utf-8')
env=dict(os.environ,TEMP=str(logs/'temp'),TMP=str(logs/'temp'),PYTHONIOENCODING='utf-8');runs=[]
commands=[['python','src/desktop/build.py','--package-only'],['python','src/desktop/build-installer.py'],['python','src/build.py'],['python','src/desktop/build.py','--package-only'],['node','work/software-main/verify-moyu.cjs'],['node','work/software-main/verify-onboarding.cjs'],['python','work/software-main/run-final-0181.py','12']]
for index,command in enumerate(commands,1):
 log=logs/f'finalize-{index}.log';print('FINALIZE',' '.join(command),flush=True)
 with log.open('w',encoding='utf-8') as stream:result=subprocess.run(command,cwd=root,env=env,stdout=stream,stderr=subprocess.STDOUT)
 print('\n'.join(log.read_text(encoding='utf-8',errors='replace').splitlines()[-3:]),flush=True)
 runs.append({'command':command,'exitCode':result.returncode,'log':str(log)})
 if result.returncode:sys.exit(result.returncode)
record=json.loads((logs/'run.json').read_text(encoding='utf-8'));record['additionalRuns']=runs;(logs/'run.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print('Final text, screenshots and package checks passed.',flush=True)
