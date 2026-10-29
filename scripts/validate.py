#!/usr/bin/env python3
"""Validate mirrored package integrity, licensing metadata and manifests."""
from pathlib import Path
import hashlib, json, zipfile
ROOT=Path(__file__).resolve().parent.parent
catalog=json.loads((ROOT/'catalog.json').read_text())
assert catalog['version']==2
seen=set()
for app in catalog['apps']:
 slug=app['slug'];assert slug not in seen;seen.add(slug)
 folder=ROOT/'apps'/slug
 data=(folder/'application.zip').read_bytes()
 assert hashlib.sha256(data).hexdigest()==app['sha256'],slug+': checksum mismatch'
 assert len(data)==app['packageBytes'] and len(data)<=12*1024*1024
 assert (folder/'LICENSE').stat().st_size>20
 source=json.loads((folder/'source.json').read_text())
 assert source['sha256']==app['sha256'] and source['upstreamLicense'].startswith('https://')
 assert app['download']['url']==f'https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/apps/{slug}/application.zip'
 with zipfile.ZipFile(folder/'application.zip') as archive:
  assert archive.testzip() is None
  assert sum(i.file_size for i in archive.infolist())<=32*1024*1024
  manifest=json.loads(archive.read('manifest.webapp'))
  assert manifest==json.loads((folder/'manifest.webapp').read_text())
  assert manifest.get('type','web') in ['web','privileged']
  assert manifest['name'] and manifest.get('launch_path','/index.html').lstrip('/').split('?')[0] in archive.namelist()
 print('PASS',slug,len(data),'bytes')
print('PASS',len(seen),'mirrored packages')
