import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

root=Path(__file__).resolve().parents[2]
logs=root/'work/software-main/final-0174'
logs.mkdir(exist_ok=True)
temp=logs/'temp'
temp.mkdir(exist_ok=True)
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
env=dict(os.environ,TEMP=str(temp),TMP=str(temp),PYTHONIOENCODING='utf-8')
commands=[
 ['python','src/desktop/build.py','--package-only'],
 ['python','src/desktop/build-installer.py'],
 ['python','src/build.py'],
 ['python','src/desktop/build.py','--package-only'],
 ['node','work/software-main/verify-portable.cjs'],
 ['node','work/software-main/verify-onboarding.cjs'],
 ['node','work/panel-desktop/verify.cjs'],
 ['node','work/software-main/verify.cjs'],
 ['node','work/native-video/verify.cjs'],
 ['node','work/software-main/verify-library.cjs'],
 ['node','work/installer/verify-cleanup.cjs'],
 ['node','work/tests/verify.cjs'],
 ['node','work/backup/verify.cjs'],
 ['node','work/page-isolation/verify.cjs'],
 ['C:/Users/cx/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe','-NoProfile','-File','work/installer/verify.ps1'],
 ['python','work/verify-package.py'],
 ['python','work/native-video/verify-package.py'],
]
start=int(sys.argv[1]) if len(sys.argv)>1 else 1
report=[] if start==1 else json.loads((logs/'run.json').read_text(encoding='utf-8'))['runs'][:start-1]
for index,command in enumerate(commands,1):
    if index<start:continue
    log=logs/f'{index:02}.log'
    print('RUN',index,' '.join(command),flush=True)
    with log.open('w',encoding='utf-8') as stream:
        process=subprocess.run(command,cwd=root,env=env,stdout=stream,stderr=subprocess.STDOUT)
    text=log.read_text(encoding='utf-8',errors='replace')
    print('\n'.join(text.splitlines()[-3:]),flush=True)
    report.append({'command':command,'exitCode':process.returncode,'log':str(log)})
    binary=root/'outputs/点选缩放视频助手/PointResizeVideo.exe'
    record={'version':'0.17.4','timestamp':datetime.now(timezone.utc).isoformat(),'binarySHA256':hashlib.sha256(binary.read_bytes()).hexdigest(),'runs':report}
    (logs/'run.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    if process.returncode:
        print('\n'.join(text.splitlines()[-30:]),flush=True)
        sys.exit(process.returncode)
print('All final commands passed; native tests executed sequentially.',flush=True)
