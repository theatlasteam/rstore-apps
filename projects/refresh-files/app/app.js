(function(){
 'use strict';
 var UI=window.RefreshUI;
 var state={view:'list',cwd:'',files:[],previewName:'',previewText:'',storageInfo:''};
 function getStorage(){return navigator.getDeviceStorage?navigator.getDeviceStorage('sdcard'):null;}
 function fmtBytes(b){
  if(b<1024)return b+' B';
  if(b<1048576)return (b/1024).toFixed(1)+' KB';
  return (b/1048576).toFixed(2)+' MB';
 }
 function loadFiles(){
  var sd=getStorage();
  if(!sd){
   state.files=[
    {name:'downloads/readme.txt',size:128,type:'text/plain',mockText:'Refresh Files runs in preview mode outside KaiOS DeviceStorage.'},
    {name:'notes/todo.txt',size:64,type:'text/plain',mockText:'1. Test on KaiOS 2.x\n2. Browse SD card'}
   ];
   state.storageInfo=UI.tr('Preview mode (no DeviceStorage)','Демо-режим (нет DeviceStorage)');
   render();return;
  }
  var list=[],cursor=sd.enumerate();
  cursor.onsuccess=function(){
   var f=cursor.result;
   if(f){list.push(f);cursor.continue();}
   else{
    list.sort(function(a,b){return a.name.localeCompare(b.name);});
    state.files=list;
    render();
   }
  };
  cursor.onerror=function(){UI.notice(UI.tr('Storage read error','Ошибка чтения памяти'));render();};
  if(sd.freeSpace){
   var fr=sd.freeSpace();
   fr.onsuccess=function(){state.storageInfo=UI.tr('Free','Свободно')+': '+fmtBytes(fr.result);};
  }
 }
 function entriesInCwd(){
  var dirs={},items=[];
  for(var i=0;i<state.files.length;i++){
   var f=state.files[i],name=f.name.replace(/^\/+/,'');
   if(state.cwd&&name.indexOf(state.cwd)!==0)continue;
   var rel=name.slice(state.cwd.length);
   var slash=rel.indexOf('/');
   if(slash>=0){
    var d=rel.slice(0,slash);
    if(!dirs[d]){dirs[d]=true;items.push({kind:'dir',name:d,path:state.cwd+d+'/'});}
   }else if(rel){
    items.push({kind:'file',name:rel,file:f});
   }
  }
  return items;
 }
 function openFile(f){
  if(f.mockText!=null){state.previewName=f.name;state.previewText=f.mockText;state.view='preview';render();return;}
  if(f.size>65536){UI.notice(UI.tr('File too large to preview','Файл слишком большой'));return;}
  var reader=new FileReader();
  reader.onload=function(){state.previewName=f.name;state.previewText=String(reader.result||'');state.view='preview';render();};
  reader.onerror=function(){UI.notice(UI.tr('Cannot read file','Не удалось прочитать'));};
  reader.readAsText(f);
 }
 function deleteFile(f){
  var sd=getStorage();
  if(!sd){
   state.files=state.files.filter(function(x){return x.name!==f.name;});
   UI.notice(UI.tr('Deleted','Удалено'));state.view='list';render();return;
  }
  var req=sd.delete(f.name);
  req.onsuccess=function(){UI.notice(UI.tr('Deleted','Удалено'));state.view='list';loadFiles();};
  req.onerror=function(){UI.notice(UI.tr('Delete failed','Ошибка удаления'));};
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='list'){
   var items=entriesInCwd();
   UI.setTitle(state.cwd||'/' ,String(items.length));
   var h=(state.storageInfo?'<div class="card"><span class="hint">'+UI.esc(state.storageInfo)+'</span></div>':'');
   if(!items.length){
    h+='<div class="empty">'+UI.tr('Folder is empty','Папка пуста')+'</div>';
   }else{
    for(var i=0;i<items.length;i++){
     var it=items[i];
     if(it.kind==='dir')h+='<button class="row" data-dir="'+UI.esc(it.path)+'"><strong>[DIR] '+UI.esc(it.name)+'</strong></button>';
     else h+='<button class="row" data-file="'+UI.esc(it.file.name)+'"><strong>'+UI.esc(it.name)+'</strong><span>'+fmtBytes(it.file.size)+' · '+UI.esc(it.file.type||'file')+'</span></button>';
    }
   }
   main.innerHTML=h;
   var rows=main.querySelectorAll('.row');
   for(var j=0;j<rows.length;j++){
    rows[j].onclick=function(){
     if(this.dataset.dir){state.cwd=this.dataset.dir;render();}
     else{
      var fname=this.dataset.file;
      for(var k=0;k<state.files.length;k++)if(state.files[k].name===fname){openFile(state.files[k]);break;}
     }
    };
   }
   UI.setSoftkeys(
    UI.tr('Refresh','Обнов.'),loadFiles,
    UI.tr('Open','Открыть'),function(){if(document.activeElement&&document.activeElement.classList.contains('row'))document.activeElement.click();},
    state.cwd?UI.tr('Up','Вверх'):'',function(){
     if(!state.cwd)return;
     var parts=state.cwd.replace(/\/$/,'').split('/');parts.pop();
     state.cwd=parts.length?parts.join('/')+'/':'';render();
    }
   );
   UI.focusFirst();
  }else{
   UI.setTitle(state.previewName.split('/').pop());
   main.innerHTML='<div class="card"><p class="mono" style="white-space:pre-wrap;font-size:12px">'+UI.esc(state.previewText)+'</p></div>';
   UI.setSoftkeys(
    UI.tr('Delete','Удалить'),function(){
     for(var k=0;k<state.files.length;k++)if(state.files[k].name===state.previewName){deleteFile(state.files[k]);break;}
    },
    '',null,
    UI.tr('Back','Назад'),function(){state.view='list';render();}
   );
   main.focus();
  }
 }
 UI.installKeys();
 loadFiles();
})();
