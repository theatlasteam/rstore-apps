(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.tasks.v1';
 var tasks=UI.loadJSON(KEY,[
  {id:'t1',text:'Explore RStore apps',prio:'high',done:false,due:''},
  {id:'t2',text:'Press Center to toggle task',prio:'normal',done:false,due:''}
 ]);
 var state={view:'list',filter:'all'};
 function save(){UI.saveJSON(KEY,tasks);}
 function filtered(){
  return tasks.filter(function(t){
   if(state.filter==='active')return !t.done;
   if(state.filter==='done')return !!t.done;
   return true;
  }).sort(function(a,b){
   if(!!a.done!==!!b.done)return a.done?1:-1;
   var p={high:0,normal:1,low:2};
   return (p[a.prio]||1)-(p[b.prio]||1);
  });
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='list'){
   var items=filtered();
   var doneCount=tasks.filter(function(t){return t.done;}).length;
   UI.setTitle(UI.tr('Tasks','Задачи'),doneCount+'/'+tasks.length);
   var h='<div class="tabs">';
   h+='<div class="tab'+(state.filter==='all'?' active':'')+'">'+UI.tr('All','Все')+'</div>';
   h+='<div class="tab'+(state.filter==='active'?' active':'')+'">'+UI.tr('Active','Акт.')+'</div>';
   h+='<div class="tab'+(state.filter==='done'?' active':'')+'">'+UI.tr('Done','Готово')+'</div>';
   h+='</div>';
   if(!items.length){
    h+='<div class="empty">'+UI.tr('No tasks here. Press Left to add.','Задач нет. Нажмите Левую для создания.')+'</div>';
   }else{
    for(var i=0;i<items.length;i++){
     var t=items[i];
     var mark=t.done?'[x] ':'[ ] ';
     var prio=t.prio==='high'?'! ':t.prio==='low'?'· ':'';
     h+='<button class="row" data-id="'+UI.esc(t.id)+'"><strong>'+mark+prio+UI.esc(t.text)+'</strong>'+(t.due?'<span>'+UI.tr('Due','Срок')+': '+UI.esc(t.due)+'</span>':'')+'</button>';
    }
   }
   main.innerHTML=h;
   var rows=main.querySelectorAll('.row');
   for(var j=0;j<rows.length;j++)rows[j].onclick=function(){toggleTask(this.dataset.id);};
   UI.setSoftkeys(
    UI.tr('New','Новая'),function(){state.view='add';render();},
    UI.tr('Toggle','Отм.'),function(){
     var el=document.activeElement;
     if(el&&el.dataset&&el.dataset.id)toggleTask(el.dataset.id);
    },
    UI.tr('Clear Done','Очист.'),function(){
     tasks=tasks.filter(function(t){return !t.done;});
     save();UI.notice(UI.tr('Cleared completed','Выполненные удалены'));render();
    }
   );
   UI.focusFirst();
  }else{
   UI.setTitle(UI.tr('New Task','Новая задача'));
   main.innerHTML='<label>'+UI.tr('Task','Задача')+'</label><input id="tText" placeholder="'+UI.tr('Buy groceries, Call Mom...','Купить продукты...')+'">'
    +'<label>'+UI.tr('Priority','Приоритет')+'</label><select id="tPrio"><option value="normal">'+UI.tr('Normal','Обычный')+'</option><option value="high">'+UI.tr('High','Высокий')+'</option><option value="low">'+UI.tr('Low','Низкий')+'</option></select>'
    +'<label>'+UI.tr('Due Date (optional)','Срок (необяз.)')+'</label><input id="tDue" placeholder="2026-11-25">';
   UI.setSoftkeys(
    UI.tr('Cancel','Отмена'),function(){state.view='list';render();},
    UI.tr('Save','Сохр.'),function(){
     var txt=UI.byId('tText').value.trim();
     if(!txt){UI.notice(UI.tr('Enter task text','Введите текст задачи'));return;}
     tasks.push({id:String(Date.now()),text:txt,prio:UI.byId('tPrio').value,due:UI.byId('tDue').value.trim(),done:false});
     save();UI.notice(UI.tr('Added','Добавлено'));state.view='list';render();
    },
    UI.tr('Back','Назад'),function(){state.view='list';render();}
   );
   UI.focusFirst();
  }
 }
 function toggleTask(id){
  for(var i=0;i<tasks.length;i++)if(tasks[i].id===id){tasks[i].done=!tasks[i].done;save();render();return;}
 }
 UI.installKeys(function(e){
  if(state.view!=='list')return false;
  var order=['all','active','done'];
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();
   var idx=order.indexOf(state.filter);
   state.filter=order[(idx+(e.key==='ArrowRight'?1:2))%3];
   render();return true;
  }
  return false;
 });
 render();
})();
