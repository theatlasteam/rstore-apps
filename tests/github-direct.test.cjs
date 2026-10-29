'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/';
const catalog=JSON.parse(fs.readFileSync(path.join(root,'catalog.json')));
const store={},calls=[],window={localStorage:{getItem:k=>store[k]||null}};
vm.runInNewContext(fs.readFileSync(path.join(root,'client/github.js'),'utf8'),{window,Promise,Date});
const api=window.RStoreGitHub.request,tr=k=>k;
async function send(url,method,body,local,binary,progress){
 assert(url.startsWith(base));assert.equal(local,false);assert.equal(method,'GET');assert.equal(body,null);calls.push(url);
 if(url.startsWith(base+'catalog.json?'))return structuredClone(catalog);
 const relative=url.slice(base.length);assert(!relative.includes('..'));const bytes=fs.readFileSync(path.join(root,relative));
 if(binary){if(progress)progress(bytes.length,bytes.length);return bytes;}return JSON.parse(bytes);
}
async function test(){
 const result=await api('/api/catalog',false,null,send,tr);assert.equal(result.apps.length,catalog.apps.length);store['rstore.catalog']=JSON.stringify(result.apps);
 for(const app of result.apps){
  const meta=await api('/api/app/'+app.id,false,null,send,tr);assert.equal(meta.sha256,app.sha256);assert.equal(meta.bytes,app.packageBytes);
  const data=await api(meta.package,true,null,send,tr);assert.equal(data.length,meta.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),meta.sha256);
  if(app.id==='wallacetoolbox'){assert.equal(meta.installSupported,false);assert.equal(meta.manualOnly,true);assert.equal(meta.type,'certified');}
 }
 await assert.rejects(api('https://example.com/application.zip',true,null,send,tr));
 await assert.rejects(api('/api/app/unknown',false,null,send,tr));
 const bad=structuredClone(catalog);bad.apps[0].download.url='https://example.com/application.zip';await assert.rejects(api('/api/catalog',false,null,()=>Promise.resolve(bad),tr));
 const malicious=Object.assign({},JSON.parse(fs.readFileSync(path.join(root,'apps/contact-search/manifest.webapp'))),{type:'certified'});
 await assert.rejects(api('/api/app/contact-search',false,null,()=>Promise.resolve(malicious),tr));
 // A saved catalog still permits details after a failed catalog refresh.
 const cachedWindow={localStorage:window.localStorage};vm.runInNewContext(fs.readFileSync(path.join(root,'client/github.js'),'utf8'),{window:cachedWindow,Promise,Date});
 assert.equal((await cachedWindow.RStoreGitHub.request('/api/app/kaiauth',false,null,send,tr)).id,'kaiauth');
 const source=fs.readFileSync(path.join(root,'client/app.js'),'utf8');const requestCode=source.slice(source.indexOf(' function request('),source.indexOf(' function api('));
 const timers=new Map();let seq=0,current;
 class FakeXHR{constructor(){current=this;this.headers={};}open(method,url){this.method=method;this.url=url;}setRequestHeader(k,v){this.headers[k]=v;}send(){}abort(){this.aborted=true;if(this.onabort)this.onabort();}}
 const ctx={Promise,XMLHttpRequest:FakeXHR,cfg:{key:'test-key'},tr,setTimeout(fn,ms){timers.set(++seq,{fn,ms});return seq;},clearTimeout(id){timers.delete(id);}};vm.runInNewContext(requestCode,ctx);
 let pending=ctx.request(base+'apps/contact-search/application.zip','GET',null,false,true,()=>{});assert.equal(current.timeout,180000);assert.deepEqual(current.headers,{});
 current.onprogress({loaded:16384,lengthComputable:true,total:480403});assert.equal(timers.size,1);const timer=[...timers.values()][0];assert.equal(timer.ms,20000);timer.fn();await assert.rejects(pending,/download-stalled/);assert.equal(current.aborted,true);assert.equal(timers.size,0);
 pending=ctx.request(base+'catalog.json','GET',null,false,false);current.responseText='{"apps":[]}';current.status=200;current.onload();assert.equal((await pending).apps.length,0);assert.equal(timers.size,0);
 pending=ctx.request('http://127.0.0.1:17891/health','GET',null,true,false);assert.equal(timers.size,0);assert.equal(current.headers['X-RStore-Key'],'test-key');current.responseText='{"ok":true}';current.status=200;current.onload();assert.equal((await pending).ok,true);
 assert(source.includes('if(hash!==meta.sha256||data.byteLength!==meta.bytes)'));assert(!source.includes('cfg.api'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'client/manifest.webapp')));assert(manifest.csp.includes('connect-src \'self\' https://raw.githubusercontent.com http://127.0.0.1:17891'));assert(!manifest.csp.includes('workers.dev'));
 for(const lang of ['ru','en']){const d=JSON.parse(fs.readFileSync(path.join(root,'client/locales/'+lang+'.json')));assert(d['download-stalled']);assert(d['about-body'].includes('0.1.4'));}
 assert(calls.every(url=>!url.includes('workers.dev')));
 console.log('PASS: GitHub packages + SHA-256, metadata, cached catalog, Wallace manual-only, URL restrictions, certified rejection, 16KiB stall timeout, no remote key leakage, local installer unchanged, CSP and localization.');
}
test().catch(e=>{console.error(e);process.exit(1);});
