'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM}=require('./tools/node_modules/jsdom'),acorn=require('./tools/node_modules/acorn');
const root=path.resolve(__dirname,'..'),app=path.join(root,'app');
const forecast=JSON.parse(fs.readFileSync(path.join(root,'research/forecast.json'))),geocoding=JSON.parse(fs.readFileSync(path.join(root,'research/geocoding.json')));
function setup(locale='ru-RU',storage={}){
 const dom=new JSDOM(fs.readFileSync(path.join(app,'index.html'),'utf8'),{url:'https://weather.test',runScripts:'outside-only'}),w=dom.window,requests=[],gps=[];
 Object.defineProperty(w.navigator,'language',{value:locale,configurable:true});
 for(const [key,value] of Object.entries(storage))w.localStorage.setItem(key,value);
 w.navigator.geolocation={getCurrentPosition(ok,fail,options){gps.push({ok,fail,options});}};
 class XHR{open(method,url){this.method=method;this.url=url;}send(){requests.push(this);}abort(){this.aborted=true;}respond(data,status=200){this.status=status;this.responseText=JSON.stringify(data);this.onload();}}
 w.XMLHttpRequest=XHR;
 for(const file of ['l10n.js','core.js','app.js']){const source=fs.readFileSync(path.join(app,file),'utf8');acorn.parse(source,{ecmaVersion:5});w.eval(source);}
 return {dom,w,d:w.document,requests,gps,press(key){const target=w.document.activeElement||w.document.body;target.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));},store(){return Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const key=w.localStorage.key(i);return [key,w.localStorage.getItem(key)];}));}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function clickText(ctx,text){const b=Array.from(ctx.d.querySelectorAll('main button')).find(b=>b.textContent.startsWith(text));assert(b,'Missing button '+text);b.click();}
async function test(){
 const a=setup();assert.equal(a.requests.length,0);assert.equal(a.gps.length,0);assert(a.d.body.textContent.includes('Погода рядом'));
 const C=a.w.WeatherCore;assert.equal(C.temperature(null,'c'),'—');assert.equal(C.temperature(0,'f'),'32°');assert.equal(C.temperature(-10,'c'),'-10°');assert.equal(C.rounded(55.75581),55.76);assert(!C.coordinate(NaN,0));assert(!C.coordinate(91,0));assert(!C.parseCoordinates('55,'));assert(C.parseCoordinates('55.75, 37.62'));assert.equal(C.condition(0,false).icon,'clear_night');assert.equal(C.condition(99,true).key,'hail');assert.equal(C.condition(999,true).key,'unknown');
 for(const code of [0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,71,73,75,77,80,81,82,85,86,95,96,97,99])for(const day of [true,false])assert(fs.existsSync(path.join(app,'icons/weather',C.condition(code,day).icon+'.svg')));
 assert.equal(C.validate(forecast),forecast);assert.throws(()=>C.validate({current:{temperature_2m:null}}));const broken=structuredClone(forecast);delete broken.daily.sunrise;assert.throws(()=>C.validate(broken));
 a.press('ArrowDown');a.press('Enter');assert.equal(a.d.body.className,'search');a.d.querySelector('input').value='Москва';a.press('Enter');assert(a.requests[0].url.includes('name=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0'));a.requests.shift().respond(geocoding);await tick();assert(a.d.querySelectorAll('main .row').length>0);
 a.press('Enter');assert(a.requests[0].url.startsWith('https://api.open-meteo.com/'));assert(!a.requests[0].url.includes('apikey'));a.requests.shift().respond(forecast);await tick();assert.equal(a.d.body.className,'forecast');assert(a.d.querySelector('.temperature'));assert.equal(a.d.querySelectorAll('nav button').length,3);
 a.press('ArrowRight');assert.equal(a.d.querySelectorAll('main .row').length,24);a.press('ArrowRight');assert.equal(a.d.querySelectorAll('main .row').length,7);for(let i=0;i<9;i++)a.press('ArrowRight');assert.equal(a.d.querySelectorAll('nav button').length,3);
 a.d.getElementById('right').click();clickText(a,'Единицы');clickText(a,'Фаренгейт');a.press('ArrowRight'); // return to current (the prior tab was daily)
 assert.equal(a.w.localStorage.getItem('weather.unit'),'"f"');assert.equal(a.d.querySelector('.temperature').textContent,C.temperature(forecast.current.temperature_2m,'f'));
 a.d.getElementById('left').click();clickText(a,'По координатам');a.d.querySelector('input').value='999, 20';a.press('Enter');assert(a.d.getElementById('notice').textContent.includes('Введите широту'));
 a.d.querySelector('input').value='55.75, 37.62';a.press('Enter');a.requests.shift().respond(forecast);await tick();assert.equal(JSON.parse(a.w.localStorage.getItem('weather.places')).length,2);
 a.d.getElementById('right').click();clickText(a,'Удалить этот город');a.press('Enter');assert.equal(JSON.parse(a.w.localStorage.getItem('weather.places')).length,2); // default Cancel
 a.d.getElementById('right').click();clickText(a,'Удалить этот город');clickText(a,'Удалить');assert.equal(JSON.parse(a.w.localStorage.getItem('weather.places')).length,1);
 clickText(a,'Моё местоположение');assert.equal(a.gps.length,1);a.gps[0].fail({code:1});assert(a.d.getElementById('notice').textContent.includes('запрещён'));
 clickText(a,'Моё местоположение');a.gps[1].ok({coords:{latitude:55.75581,longitude:37.61733}});assert(a.requests[0].url.includes('latitude=55.76&longitude=37.62'));assert(!a.requests[0].url.includes('55.75581'));a.requests.shift().respond(forecast);await tick();assert.equal(JSON.parse(a.w.localStorage.getItem('weather.last')).lat,55.76);
 const storage=a.store();let cache=JSON.parse(storage['weather.cache.gps']);cache.at=Date.now()-3600000;storage['weather.cache.gps']=JSON.stringify(cache);
 const b=setup('en-US',storage);assert(b.d.body.textContent.includes('Saved forecast'));assert.equal(b.requests.length,1);b.requests[0].onerror();await tick();assert(b.requests[1].url.includes('/weather/forecast'));b.requests[1].onerror();await tick();assert(b.d.querySelector('.temperature'));assert(b.d.body.textContent.includes('Cannot reach'));assert.equal(b.gps.length,0);
 const f=setup();clickText(f,'Add a city'.replace('Add a city','Добавить город'));f.d.querySelector('input').value='Moscow';f.press('Enter');f.requests.shift().respond(geocoding);await tick();f.press('Enter');f.requests.shift().onerror();await tick();assert(f.requests[0].url.includes('/weather/forecast'));f.requests.shift().respond(forecast);await tick();assert(f.d.querySelector('.temperature'));assert.equal(f.w.localStorage.getItem('weather.route'),'\"proxy\"');f.dom.window.close();
 const english=JSON.parse(fs.readFileSync(path.join(app,'locales/en.json'))),russian=JSON.parse(fs.readFileSync(path.join(app,'locales/ru.json')));assert.deepEqual(Object.keys(english).sort(),Object.keys(russian).sort());
 const unknown=setup('de-DE');assert(unknown.d.body.textContent.includes('Weather nearby'));
 const m=JSON.parse(fs.readFileSync(path.join(app,'manifest.webapp')));assert.deepEqual(Object.keys(m.permissions).sort(),['geolocation','storage','systemXHR']);assert(m.csp.includes('https://rstore.holy-voice-dd33.workers.dev'));
 for(const c of [a,b,unknown])c.dom.window.close();
 console.log('PASS ES5 syntax, RU/EN, no startup geolocation, city search/add/delete, 24h/7d navigation, units, coordinates validation, permission denial, rounded GPS, stale-cache offline fallback, no silent GPS refresh, WMO icons, null data, CSP and permissions.');
}
test().catch(e=>{console.error(e);process.exit(1);});
