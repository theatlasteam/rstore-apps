(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.notes.v1';
 var notes=UI.loadJSON(KEY,[
  {id:'welcome',title:'Welcome to Refresh Notes',body:'Press Left for a new note.\nPress Center to open or edit.\nPinned notes stay at the top.',tag:'guide',pinned:true,updated:Date.now()}
 ]);
 var state={view:'list',query:'',current:null};
 function save(){UI.saveJSON(KEY,notes);}
 function sorted(){
  var q=state.query.trim().toLowerCase();
  return notes.filter(function(n){
   if(!q)return true;
   return (n.title||'').toLowerCase().indexOf(q)>=0||(n.body||'').toLowerCase().indexOf(q)>=0||(n.tag||'').toLowerCase().indexOf(q)>=0;
  }).sort(function(a,b){
   if(!!a.pinned!==!!b.pinned)return a.pinned?-1:1;
   return (b.updated||0)-(a.updated||0);
  });
 }
 function fmtDate(ts){
  try{return new Date(ts).toLocaleDateString();}catch(e){return '';}
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='list'){
   var items=sorted();
   UI.setTitle(UI.tr('Notes','Заметки'),String(items.length));
   var h='<input id="search" type="search" placeholder="'+UI.tr('Search notes or tags...','Поиск заметок или тегов...')+'" value="'+UI.esc(state.query)+'">';
   if(!items.length){
    h+='<div class="empty">'+UI.tr('No notes found.','Заметок нет.')+'</div>';
   }else{
    for(var i=0;i<items.length;i++){
     var n=items[i];
     h+='<button class="row" data-id="'+UI.esc(n.id)+'"><strong>'+(n.pinned?'★ ':'')+UI.esc(n.title||UI.tr('Untitled','Без названия'))+'</strong><span>'+(n.tag?'#'+UI.esc(n.tag)+' · ':'')+UI.esc((n.body||'').replace(/\s+/g,' ').slice(0,48))+'</span></button>';
    }
   }
   main.innerHTML=h;
   UI.byId('search').oninput=function(){state.query=this.value;render();};
   var rows=main.querySelectorAll('.row');
   for(var j=0;j<rows.length;j++)rows[j].onclick=function(){openNote(this.dataset.id);};
   UI.setSoftkeys(
    UI.tr('New','Новая'),function(){state.current={id:null,title:'',body:'',tag:'',pinned:false};state.view='edit';render();},
    UI.tr('Open','Открыть'),function(){
     var el=document.activeElement;
     if(el&&el.dataset&&el.dataset.id)openNote(el.dataset.id);
     else if(items.length)openNote(items[0].id);
    },
    UI.tr('Pin','Закр.'),function(){
     var el=document.activeElement;
     if(el&&el.dataset&&el.dataset.id){
      for(var k=0;k<notes.length;k++)if(notes[k].id===el.dataset.id){notes[k].pinned=!notes[k].pinned;save();render();break;}
     }
    }
   );
   if(items.length){var first=main.querySelector('.row');if(first)first.focus();}else UI.byId('search').focus();
  }else if(state.view==='read'){
   var n=state.current;
   UI.setTitle(n.title||UI.tr('Note','Заметка'),n.pinned?'★':'');
   var words=(n.body||'').trim()?n.body.trim().split(/\s+/).length:0;
   main.innerHTML='<div class="card"><h2>'+UI.esc(n.title||UI.tr('Untitled','Без названия'))+'</h2>'
    +'<p class="hint">'+(n.tag?'#'+UI.esc(n.tag)+' · ':'')+fmtDate(n.updated)+' · '+words+' '+UI.tr('words','слов')+'</p>'
    +'<p style="white-space:pre-wrap">'+UI.esc(n.body)+'</p></div>';
   UI.setSoftkeys(
    UI.tr('Edit','Изм.'),function(){state.view='edit';render();},
    n.pinned?UI.tr('Unpin','Откр.'):UI.tr('Pin','Закр.'),function(){n.pinned=!n.pinned;save();render();},
    UI.tr('Back','Назад'),function(){state.view='list';render();}
   );
   main.focus();
  }else if(state.view==='edit'){
   var e=state.current;
   UI.setTitle(e.id?UI.tr('Edit Note','Редактировать'):UI.tr('New Note','Новая заметка'));
   main.innerHTML='<label>'+UI.tr('Title','Заголовок')+'</label><input id="nTitle" value="'+UI.esc(e.title)+'">'
    +'<label>'+UI.tr('Tag','Тег')+'</label><input id="nTag" value="'+UI.esc(e.tag)+'" placeholder="work, ideas..."> '
    +'<label>'+UI.tr('Content','Текст')+'</label><textarea id="nBody" style="min-height:110px">'+UI.esc(e.body)+'</textarea>'
    +(e.id?'<button class="row" id="delBtn" style="margin-top:8px"><strong>'+UI.tr('Delete Note','Удалить заметку')+'</strong></button>':'');
   if(e.id){
    UI.byId('delBtn').onclick=function(){
     notes=notes.filter(function(x){return x.id!==e.id;});
     save();UI.notice(UI.tr('Deleted','Удалено'));state.view='list';render();
    };
   }
   UI.setSoftkeys(
    UI.tr('Cancel','Отмена'),function(){state.view=e.id?'read':'list';render();},
    UI.tr('Save','Сохр.'),function(){
     e.title=UI.byId('nTitle').value.trim()||UI.tr('Untitled','Без названия');
     e.tag=UI.byId('nTag').value.trim().replace(/^#/,'');
     e.body=UI.byId('nBody').value;
     e.updated=Date.now();
     if(!e.id){e.id=String(Date.now());notes.push(e);}
     save();UI.notice(UI.tr('Saved','Сохранено'));state.view='read';render();
    },
    UI.tr('Back','Назад'),function(){state.view=e.id?'read':'list';render();}
   );
   UI.focusFirst();
  }
 }
 function openNote(id){
  for(var i=0;i<notes.length;i++)if(notes[i].id===id){state.current=notes[i];state.view='read';render();return;}
 }
 UI.installKeys();
 render();
})();
