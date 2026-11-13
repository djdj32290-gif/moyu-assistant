from pathlib import Path
import hashlib,json,os,subprocess,sys
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[2]
logs=root/'work/software-main/final-0174'
env=dict(os.environ,TEMP=str(logs/'temp'),TMP=str(logs/'temp'))
command=['node','work/native-video/verify.cjs']
result=subprocess.run(command,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
log=logs/'09-driver-recheck.log'
log.write_bytes(result.stdout)
record=json.loads((logs/'run.json').read_text(encoding='utf-8'))
assert hashlib.sha256((root/'outputs/点选缩放视频助手/PointResizeVideo.exe').read_bytes()).hexdigest()==record['binarySHA256']
record['additionalRuns']=[{'command':command,'exitCode':result.returncode,'log':str(log),'reason':'Existing PowerShell 7 test driver, without an execution-policy override'}]
record['timestamp']=datetime.now(timezone.utc).isoformat()
(logs/'run.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
print('\n'.join(result.stdout.decode('utf-8',errors='replace').splitlines()[-(30 if result.returncode else 4):]))
sys.exit(result.returncode)
