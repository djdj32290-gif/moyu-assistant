"""Read MSI metadata with Windows Installer's read-only database API; never install."""
from pathlib import Path
import ctypes
from ctypes import wintypes as w
import hashlib
import json

root = Path(__file__).resolve().parents[2]
info = json.loads((root / 'work/installer/build-manifest.json').read_text(encoding='utf-8'))
api = ctypes.WinDLL('msi.dll')
handle = w.UINT
for name, args in {
    'MsiOpenDatabaseW': [w.LPCWSTR, w.LPCWSTR, ctypes.POINTER(handle)],
    'MsiDatabaseOpenViewW': [handle, w.LPCWSTR, ctypes.POINTER(handle)],
    'MsiViewExecute': [handle, handle],
    'MsiViewFetch': [handle, ctypes.POINTER(handle)],
    'MsiRecordGetStringW': [handle, w.UINT, w.LPWSTR, ctypes.POINTER(w.DWORD)],
    'MsiCloseHandle': [handle],
}.items():
    fn = getattr(api, name)
    fn.argtypes, fn.restype = args, w.UINT

def ok(code):
    if code:
        raise OSError(code, 'MSI database read failed')

db = handle()
ok(api.MsiOpenDatabaseW(info['msi'], None, ctypes.byref(db)))

def rows(sql, fields=1):
    view = handle()
    ok(api.MsiDatabaseOpenViewW(db, sql, ctypes.byref(view)))
    result = []
    try:
        ok(api.MsiViewExecute(view, 0))
        while True:
            record = handle()
            code = api.MsiViewFetch(view, ctypes.byref(record))
            if code == 259:
                break
            ok(code)
            try:
                values = []
                for field in range(1, fields + 1):
                    length = w.DWORD(32768)
                    text = ctypes.create_unicode_buffer(length.value)
                    ok(api.MsiRecordGetStringW(record, field, text, ctypes.byref(length)))
                    values.append(text.value)
                result.append(values)
            finally:
                api.MsiCloseHandle(record)
        return result
    finally:
        api.MsiCloseHandle(view)

checks = []
try:
    props = dict(rows('SELECT `Property`, `Value` FROM `Property`', 2))
    assert props['ProductVersion'] == info['version'] == json.loads((root / 'src/manifest.json').read_text(encoding='utf-8'))['version']
    assert props['ProductCode'].strip('{}').upper() == info['productCode'].strip('{}').upper()
    checks.append('Embedded MSI version and product code match the current extension build')
    assert not props.get('ALLUSERS')
    checks.append('MSI remains per-user, with no ALLUSERS machine-wide installation property')
    assert len(rows('SELECT `File` FROM `File`')) == len(info['files']) == 14
    checks.append('MSI includes exactly the existing 14 runtime, guide and license files')
    tables = {row[0] for row in rows('SELECT `Name` FROM `_Tables`')}
    assert not tables.intersection({'ServiceInstall', 'ServiceControl', 'LockPermissions', 'MsiLockPermissionsEx'})
    checks.append('MSI has no service or system permission modification tables')
    payload = root / 'outputs/点选缩放/installer/PointResizeVideo.msi'
    assert hashlib.sha256(payload.read_bytes()).hexdigest() == info['msiSHA256']
    assert payload.read_bytes() == Path(info['msi']).read_bytes()
    checks.append('Embedded MSI bytes and SHA-256 match the generated installation package')
finally:
    api.MsiCloseHandle(db)

result = {'version': info['version'], 'passed': len(checks), 'checks': checks,
          'scope': 'Read-only MSI metadata and package hashing; no installation, registration, launch, or machine policy changes.',
          'unsignedScript': 'Existing work/installer/verify.ps1 was blocked by PowerShell signature policy; policy was not changed.'}
(Path(__file__).parent / 'msi-verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print('Read-only MSI checks passed:', len(checks))
