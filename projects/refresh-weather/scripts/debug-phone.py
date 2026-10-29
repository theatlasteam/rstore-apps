from pathlib import Path
import sys,json,time
P=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(P.parent/'rstore/scripts'));from rdp_client import RDP
with RDP() as r:
 a=r.req(r.actor,'getAppActor',manifestURL='app://refresh-weather/manifest.webapp')['actor'];actor=a['consoleActor']
 def ev(s):
  v=r.req(actor,'evaluateJS',text=s);print(json.dumps(v,ensure_ascii=False),flush=True)
 ev('JSON.stringify({text:document.body.textContent,core:typeof WeatherCore,storage:localStorage.getItem("weather.places")})')
 try:print('CACHED ERRORS',json.dumps(r.req(actor,'getCachedMessages',messageTypes=['PageError']),ensure_ascii=False),flush=True)
 except Exception as e:print('Error read:',e,flush=True)
 ev('window.__errors=[];window.addEventListener("error",function(e){window.__errors.push({message:e.message,line:e.lineno,file:e.filename});});"Attached error recorder"')
 ev('document.getElementById("center").click();"Retry forecast"')
 time.sleep(3)
 ev('JSON.stringify({text:document.body.textContent,errors:window.__errors,last:localStorage.getItem("weather.last")})')
