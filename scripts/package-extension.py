#!/usr/bin/env python3
"""Build the unpacked extension and reproducible Web Store ZIP from a strict allowlist."""
from hashlib import sha256
from pathlib import Path
import json
import shutil
import zipfile

root = Path(__file__).resolve().parents[1]
source = root / 'extension'
manifest = json.loads((source / 'manifest.json').read_text())
version = manifest['version']
name = f'for-teacher-ai-neis-uploader-v{version}'
files = ['manifest.json', 'config.js', 'bridge-content.js', 'popup.html', 'popup.css', 'popup.js',
         'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png']
assert manifest['host_permissions'] == ['https://for-teacher-ai.vercel.app/*']
assert manifest['permissions'] == ['activeTab', 'scripting', 'storage', 'clipboardRead', 'tabs']
assert 'https://for-teacher-ai.vercel.app' in (source / 'config.js').read_text()
for path in files:
    assert (source / path).is_file(), path
unpacked = root / 'dist' / name
release = root / 'dist' / 'releases' / f'neis-uploader-v{version}'
release.mkdir(parents=True, exist_ok=True)
# Remove obsolete files only from this version's generated unpacked directory.
if unpacked.exists():
    shutil.rmtree(unpacked)
for path in files:
    destination = unpacked / path
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / path, destination)
archive = release / f'{name}.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
    for path in files:
        info = zipfile.ZipInfo(path, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        bundle.writestr(info, (source / path).read_bytes())
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    assert set(bundle.namelist()) == set(files)
    assert json.loads(bundle.read('manifest.json'))['version'] == version
    for path in files:
        assert bundle.read(path) == (source / path).read_bytes()
digest = sha256(archive.read_bytes()).hexdigest()
(release / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
print(f'{archive}\n{len(files)} files, {archive.stat().st_size} bytes\nSHA256 {digest}')
