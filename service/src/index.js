import { unzipSync, strFromU8 } from 'fflate';

export const CATALOG = 'https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/catalog.json?v=5';
export const MAX_PACKAGE = 12 * 1024 * 1024;
const MAX_EXPANDED = 32 * 1024 * 1024;
const denied = new Set(['webapps-manage', 'permissions', 'engmode-extension', 'settings', 'power', 'embed-apps']);
const cors = {'Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'};
let catalogMemo, catalogAt = 0;
export function safeUrl(raw) {
  const u = new URL(raw);
  if (u.protocol !== 'https:' || u.username || u.password || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(u.hostname)) throw new Error('Unsafe upstream URL');
  if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
    u.hostname = 'raw.githubusercontent.com';u.pathname = u.pathname.replace('/blob/', '/');u.search = '';
  }
  return u.href;
}
export async function readLimited(res, limit) {
  if (!res.ok) throw new Error('Upstream HTTP ' + res.status);
  if (Number(res.headers.get('content-length')) > limit) throw new Error('Package too large');
  const reader = res.body.getReader();const parts=[];let size=0;
  try { while(true) { const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit)throw new Error('Package too large');parts.push(r.value); } }
  catch(e){await reader.cancel();throw e;}
  const out=new Uint8Array(size);let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;
}
async function remote(url, limit) {
  let u=safeUrl(url);
  for(let i=0;i<5;i++){
    const res=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'RStore/0.1 (KaiOS Refresh)'}});
    if(res.status>=300&&res.status<400){const location=res.headers.get('location');if(!location)throw new Error('Missing redirect');u=safeUrl(new URL(location,u).href);continue;}
    return readLimited(res,limit);
  }
  throw new Error('Too many redirects');
}
export function unpack(bytes, manualOnly = false) {
  // Apply the expansion budget before fflate inflates each entry.
  function open(data){let expanded=0,count=0;return unzipSync(data,{filter(file){expanded+=file.originalSize;count++;if(expanded>MAX_EXPANDED||count>2000)throw new Error('Archive expansion limit');return true;}});}
  let files=open(bytes);
  if(files['application.zip']){bytes=files['application.zip'];if(bytes.length>MAX_PACKAGE)throw new Error('Package too large');files=open(bytes);}
  const manifestBytes=files['manifest.webapp'];
  if(!manifestBytes||manifestBytes.length>128*1024)throw new Error('Root manifest.webapp required');
  const manifest=JSON.parse(strFromU8(manifestBytes));
  if(!manifest.name||typeof manifest.name!=='string')throw new Error('Missing app name');
  if(manifest.type&&!['web','privileged'].includes(manifest.type)&&!(manualOnly===true&&manifest.type==='certified'))throw new Error('System/root apps are not supported');
  const permissions=Object.keys(manifest.permissions||{});
  if(!manualOnly&&permissions.some(p=>denied.has(p)))throw new Error('App requests system-management permissions');
  if(manifest.origin&&!/^app:\/\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(manifest.origin))throw new Error('Invalid app origin');
  if(manifest.launch_path && (!manifest.launch_path.startsWith('/') || manifest.launch_path.startsWith('//')))throw new Error('Invalid launch path');
  const launch=(manifest.launch_path||'/index.html').split(/[?#]/)[0].slice(1);
  if(!files[launch])throw new Error('Launch file missing: '+launch);
  return {bytes,manifest,permissions};
}
async function catalog(){
  if(catalogMemo&&Date.now()-catalogAt<600000)return catalogMemo;
  const raw=JSON.parse(strFromU8(await remote(CATALOG,2*1024*1024)));
  if(raw.version!==2||!Array.isArray(raw.apps))throw new Error('Unsupported catalog');
  catalogMemo=raw.apps.filter(a=>(['packaged','privileged'].includes(a.type)||(a.type==='root'&&a.manualOnly===true&&a.installSupported===false))&&/^[a-zA-Z0-9._-]{1,100}$/.test(a.slug)&&a.download?.url?.startsWith('https:'));
  catalogAt=Date.now();return catalogMemo;
}
async function packageFor(app){
  const key=new Request('https://rstore-cache.invalid/package/'+encodeURIComponent(app.slug));
  const cache=globalThis.caches?.default;const hit=await cache?.match(key);
  const bytes=hit?new Uint8Array(await hit.arrayBuffer()):await remote(app.download.url,MAX_PACKAGE);
  const normalized=unpack(bytes,app.manualOnly===true&&app.installSupported===false);
  if(!hit&&cache)await cache.put(key,new Response(normalized.bytes,{headers:{'Cache-Control':'public, max-age=600'}}));
  const digest=await crypto.subtle.digest('SHA-256',normalized.bytes);
  normalized.sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');if(!app.sha256 || normalized.sha256 !== app.sha256)throw new Error('Package checksum does not match the RStore repository');return normalized;
}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});}
export default {
 async fetch(req){
  const u=new URL(req.url);
  if(req.method==='OPTIONS')return new Response(null,{headers:{...cors,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
  if(req.method!=='GET')return json({error:'Read-only API'},405);
  try{
   if(u.pathname==='/')return json({name:'RStore',repository:'https://github.com/theatlasteam/rstore-apps',catalog:'/api/catalog',health:'/health',package:'/api/package/{app-id}',platform:'KaiOS 2.5'});
   if(u.pathname==='/health')return json({name:'RStore',version:'0.1.0',installer:'local-root-companion',platform:'KaiOS 2.5'});
   if(u.pathname==='/api/catalog'){
    const apps=await catalog();return json({source:CATALOG,platform:'KaiOS 2.5',compatibility:'Package availability and runtime compatibility vary. Not audited.',apps:apps.map(a=>({id:a.slug,name:a.name,description:a.description,locales:a.locales||{},icon:a.icon,author:a.author,source:a.git_repo||a.website||a.download.url,category:a.meta?.categories?.[0]||'utility',type:a.type,installSupported:a.installSupported!==false,manualOnly:a.manualOnly===true,installationNotes:a.installationNotes||{},requiresRoot:typeof a.requiresRoot==='boolean'?a.requiresRoot:null,license:a.license||null,version:a.version,packageBytes:a.packageBytes,sha256:a.sha256,runtimeTested:a.runtimeTested===true,hasAds:a.has_ads===true,hasTracking:a.has_tracking===true}))});
   }
   const match=u.pathname.match(/^\/api\/(app|package)\/([a-zA-Z0-9._-]{1,100})$/);
   if(match){
    const app=(await catalog()).find(a=>a.slug===match[2]);if(!app)return json({error:'Unknown community app'},404);
    const p=await packageFor(app);
    if(match[1]==='app')return json({id:app.slug,name:p.manifest.name,version:p.manifest.version||'unknown',bytes:p.bytes.length,sha256:p.sha256,permissions:p.permissions,installSupported:app.installSupported!==false,manualOnly:app.manualOnly===true,installationNotes:app.installationNotes||{},requiresRoot:typeof app.requiresRoot==='boolean'?app.requiresRoot:null,license:app.license||null,origin:p.manifest.origin||null,type:p.manifest.type||'web',package:'/api/package/'+app.slug,source:app.git_repo||app.download.url});
    return new Response(p.bytes,{headers:{...cors,'Content-Type':'application/zip','Content-Length':String(p.bytes.length),'X-Package-SHA256':p.sha256,'Cache-Control':'public, max-age=600'}});
   }
   return json({error:'Not found'},404);
  }catch(e){return json({error:String(e.message||e).slice(0,300)},502);}
 }
};
