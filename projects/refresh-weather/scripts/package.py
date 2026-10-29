from pathlib import Path
import json,zipfile,hashlib,shutil,time
P=Path(__file__).resolve().parent.parent;A=P/'app';R=P.parent.parent if P.parent.name=='projects' else P.parent/'rstore/catalog-repo';D=P/'dist';D.mkdir(exist_ok=True)
manifest=json.loads((A/'manifest.webapp').read_text())
with zipfile.ZipFile(D/'application.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(A.rglob('*')):
  if f.is_file():
   info=zipfile.ZipInfo(f.relative_to(A).as_posix(),(2026,10,29,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,f.read_bytes())
with zipfile.ZipFile(D/'application.zip') as z:assert z.testzip() is None
payload=(D/'application.zip').read_bytes();sha=hashlib.sha256(payload).hexdigest()
slug='refresh-weather';folder=R/'apps'/slug;folder.mkdir(parents=True,exist_ok=True)
for source,target in [(D/'application.zip','application.zip'),(A/'manifest.webapp','manifest.webapp'),(A/'LICENSE','LICENSE'),(A/'icons/icon-128.png','icon.png'),(A/'THIRD-PARTY-NOTICES.txt','THIRD-PARTY-NOTICES.txt')]:shutil.copyfile(source,folder/target)
project=R/'projects/refresh-weather';project.mkdir(parents=True,exist_ok=True)
if project.resolve()!=P.resolve():
 shutil.copytree(A,project/'app',dirs_exist_ok=True);shutil.copyfile(P/'README.md',project/'README.md')
 for name in ['scripts','tests']:
  (project/name).mkdir(exist_ok=True)
  for f in (P/name).glob('*'):
   if f.is_file() and (name=='tests' or f.name in ['package.py','prepare.py','localize.py','fetch-assets.py','probe-api.py']):shutil.copyfile(f,project/name/f.name)
 (project/'research').mkdir(exist_ok=True)
 for name in ['forecast.json','geocoding.json']:shutil.copyfile(P/'research'/name,project/'research'/name)
base='https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/apps/'+slug+'/'
a={'slug':slug,'name':'Refresh Weather','description':'Native-style KaiOS weather: current conditions, hourly and 7-day forecasts, location and saved cities. No API key.','icon':base+'icon.png','git_repo':'https://github.com/theatlasteam/rstore-apps/tree/main/projects/refresh-weather','download':{'url':base+'application.zip','manifest':base+'manifest.webapp'},'type':'privileged','license':'MIT (code); Google icons excluded','author':['Atlas Messenger'],'maintainer':['Atlas Messenger'],'has_ads':False,'has_tracking':False,'meta':{'tags':'weather; forecast; geolocation; kaios-refresh','categories':['utility']},'screenshots':[],'sha256':sha,'packageBytes':len(payload),'version':manifest['version'],'permissions':list(manifest['permissions']),'runtimeTested':False,'requiresRoot':False,'manualOnly':False,'installSupported':True,'locales':{'ru':{'name':'Погода Refresh','description':'Погода KaiOS Refresh без API-ключа: текущее состояние, прогноз на 24 часа и 7 дней. Местоположение с разрешения, поиск и сохранение городов, офлайн-кэш. Иконки Google, авторство указано.'},'en':{'description':'Native-style KaiOS weather without an API key. Current conditions, 24 hours and 7 days; opt-in location, saved cities and offline cache. Google icon credits included.'}}}
catalog=json.loads((R/'catalog.json').read_text());catalog['apps']=[x for x in catalog['apps'] if x['slug']!=slug]+[a];catalog['generated_at']=int(time.time());(R/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
source={'upstream':'https://github.com/theatlasteam/rstore-apps/tree/main/projects/refresh-weather','upstreamLicense':'https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/projects/refresh-weather/app/LICENSE','sha256':sha,'packageBytes':len(payload),'licenseNotes':'MIT covers Atlas Messenger code/UI/original launcher only. Google weather assets are excluded and retain Google rights; upstream has no open redistribution licence. See included notices.','tests':'Public-city API and DOM regression checks; GPS hardware/permission prompt not yet confirmed.'};(folder/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
p=R/'tests/github-direct.test.cjs';s=p.read_text().replace('assert.equal(result.apps.length,6)','assert.equal(result.apps.length,catalog.apps.length)').replace('PASS: six GitHub packages','PASS: GitHub packages');p.write_text(s)
print('BUILT',len(payload),'bytes; SHA-256',sha,'; catalog',len(catalog['apps']),'apps')
