from pathlib import Path
import subprocess,json,os,hashlib,sys
from datetime import datetime,timezone
root=Path(__file__).resolve().parents[2];folder=root/'work/software-main/final-0183';record=folder/'run.json'
report=json.loads(record.read_text(encoding='utf-8'));assert len(report['runs'])==17 and all(r['exitCode']==0 for r in report['runs'])
digest=hashlib.sha256((root/'outputs/点选缩放视频助手/PointResizeVideo.exe').read_bytes()).hexdigest();assert digest==report['binarySHA256']
log=Path(report['runs'][0]['log']);env=dict(os.environ,TEMP=str(folder/'temp'),TMP=str(folder/'temp'),PYTHONIOENCODING='utf-8')
with log.open('w',encoding='utf-8') as stream:process=subprocess.run(report['runs'][0]['command'],cwd=root,env=env,stdout=stream,stderr=subprocess.STDOUT)
report['runs'][0]['exitCode']=process.returncode;report['timestamp']=datetime.now(timezone.utc).isoformat();record.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8',errors='replace');print(log.read_text(encoding='utf-8'));sys.exit(process.returncode)
