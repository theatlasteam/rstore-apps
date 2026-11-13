#!/usr/bin/env python3
"""Build and stage the explicitly requested experimental Refresh Mail listing."""
import base64, hashlib, json, shutil, subprocess, time
from pathlib import Path
root=Path(__file__).resolve().parent.parent
project=root/'projects/refresh-mail'
subprocess.run(['python3',str(project/'scripts/package.py')],check=True,cwd=root)
package=project/'dist/refresh-mail-preview.zip'
data=package.read_bytes(); sha=hashlib.sha256(data).hexdigest()
folder=root/'apps/refresh-mail';folder.mkdir(parents=True,exist_ok=True)
shutil.copyfile(package,folder/'application.zip')
shutil.copyfile(project/'app/manifest.webapp',folder/'manifest.webapp')
shutil.copyfile(project/'app/LICENSE',folder/'LICENSE')
shutil.copyfile(project/'app/THIRD-PARTY-NOTICES',folder/'THIRD-PARTY-NOTICES')
icons=json.loads((project/'scripts/icons.json').read_text());(folder/'icon.png').write_bytes(base64.b64decode(icons['128']))
manifest=json.loads((folder/'manifest.webapp').read_text())
base='https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/apps/refresh-mail/'
app={'slug':'refresh-mail','name':'Refresh Mail','description':'Experimental read-only Gmail client using a Google app password. Direct IMAP over TLS. No sending or attachments yet; not tested on a real phone.', 'icon':base+'icon.png','git_repo':'https://github.com/theatlasteam/rstore-apps/tree/main/projects/refresh-mail','download':{'url':base+'application.zip','manifest':base+'manifest.webapp'},'type':'privileged','license':'MIT (code); bundled fonts retain their licences','author':['Atlas Messenger'],'maintainer':['Atlas Messenger'],'has_ads':False,'has_tracking':False,'meta':{'tags':'refresh;mail;gmail;imap;preview','categories':['utility']},'screenshots':[],'sha256':sha,'packageBytes':len(data),'version':manifest['version'],'permissions':list(manifest['permissions']),'runtimeTested':False,'requiresRoot':False,'manualOnly':False,'installSupported':True,'locales':{'ru':{'name':'Refresh Mail','description':'Экспериментальная почта Gmail: чтение 20 последних писем через пароль приложения, подключение к Gmail напрямую по TLS. Отправки и вложений пока нет. На телефоне не проверена.'},'en':{'description':'Experimental read-only Gmail client using an app password. Direct IMAP over TLS; no sending or attachments yet. Not tested on a real phone.'}},'installationNotes':{'ru':'Нужны Gmail и пароль приложения Google с двухэтапной аутентификацией. Пароль не сохраняется. Предварительная версия, на устройстве не проверена.','en':'Requires Gmail and a Google app password with two-step verification. Password is not saved. Preview; not tested on device.'}}
catalog_path=root/'catalog.json';catalog=json.loads(catalog_path.read_text());catalog['apps']=[a for a in catalog['apps'] if a['slug']!='refresh-mail']+[app];catalog['generated_at']=int(time.time());catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
source={'upstream':'https://github.com/theatlasteam/rstore-apps/tree/main/projects/refresh-mail','upstreamLicense':'https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/projects/refresh-mail/app/LICENSE','sha256':sha,'packageBytes':len(data),'licenseNotes':'MIT for app code; shared Refresh runtime and bundled fonts retain their licences, included in the package.','tests':'Mock IMAP and MIME checks only; not tested with a live Gmail account or real KaiOS device.'}
(folder/'source.json').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
print('Staged refresh-mail:',len(data),'bytes, SHA-256',sha)
