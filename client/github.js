/* Direct GitHub transport. ES5 syntax for KaiOS 2.x / Gecko 48. */
(function(global){
 'use strict';
 var base='https://raw.githubusercontent.com/theatlasteam/rstore-apps/main/';
 var denied=['webapps-manage','permissions','engmode-extension','settings','power','embed-apps'];
 var entries={};
 function bad(tr){throw new Error(tr('invalid-response'));}
 function slugOK(id){return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(id)&&id!=='.'&&id!=='..';}
 function normalize(a,tr){
  if(!a||!slugOK(a.slug)||!a.download||a.download.url!==base+'apps/'+a.slug+'/application.zip'||!(/^[a-f0-9]{64}$/.test(a.sha256))||typeof a.packageBytes!=='number'||a.packageBytes<=0||a.packageBytes>12*1024*1024||Math.floor(a.packageBytes)!==a.packageBytes)bad(tr);
  if(['packaged','privileged'].indexOf(a.type)<0&&!(a.type==='root'&&a.manualOnly===true&&a.installSupported===false))bad(tr);
  return {id:a.slug,name:a.name,description:a.description,locales:a.locales||{},icon:a.icon,author:a.author,source:a.git_repo||a.website||a.download.url,category:(a.meta&&a.meta.categories&&a.meta.categories[0])||'utility',type:a.type,installSupported:a.installSupported!==false,manualOnly:a.manualOnly===true,installationNotes:a.installationNotes||{},requiresRoot:typeof a.requiresRoot==='boolean'?a.requiresRoot:null,license:a.license||null,version:a.version,packageBytes:a.packageBytes,sha256:a.sha256,runtimeTested:a.runtimeTested===true,hasAds:a.has_ads===true,hasTracking:a.has_tracking===true};
 }
 function cached(id){
  if(entries[id])return entries[id];
  try{var all=JSON.parse(global.localStorage.getItem('rstore.catalog')||'[]');for(var i=0;i<all.length;i++)if(all[i].id===id)return all[i];}catch(ignore){}
  return null;
 }
 function request(path,binary,progress,send,tr){
  if(path==='/api/catalog')return send(base+'catalog.json?t='+Date.now(),'GET',null,false,false).then(function(raw){
   if(!raw||raw.version!==2||!Array.isArray(raw.apps)||raw.apps.length>2000)bad(tr);
   var next={},apps=raw.apps.map(function(a){var app=normalize(a,tr);if(next[app.id])bad(tr);next[app.id]=app;return app;});entries=next;return {apps:apps,source:base+'catalog.json'};
  });
  var match=path.match(/^\/api\/app\/([a-zA-Z0-9._-]{1,100})$/);
  if(match){var id=match[1],a=cached(id);if(!a||!slugOK(id))return Promise.reject(new Error(tr('invalid-response')));
   return send(base+'apps/'+id+'/manifest.webapp','GET',null,false,false).then(function(m){
    if(!m||typeof m.name!=='string'||!m.name)bad(tr);
    var permissions=Object.keys(m.permissions||{}),manual=a.manualOnly===true&&a.installSupported===false;
    if(['web','privileged'].indexOf(m.type||'web')<0&&!(manual&&m.type==='certified'))bad(tr);
    if(!manual&&permissions.some(function(p){return denied.indexOf(p)>=0;}))bad(tr);
    if(m.origin&&!/^app:\/\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(m.origin))bad(tr);
    if(!/^[a-f0-9]{64}$/.test(a.sha256)||a.packageBytes<=0||a.packageBytes>12*1024*1024)bad(tr);
    return {id:id,name:m.name,version:m.version||a.version||'unknown',bytes:a.packageBytes,sha256:a.sha256,permissions:permissions,installSupported:a.installSupported!==false,manualOnly:a.manualOnly===true,installationNotes:a.installationNotes||{},requiresRoot:typeof a.requiresRoot==='boolean'?a.requiresRoot:null,license:a.license||null,origin:m.origin||null,type:m.type||'web',package:base+'apps/'+id+'/application.zip',source:a.source};
   });
  }
  var prefix=base+'apps/';
  if(binary&&path.indexOf(prefix)===0){var part=path.slice(prefix.length),packageMatch=part.match(/^([a-zA-Z0-9._-]{1,100})\/application\.zip$/);if(packageMatch&&slugOK(packageMatch[1])&&cached(packageMatch[1]))return send(path,'GET',null,false,true,progress);}
  return Promise.reject(new Error(tr('invalid-response')));
 }
 global.RStoreGitHub={request:request};
})(window);
