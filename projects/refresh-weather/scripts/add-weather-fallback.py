from pathlib import Path
import json,shutil,datetime,re
P=Path(__file__).resolve().parent.parent;W=P.parent/'rstore/worker/src/index.js';backup=P.parent/'backups'/('weather-proxy-'+datetime.datetime.now().strftime('%Y%m%d-%H%M%S'));backup.mkdir(parents=True);shutil.copyfile(W,backup/'index.js')
s=W.read_text();anchor='export default {'
helper=r'''// Weather uses a tiny JSON-only fallback, not the RStore package transport.
export async function weatherForecast(u) {
 const latRaw=u.searchParams.get('latitude'),lonRaw=u.searchParams.get('longitude');
 const lat=Number(latRaw),lon=Number(lonRaw);
 if(!latRaw||!lonRaw||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return json({error:'Invalid coordinates'},400);
 const latitude=Math.round(lat*100)/100,longitude=Math.round(lon*100)/100;
 const key=new Request('https://rstore-cache.invalid/weather/v1?latitude='+latitude+'&longitude='+longitude);
 const cache=globalThis.caches?.default;const cached=await cache?.match(key);if(cached)return cached;
 const upstream='https://api.open-meteo.com/v1/forecast?latitude='+latitude+'&longitude='+longitude+'&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto&wind_speed_unit=ms&forecast_days=7&forecast_hours=24';
 const response=await fetch(upstream,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'RefreshWeather/1.0 (+https://github.com/theatlasteam/rstore-apps)'}});
 const bytes=await readLimited(response,12000);const data=JSON.parse(strFromU8(bytes));
 if(!data.current||!data.hourly||!data.daily||!Array.isArray(data.daily.time)||data.daily.time.length!==7)throw new Error('Incomplete weather response');
 const out=new Response(bytes,{headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=600','X-Weather-Source':'Open-Meteo'}});
 if(cache)await cache.put(key,out.clone());return out;
}
'''
assert 'weatherForecast' not in s;s=s.replace(anchor,helper+'\n'+anchor,1);s=s.replace("if(u.pathname==='/health')", "if(u.pathname==='/weather/forecast')return await weatherForecast(u);\n   if(u.pathname==='/health')",1);W.write_text(s);shutil.copyfile(W,P.parent/'rstore/catalog-repo/service/src/index.js')
p=P/'app/app.js';s=p.read_text().replace('function request(url){','function request(url,timeout){').replace('x.timeout=25000','x.timeout=timeout||25000')
anchor=' function load(loc,force)'
helper=r''' function forecastRequest(loc){
  var direct=C.url(loc),proxy='https://rstore.holy-voice-dd33.workers.dev/weather/forecast?latitude='+loc.lat+'&longitude='+loc.lon;
  var first=read('weather.route','direct')==='proxy'?proxy:direct,second=first===direct?proxy:direct;
  function attempt(url,timeout){return request(url,timeout).then(C.validate).then(function(data){try{localStorage.setItem('weather.route',JSON.stringify(url===proxy?'proxy':'direct'));}catch(e){}return data;});}
  return attempt(first,7000).catch(function(){notify(t('fallback'));return attempt(second,15000);});
 }
'''
assert anchor in s;s=s.replace(anchor,'\n'+helper+anchor,1);s=s.replace('request(C.url(loc)).then(C.validate)', 'forecastRequest(loc)');p.write_text(s)
p=P/'app/manifest.webapp';d=json.loads(p.read_text());d['version']='1.0.1';d['csp']=d['csp'].replace('https://api.open-meteo.com https://geocoding-api.open-meteo.com','https://api.open-meteo.com https://geocoding-api.open-meteo.com https://rstore.holy-voice-dd33.workers.dev');p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
dicts={}
for lang in ['ru','en']:
 p=P/'app/locales'/f'{lang}.json';d=json.loads(p.read_text());d['aboutBody']=d['aboutBody'].replace('1.0.0','1.0.1');d['fallback']='Прямой запрос недоступен. Пробуем резервный сервер…' if lang=='ru' else 'Direct request unavailable. Trying the backup server…';d['privacyDetail']+=(' Если прямой запрос недоступен, прогноз запрашивается через наш резервный сервер Cloudflare, который также получает IP и округлённые координаты.' if lang=='ru' else ' If the direct endpoint is unavailable, the forecast uses our Cloudflare fallback server, which also receives your IP and rounded coordinates.');p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');dicts[lang]=d
(P/'app/l10n.js').write_text('window.WEATHER_STRINGS='+json.dumps(dicts,ensure_ascii=False,separators=(',',':'))+';\n')
# Regression coverage for the real network fallback and two-source failure.
p=P/'tests/weather.test.cjs';s=p.read_text().replace("b.requests[0].onerror();await tick();assert(b.d.querySelector", "b.requests[0].onerror();await tick();assert(b.requests[1].url.includes('/weather/forecast'));b.requests[1].onerror();await tick();assert(b.d.querySelector")
s=s.replace("assert(!m.csp.includes('workers.dev'));", "assert(m.csp.includes('https://rstore.holy-voice-dd33.workers.dev'));")
s=s.replace("const english=JSON.parse", "const f=setup();clickText(f,'Add a city'.replace('Add a city','Добавить город'));f.d.querySelector('input').value='Moscow';f.press('Enter');f.requests.shift().respond(geocoding);await tick();f.press('Enter');f.requests.shift().onerror();await tick();assert(f.requests[0].url.includes('/weather/forecast'));f.requests.shift().respond(forecast);await tick();assert(f.d.querySelector('.temperature'));assert.equal(f.w.localStorage.getItem('weather.route'),'\\\"proxy\\\"');f.dom.window.close();\n const english=JSON.parse")
p.write_text(s)
(P/'README.md').write_text((P/'README.md').read_text()+'''\n### Network fallback (1.0.1)\nThe phone's network could reach geocoding and the Worker but not api.open-meteo.com. The app tries the direct endpoint, then a small JSON-only Cloudflare fallback after 7 seconds, and remembers the working route. The fallback validates and rounds coordinates to 0.01 degrees, allows only the fixed Open-Meteo request, limits the response to 12 KB and caches for 10 minutes. Cloudflare also receives the IP/rounded coordinates; this is disclosed in-app. RStore package downloads remain direct GitHub.\n''')
print('Added strict, bounded weather-only fallback; backup:',backup)
