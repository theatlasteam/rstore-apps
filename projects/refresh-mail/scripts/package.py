#!/usr/bin/env python3
"""Build preview package without changing the public store catalog."""
import base64, json, shutil, tempfile, zipfile, hashlib
from pathlib import Path
p=Path(__file__).resolve().parent.parent
repo=p.parent.parent
out=p/'dist'; out.mkdir(exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
 root=Path(tmp)/'app'; shutil.copytree(p/'app',root,ignore=shutil.ignore_patterns('kaios-refresh-v2','icons'))
 shutil.copytree(repo/'projects/refresh-connect/app/kaios-refresh-v2',root/'kaios-refresh-v2')
 (root/'icons').mkdir()
 for size,data in json.loads((p/'scripts/icons.json').read_text()).items(): (root/'icons'/('icon-'+size+'.png')).write_bytes(base64.b64decode(data))
 archive=out/'refresh-mail-preview.zip'
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
  for f in sorted(root.rglob('*')):
   if f.is_file():
    info=zipfile.ZipInfo(f.relative_to(root).as_posix(),(2026,11,11,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,f.read_bytes())
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None
  manifest=json.loads(z.read('manifest.webapp'))
  assert all(path.lstrip('/') in z.namelist() for path in manifest['icons'].values())
  assert 'index.html' in z.namelist()
 data=archive.read_bytes();print('Package:',archive,'bytes:',len(data),'SHA-256:',hashlib.sha256(data).hexdigest())
