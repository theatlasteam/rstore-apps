(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.calendar.v1';
 var events=UI.loadJSON(KEY,{});
 var now=new Date();
 var state={view:'month',year:now.getFullYear(),month:now.getMonth(),day:now.getDate()};
 function pad(n){return n<10?'0'+n:String(n);}
 function dateKey(y,m,d){return y+'-'+pad(m+1)+'-'+pad(d);}
 function save(){UI.saveJSON(KEY,events);}
 function monthName(y,m){
  try{return new Date(y,m,1).toLocaleDateString(UI.isRu()?'ru-RU':'en-US',{month:'long',year:'numeric'});}
  catch(e){return y+'-'+pad(m+1);}
 }
 function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}
 function render(){
  var main=UI.byId('main');
  if(state.view==='month'){
   var dows=UI.isRu()?['Пн','Вт','Ср','Чт','Пт','Сб','Вс']:['Mo','Tu','We','Th','Fr','Sa','Su'];
   var total=daysInMonth(state.year,state.month);
   if(state.day>total)state.day=total;
   var firstDow=(new Date(state.year,state.month,1).getDay()+6)%7;
   var selKey=dateKey(state.year,state.month,state.day);
   var dayEvents=events[selKey]||[];
   UI.setTitle(monthName(state.year,state.month),dayEvents.length?String(dayEvents.length):'');
   var h='<div class="cal-grid">';
   for(var i=0;i<7;i++)h+='<div class="cal-dow">'+dows[i]+'</div>';
   for(var b=0;b<firstDow;b++)h+='<div></div>';
   for(var d=1;d<=total;d++){
    var k=dateKey(state.year,state.month,d);
    var isToday=(state.year===now.getFullYear()&&state.month===now.getMonth()&&d===now.getDate());
    var cls='cal-day'+(isToday?' today':'')+(d===state.day?' selected':'')+((events[k]&&events[k].length)?' has-ev':'');
    h+='<button class="'+cls+'" data-day="'+d+'">'+d+'</button>';
   }
   h+='</div>';
   h+='<div class="card"><strong>'+UI.esc(selKey)+'</strong>';
   if(!dayEvents.length){
    h+='<p class="hint">'+UI.tr('No events. Press Center to add.','Нет событий. Нажмите Центр для добавления.')+'</p>';
   }else{
    for(var j=0;j<dayEvents.length;j++){
     var ev=dayEvents[j];
     h+='<button class="row" data-idx="'+j+'" style="margin-top:6px"><strong>'+UI.esc((ev.time?ev.time+' ':'')+ev.title)+'</strong>'+(ev.note?'<span>'+UI.esc(ev.note)+'</span>':'')+'</button>';
    }
   }
   h+='</div>';
   main.innerHTML=h;
   var dayBtns=main.querySelectorAll('.cal-day');
   for(var x=0;x<dayBtns.length;x++){
    dayBtns[x].onclick=function(){state.day=Number(this.dataset.day);render();};
   }
   var evRows=main.querySelectorAll('.row');
   for(var r=0;r<evRows.length;r++){
    evRows[r].onclick=function(){
     var idx=Number(this.dataset.idx);
     dayEvents.splice(idx,1);
     if(!dayEvents.length)delete events[selKey];else events[selKey]=dayEvents;
     save();UI.notice(UI.tr('Event removed','Событие удалено'));render();
    };
   }
   UI.setSoftkeys(
    UI.tr('Today','Сегодня'),function(){state.year=now.getFullYear();state.month=now.getMonth();state.day=now.getDate();render();},
    UI.tr('Add','Доб.'),function(){state.view='add';render();},
    UI.tr('Next Mo','След.'),function(){stepMonth(1);}
   );
   var selEl=main.querySelector('.cal-day.selected');if(selEl)selEl.focus();
  }else{
   var key=dateKey(state.year,state.month,state.day);
   UI.setTitle(UI.tr('New Event','Новое событие'),key);
   main.innerHTML='<label>'+UI.tr('Title','Название')+'</label><input id="eTitle" placeholder="'+UI.tr('Meeting, Birthday...','Встреча, День рождения...')+'">'
    +'<label>'+UI.tr('Time (optional)','Время (необяз.)')+'</label><input id="eTime" placeholder="14:30">'
    +'<label>'+UI.tr('Note','Заметка')+'</label><input id="eNote">';
   UI.setSoftkeys(
    UI.tr('Cancel','Отмена'),function(){state.view='month';render();},
    UI.tr('Save','Сохр.'),function(){
     var title=UI.byId('eTitle').value.trim();
     if(!title){UI.notice(UI.tr('Enter title','Введите название'));return;}
     if(!events[key])events[key]=[];
     events[key].push({title:title,time:UI.byId('eTime').value.trim(),note:UI.byId('eNote').value.trim()});
     events[key].sort(function(a,b){return (a.time||'99:99').localeCompare(b.time||'99:99');});
     save();UI.notice(UI.tr('Saved','Сохранено'));state.view='month';render();
    },
    UI.tr('Back','Назад'),function(){state.view='month';render();}
   );
   UI.focusFirst();
  }
 }
 function stepMonth(delta){
  state.month+=delta;
  if(state.month<0){state.month=11;state.year--;}
  if(state.month>11){state.month=0;state.year++;}
  render();
 }
 UI.installKeys(function(e){
  if(state.view!=='month')return false;
  if(e.key==='ArrowLeft'){e.preventDefault();if(state.day>1)state.day--;else{stepMonth(-1);state.day=daysInMonth(state.year,state.month);}render();return true;}
  if(e.key==='ArrowRight'){e.preventDefault();if(state.day<daysInMonth(state.year,state.month))state.day++;else{stepMonth(1);state.day=1;}render();return true;}
  return false;
 });
 render();
})();
