(function(){
 'use strict';
 var UI=window.RefreshUI;
 var STORAGE='refresh.contacts.v1';
 var state={view:'list',filter:'all',query:'',contacts:[],selected:null,vcf:''};

 function hasMozContacts(){return typeof navigator!=='undefined'&&navigator.mozContacts&&typeof navigator.mozContacts.getAll==='function';}
 function normalizeMoz(c){
  var name=(c.name&&c.name[0])||((c.givenName&&c.givenName[0]||'')+' '+(c.familyName&&c.familyName[0]||'')).trim()||'Unnamed';
  var tel=(c.tel&&c.tel[0]&&c.tel[0].value)||'';
  var email=(c.email&&c.email[0]&&c.email[0].value)||'';
  var note=(c.note&&c.note[0])||'';
  return {id:c.id||String(Date.now()+Math.random()),name:name,tel:tel,email:email,note:note,fav:note.indexOf('[FAV]')>=0,moz:true};
 }
 function loadContacts(cb){
  if(hasMozContacts()){
   var list=[],req=navigator.mozContacts.getAll({});
   req.onsuccess=function(){
    var cur=req.result;
    if(cur){list.push(normalizeMoz(cur));req.continue();}
    else{list.sort(function(a,b){return a.name.localeCompare(b.name);});state.contacts=list;cb();}
   };
   req.onerror=function(){state.contacts=UI.loadJSON(STORAGE,[]);cb();};
   return;
  }
  state.contacts=UI.loadJSON(STORAGE,[]).sort(function(a,b){return a.name.localeCompare(b.name);});
  cb();
 }
 function saveLocal(){if(!hasMozContacts())UI.saveJSON(STORAGE,state.contacts);}
 function saveContact(item,cb){
  if(hasMozContacts()&&typeof window.mozContact==='function'){
   try{
    var c=new window.mozContact({
     name:[item.name],givenName:[item.name],
     tel:item.tel?[{type:['mobile'],value:item.tel}]:[],
     email:item.email?[{type:['home'],value:item.email}]:[],
     note:[(item.fav?'[FAV] ':'')+(item.note||'').replace('[FAV] ','')]
    });
    if(item.id&&item.moz)c.id=item.id;
    var req=navigator.mozContacts.save(c);
    req.onsuccess=function(){loadContacts(cb);};
    req.onerror=function(){UI.notice(UI.tr('Failed to save contact','Не удалось сохранить'));};
    return;
   }catch(e){}
  }
  if(!item.id)item.id=String(Date.now());
  var idx=-1;
  for(var i=0;i<state.contacts.length;i++)if(state.contacts[i].id===item.id){idx=i;break;}
  if(idx>=0)state.contacts[idx]=item;else state.contacts.push(item);
  saveLocal();loadContacts(cb);
 }
 function deleteContact(item,cb){
  if(hasMozContacts()&&item.moz){
   var req=navigator.mozContacts.find({filterBy:['id'],filterValue:item.id,filterOp:'equals'});
   req.onsuccess=function(){
    if(req.result&&req.result[0]){
     var del=navigator.mozContacts.remove(req.result[0]);
     del.onsuccess=function(){loadContacts(cb);};
     del.onerror=function(){UI.notice(UI.tr('Delete failed','Ошибка удаления'));};
    }else loadContacts(cb);
   };
   return;
  }
  state.contacts=state.contacts.filter(function(c){return c.id!==item.id;});
  saveLocal();loadContacts(cb);
 }
 function toVCard(list){
  return list.map(function(c){
   return ['BEGIN:VCARD','VERSION:3.0','FN:'+c.name,c.tel?'TEL;TYPE=CELL:'+c.tel:'',c.email?'EMAIL:'+c.email:'',c.note?'NOTE:'+c.note:'','END:VCARD'].filter(Boolean).join('\n');
  }).join('\n');
 }
 function filtered(){
  var q=state.query.trim().toLowerCase();
  return state.contacts.filter(function(c){
   if(state.filter==='fav'&&!c.fav)return false;
   if(!q)return true;
   return (c.name||'').toLowerCase().indexOf(q)>=0||(c.tel||'').toLowerCase().indexOf(q)>=0||(c.email||'').toLowerCase().indexOf(q)>=0;
  });
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='list'){
   var items=filtered();
   UI.setTitle(UI.tr('Contacts','Контакты'),String(items.length));
   var html='<div class="tabs"><div class="tab'+(state.filter==='all'?' active':'')+'">'+UI.tr('All','Все')+'</div><div class="tab'+(state.filter==='fav'?' active':'')+'">'+UI.tr('Favorites','Избранное')+'</div></div>';
   html+='<input id="search" type="search" placeholder="'+UI.tr('Search name or number...','Поиск по имени или номеру...')+'" value="'+UI.esc(state.query)+'">';
   if(!items.length){
    html+='<div class="empty">'+UI.tr('No contacts yet. Press Left for New.','Контактов пока нет. Нажмите Левую для создания.')+'</div>';
   }else{
    for(var i=0;i<items.length;i++){
     var c=items[i];
     html+='<button class="row" data-id="'+UI.esc(c.id)+'"><strong>'+(c.fav?'★ ':'')+UI.esc(c.name)+'</strong><span>'+UI.esc(c.tel||c.email||UI.tr('No phone','Нет номера'))+'</span></button>';
    }
   }
   main.innerHTML=html;
   var searchEl=UI.byId('search');
   searchEl.oninput=function(){state.query=searchEl.value;renderListOnly();};
   bindRows();
   UI.setSoftkeys(
    UI.tr('New','Новый'),function(){state.selected={id:null,name:'',tel:'',email:'',note:'',fav:false};state.view='edit';render();},
    UI.tr('Open','Открыть'),function(){
     var el=document.activeElement;
     if(el&&el.dataset&&el.dataset.id)openDetail(el.dataset.id);
     else if(items.length)openDetail(items[0].id);
    },
    UI.tr('vCard','vCard'),function(){state.vcf=toVCard(state.contacts);state.view='vcf';render();}
   );
   if(items.length){var first=main.querySelector('.row');if(first)first.focus();}else searchEl.focus();
  }else if(state.view==='detail'){
   var c=state.selected;
   UI.setTitle(c.name,c.fav?'★':'');
   var h='<div class="card"><h2>'+(c.fav?'★ ':'')+UI.esc(c.name)+'</h2>';
   h+='<p><strong>'+UI.tr('Phone','Телефон')+':</strong> '+UI.esc(c.tel||'—')+'</p>';
   h+='<p><strong>Email:</strong> '+UI.esc(c.email||'—')+'</p>';
   if(c.note)h+='<p><strong>'+UI.tr('Note','Заметка')+':</strong> '+UI.esc(c.note.replace('[FAV] ',''))+'</p>';
   h+='</div>';
   if(c.tel){
    h+='<a class="row" href="tel:'+UI.esc(c.tel)+'"><strong>'+UI.tr('Call','Позвонить')+'</strong><span>'+UI.esc(c.tel)+'</span></a>';
    h+='<a class="row" href="sms:'+UI.esc(c.tel)+'"><strong>'+UI.tr('Send SMS','Написать SMS')+'</strong><span>'+UI.esc(c.tel)+'</span></a>';
   }
   h+='<button class="row" id="favBtn"><strong>'+(c.fav?UI.tr('Remove Favorite','Убрать из избранного'):UI.tr('Add to Favorites','В избранное'))+'</strong></button>';
   h+='<button class="row" id="delBtn"><strong>'+UI.tr('Delete Contact','Удалить контакт')+'</strong></button>';
   main.innerHTML=h;
   UI.byId('favBtn').onclick=function(){c.fav=!c.fav;saveContact(c,function(){UI.notice(UI.tr('Updated','Обновлено'));render();});};
   UI.byId('delBtn').onclick=function(){deleteContact(c,function(){UI.notice(UI.tr('Deleted','Удалено'));state.view='list';render();});};
   UI.setSoftkeys(
    UI.tr('Edit','Изм.'),function(){state.view='edit';render();},
    UI.tr('Select','Выбор'),function(){if(document.activeElement)document.activeElement.click();},
    UI.tr('Back','Назад'),function(){state.view='list';render();}
   );
   UI.focusFirst();
  }else if(state.view==='edit'){
   var e=state.selected;
   UI.setTitle(e.id?UI.tr('Edit Contact','Редактировать'):UI.tr('New Contact','Новый контакт'));
   main.innerHTML='<label>'+UI.tr('Name','Имя')+'</label><input id="fName" value="'+UI.esc(e.name)+'">'
    +'<label>'+UI.tr('Phone','Телефон')+'</label><input id="fTel" type="tel" value="'+UI.esc(e.tel)+'">'
    +'<label>Email</label><input id="fEmail" type="email" value="'+UI.esc(e.email)+'">'
    +'<label>'+UI.tr('Note','Заметка')+'</label><input id="fNote" value="'+UI.esc((e.note||'').replace('[FAV] ',''))+'">'
    +'<button class="row" id="fFav" style="margin-top:8px"><strong>'+UI.tr('Favorite','Избранное')+': '+(e.fav?UI.tr('Yes','Да'):UI.tr('No','Нет'))+'</strong></button>';
   UI.byId('fFav').onclick=function(){e.fav=!e.fav;UI.byId('fFav').innerHTML='<strong>'+UI.tr('Favorite','Избранное')+': '+(e.fav?UI.tr('Yes','Да'):UI.tr('No','Нет'))+'</strong>';};
   UI.setSoftkeys(
    UI.tr('Cancel','Отмена'),function(){state.view=e.id?'detail':'list';render();},
    UI.tr('Save','Сохр.'),function(){
     var name=UI.byId('fName').value.trim();
     if(!name){UI.notice(UI.tr('Name is required','Введите имя'));return;}
     e.name=name;e.tel=UI.byId('fTel').value.trim();e.email=UI.byId('fEmail').value.trim();e.note=UI.byId('fNote').value.trim();
     saveContact(e,function(){UI.notice(UI.tr('Saved','Сохранено'));state.view='list';render();});
    },
    UI.tr('Back','Назад'),function(){state.view=e.id?'detail':'list';render();}
   );
   UI.focusFirst();
  }else if(state.view==='vcf'){
   UI.setTitle('vCard Export');
   main.innerHTML='<p class="hint">'+UI.tr('vCard 3.0 text for all contacts:','Текст vCard 3.0 для всех контактов:')+'</p><textarea id="vcfBox" readonly style="min-height:160px">'+UI.esc(state.vcf||UI.tr('No contacts','Нет контактов'))+'</textarea>';
   UI.setSoftkeys('',null,'',null,UI.tr('Back','Назад'),function(){state.view='list';render();});
   UI.focusFirst();
  }
 }
 function renderListOnly(){
  var main=UI.byId('main'),rows=main.querySelectorAll('.row,.empty');
  for(var i=0;i<rows.length;i++)rows[i].parentNode.removeChild(rows[i]);
  var items=filtered();
  UI.setTitle(UI.tr('Contacts','Контакты'),String(items.length));
  if(!items.length){
   var d=document.createElement('div');d.className='empty';d.textContent=UI.tr('No matches','Ничего не найдено');main.appendChild(d);
  }else{
   for(var j=0;j<items.length;j++){
    var c=items[j],b=document.createElement('button');b.className='row';b.dataset.id=c.id;
    b.innerHTML='<strong>'+(c.fav?'★ ':'')+UI.esc(c.name)+'</strong><span>'+UI.esc(c.tel||c.email||UI.tr('No phone','Нет номера'))+'</span>';
    main.appendChild(b);
   }
  }
  bindRows();
 }
 function bindRows(){
  var rows=UI.byId('main').querySelectorAll('.row');
  for(var i=0;i<rows.length;i++){
   rows[i].onclick=function(){openDetail(this.dataset.id);};
  }
 }
 function openDetail(id){
  for(var i=0;i<state.contacts.length;i++)if(state.contacts[i].id===id){state.selected=state.contacts[i];state.view='detail';render();return;}
 }
 UI.installKeys(function(e){
  if(state.view==='list'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
   if(document.activeElement&&document.activeElement.tagName==='INPUT')return false;
   e.preventDefault();state.filter=state.filter==='all'?'fav':'all';render();return true;
  }
  return false;
 });
 loadContacts(render);
})();
