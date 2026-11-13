from pathlib import Path
root=Path(__file__).resolve().parents[2];s=(root/'work/software-main/run-final-0183.py').read_text(encoding='utf-8').replace('0183','0184').replace('0.18.3','0.18.4').replace("['node','work/software-main/verify-cycle.cjs']","['node','work/software-main/verify-live-data.cjs'],\n ['node','work/software-main/verify-sidebar-live.cjs']")
(root/'work/software-main/run-final-0184.py').write_text(s,encoding='utf-8')
