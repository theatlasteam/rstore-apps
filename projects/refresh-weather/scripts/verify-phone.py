from pathlib import Path
import sys,json,time,subprocess
P=Path(__file__).resolve().parent.parent;sys.path.insert(0,str(P.parent/'rstore/scripts'));from rdp_client import RDP
with RDP() as r:
 r.req(r.actor,'launch',manifestURL='app://refresh-weather/manifest.webapp');time.sleep(1)
 a=r.req(r.actor,'getAppActor',manifestURL='app://refresh-weather/manifest.webapp')['actor']
 def evaluate(code):
  out=r.req(a['consoleActor'],'evaluateJS',text=code)
  if out.get('exception'):raise RuntimeError(str(out.get('exceptionMessage') or out.get('exception')))
  return out.get('result')
 print('BOOT',evaluate('JSON.stringify({page:document.body.className,title:document.getElementById("title").textContent,geo:!!navigator.geolocation,cities:localStorage.getItem("weather.places"),last:localStorage.getItem("weather.last"),icons:document.images.length})'),flush=True)
 print('SEARCH',evaluate('(function(){var b=document.querySelectorAll(".action");if(!b.length)return "Not an empty first launch; leaving user data untouched";b[1].click();document.querySelector("input").value="Moscow";document.getElementById("center").click();return "Public city test started";})()'),flush=True)
 for i in range(20):
  data=evaluate('JSON.stringify({page:document.body.className,rows:document.querySelectorAll("main .row").length,text:document.getElementById("content").textContent.slice(0,420)})');d=json.loads(data)
  if d['page']=='results' and d['rows']:
   evaluate('document.querySelector("main .row").click();"Selected public test city"');print('CITY SEARCH PASS',flush=True);break
  if 'error' in evaluate('document.getElementById("content").innerHTML'):
   raise RuntimeError('City search failed: '+data)
  time.sleep(1)
 else:raise RuntimeError('City search did not finish: '+data)
 for i in range(25):
  data=evaluate('JSON.stringify({page:document.body.className,temp:document.querySelector(".temperature")&&document.querySelector(".temperature").textContent,errors:Array.prototype.map.call(document.querySelectorAll(".error"),function(e){return e.textContent;}),icons:Array.prototype.map.call(document.images,function(i){return {loaded:i.complete&&i.naturalWidth>0,src:i.getAttribute("src")};}),cached:!!localStorage.getItem("weather.last")})');d=json.loads(data)
  if d.get('temp') and d.get('cached'):
   assert all(i['loaded'] for i in d['icons']);print('LIVE PHONE FORECAST PASS',data,flush=True);break
  if d.get('errors'):raise RuntimeError('Forecast request failed: '+data)
  time.sleep(1)
 else:raise RuntimeError('Forecast did not finish: '+data)
 print('HOURLY',evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));JSON.stringify({rows:document.querySelectorAll("main .row").length,images:document.images.length,allIconsLoaded:Array.prototype.every.call(document.images,function(i){return i.complete&&i.naturalWidth>0;})})'),flush=True)
 time.sleep(1)
 print('DAILY',evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));JSON.stringify({rows:document.querySelectorAll("main .row").length,tabs:document.getElementById("tabs").children.length})'),flush=True)
 # Clear only this fresh app's test-city data, leaving the welcome screen for the user.
 print('CLEAN TEST DATA',evaluate('(function(){var last=JSON.parse(localStorage.getItem("weather.last"));if(last&&last.name==="Moscow"){localStorage.removeItem("weather.cache."+last.id);localStorage.removeItem("weather.places");localStorage.removeItem("weather.last");location.reload();return "Removed public test city; GPS never requested";}return "Retained user data";})()'),flush=True)
print('No screenshots, no GPS permission bypass, no location hardware claim.',flush=True)
