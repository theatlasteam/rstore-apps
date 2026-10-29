from pathlib import Path
import sys,json,time,subprocess
P=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(P.parent/'rstore/scripts'));from rdp_client import RDP
subprocess.run(['adb','forward','tcp:6007','localfilesystem:/data/local/debugger-socket'],check=True,stdout=subprocess.DEVNULL)
with RDP() as r:
 a=r.req(r.actor,'getAppActor',manifestURL='app://refresh-weather/manifest.webapp')['actor'];actor=a['consoleActor']
 def ev(s):
  out=r.req(actor,'evaluateJS',text=s)
  if out.get('exception'):raise RuntimeError(str(out.get('exceptionMessage') or out.get('exception')))
  return out.get('result')
 print('START',ev('window.__forecastProbe={status:"pending"};(function(){var x=new XMLHttpRequest({mozSystem:true});x.open("GET",WeatherCore.url({lat:55.75,lon:37.62}),true);x.timeout=20000;x.onerror=function(){__forecastProbe={status:"network-error"};};x.ontimeout=function(){__forecastProbe={status:"timeout"};};x.onload=function(){try{var d=WeatherCore.validate(JSON.parse(x.responseText));__forecastProbe={status:"ok",http:x.status,bytes:x.responseText.length,hours:WeatherCore.hours(d).length,days:d.daily.time.length,temp:WeatherCore.temperature(d.current.temperature_2m,"c")};}catch(e){__forecastProbe={status:"parse-error",error:String(e),http:x.status};}};x.send();})();"Independent public-city probe; no UI navigation or GPS request"'),flush=True)
 for i in range(25):
  v=ev('JSON.stringify(window.__forecastProbe)');d=json.loads(v)
  if d['status']!='pending':print('RESULT',v,flush=True);assert d['status']=='ok';assert d['http']==200;break
  time.sleep(1)
 else:raise RuntimeError('Weather probe still pending')
 print('PHONE UI NOW',ev('JSON.stringify({page:document.body.className,hasForecast:!!document.querySelector(".temperature"),iconLoad:Array.prototype.map.call(document.images,function(i){return i.complete&&i.naturalWidth>0;})})'),flush=True)
 ev('delete window.__forecastProbe;"Probe cleaned"')
print('PASS real Gecko forecast HTTPS + API parsing; GPS hardware not tested, user UI/data left untouched.',flush=True)
