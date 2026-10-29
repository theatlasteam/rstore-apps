from pathlib import Path
import subprocess as sp,urllib.request,json,hashlib,sys,time
P=Path(__file__).resolve().parent.parent;R=P.parent/'rstore'
sp.run(['adb','forward','tcp:17892','tcp:17891'],check=True)
key=(R/'dist/device.key').read_text().strip()
def call(path,data=None):
 req=urllib.request.Request('http://127.0.0.1:17892'+path,data=data,headers={'X-RStore-Key':key,'Origin':'app://rstore',**({'Content-Type':'application/zip'} if data else {})},method='POST' if data else 'GET')
 with urllib.request.urlopen(req,timeout=100) as res:return json.load(res)
print('Local installer ready:',call('/health').get('ready'),flush=True)
print('Install result:',call('/install/refresh-weather',(P/'dist/application.zip').read_bytes()),flush=True)
print('Launch result:',call('/launch/refresh-weather',b'{}'),flush=True)
(P/'dist/installed.json').write_text(json.dumps({'origin':'app://refresh-weather','sha256':hashlib.sha256((P/'dist/application.zip').read_bytes()).hexdigest(),'time':time.time()},indent=2)+'\n')
print('Installed and launched independent Weather; system RStore and stock apps untouched.',flush=True)
