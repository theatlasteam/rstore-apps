/* Shared KaiOS Refresh UI & D-pad/Softkey helpers. ES5 for Gecko 48. */
(function(global){
 'use strict';
 var noticeTimer=null;
 var softkeys={left:null,center:null,right:null};
 function byId(id){return document.getElementById(id);}
 function isRu(){return /^ru/i.test((navigator.language||'en'));}
 function tr(en,ru){return isRu()&&ru?ru:en;}
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function notice(msg,ms){
  var el=byId('notice');if(!el)return;
  el.textContent=msg;el.hidden=false;
  clearTimeout(noticeTimer);
  noticeTimer=setTimeout(function(){el.hidden=true;},ms||2400);
 }
 function setTitle(t,badge){
  var el=byId('title');if(el)el.textContent=t;
  var b=byId('badge');if(b){if(badge){b.textContent=badge;b.hidden=false;}else{b.hidden=true;}}
 }
 function setSoftkeys(lText,lFn,cText,cFn,rText,rFn){
  var l=byId('left'),c=byId('center'),r=byId('right');
  softkeys.left=lFn||null;softkeys.center=cFn||null;softkeys.right=rFn||null;
  if(l){l.textContent=lText||'';l.onclick=function(){if(softkeys.left)softkeys.left();};}
  if(c){c.textContent=cText||'';c.onclick=function(){if(softkeys.center)softkeys.center();};}
  if(r){r.textContent=rText||'';r.onclick=function(){if(softkeys.right)softkeys.right();};}
 }
 function focusables(){
  var main=byId('main');if(!main)return [];
  var nodes=main.querySelectorAll('button,input,textarea,select,[tabindex="0"],a[href]');
  var out=[];
  for(var i=0;i<nodes.length;i++){
   if(!nodes[i].disabled&&nodes[i].offsetParent!==null)out.push(nodes[i]);
  }
  return out;
 }
 function focusFirst(){
  var list=focusables();
  if(list.length){list[0].focus();return true;}
  var main=byId('main');if(main)main.focus();
  return false;
 }
 function moveFocus(dir){
  var list=focusables();if(!list.length)return false;
  var cur=document.activeElement,idx=list.indexOf(cur);
  if(idx<0){list[dir>0?0:list.length-1].focus();return true;}
  var next=(idx+dir+list.length)%list.length;
  list[next].focus();
  if(list[next].scrollIntoView)list[next].scrollIntoView({block:'nearest'});
  return true;
 }
 function isInput(el){return el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.tagName==='SELECT');}
 function installKeys(customHandler){
  document.addEventListener('keydown',function(e){
   if(customHandler&&customHandler(e)===true)return;
   var k=e.key;
   if(k==='SoftLeft'||k==='F1'){e.preventDefault();if(softkeys.left)softkeys.left();return;}
   if(k==='SoftRight'||k==='F2'){e.preventDefault();if(softkeys.right)softkeys.right();return;}
   if(k==='Backspace'&&!isInput(document.activeElement)){
    if(softkeys.right){e.preventDefault();softkeys.right();}
    return;
   }
   if(k==='ArrowDown'){
    if(document.activeElement&&document.activeElement.tagName==='TEXTAREA')return;
    e.preventDefault();moveFocus(1);return;
   }
   if(k==='ArrowUp'){
    if(document.activeElement&&document.activeElement.tagName==='TEXTAREA')return;
    e.preventDefault();moveFocus(-1);return;
   }
   if(k==='Enter'){
    if(softkeys.center){
     var el=document.activeElement;
     if(el&&el.tagName==='BUTTON'){return;}
     e.preventDefault();softkeys.center();
    }
   }
  });
 }
 function xhr(opts){
  return new Promise(function(resolve,reject){
   var req;
   try{req=new XMLHttpRequest({mozSystem:true});}catch(e){req=new XMLHttpRequest();}
   req.open(opts.method||'GET',opts.url,true);
   req.timeout=opts.timeout||15000;
   if(opts.headers){
    Object.keys(opts.headers).forEach(function(k){req.setRequestHeader(k,opts.headers[k]);});
   }
   req.onload=function(){
    if(req.status>=200&&req.status<300)resolve(req.responseText);
    else reject(new Error('HTTP '+req.status+(req.responseText?': '+req.responseText.slice(0,140):'')));
   };
   req.onerror=function(){reject(new Error('Network error'));};
   req.ontimeout=function(){reject(new Error('Request timed out'));};
   req.send(opts.body||null);
  });
 }
 function loadJSON(key,fallback){
  try{var v=localStorage.getItem(key);return v?JSON.parse(v):fallback;}catch(e){return fallback;}
 }
 function saveJSON(key,val){
  try{localStorage.setItem(key,JSON.stringify(val));return true;}catch(e){return false;}
 }
 global.RefreshUI={
  byId:byId,isRu:isRu,tr:tr,esc:esc,notice:notice,setTitle:setTitle,
  setSoftkeys:setSoftkeys,focusables:focusables,focusFirst:focusFirst,
  moveFocus:moveFocus,installKeys:installKeys,xhr:xhr,
  loadJSON:loadJSON,saveJSON:saveJSON
 };
})(window);
