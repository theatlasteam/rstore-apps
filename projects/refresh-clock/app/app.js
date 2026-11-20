(function(){
 'use strict';
 var UI=window.RefreshUI;
 var ZONES=[
  {name:'Local',tz:null},
  {name:'UTC',tz:'UTC'},
  {name:'London',tz:'Europe/London'},
  {name:'Moscow',tz:'Europe/Moscow'},
  {name:'New York',tz:'America/New_York'},
  {name:'Tokyo',tz:'Asia/Tokyo'}
 ];
 var state={tab:'world',swRunning:false,swElapsed:0,swStart:0,laps:[],tmSec:300,tmLeft:300,tmRunning:false,tmLast:0};
 function pad(n){return n<10?'0'+n:String(n);}
 function fmtMs(ms){
  var s=Math.floor(ms/1000),m=Math.floor(s/60),h=Math.floor(m/60);
  var cs=Math.floor((ms%1000)/10);
  return (h?pad(h)+':':'')+pad(m%60)+':'+pad(s%60)+'.'+pad(cs);
 }
 function fmtSec(sec){
  var m=Math.floor(sec/60),s=sec%60;
  return pad(m)+':'+pad(s);
 }
 function beep(){
  try{
   var Ctx=window.AudioContext||window.webkitAudioContext;
   if(!Ctx)return;
   var ctx=new Ctx(),osc=ctx.createOscillator(),g=ctx.createGain();
   osc.frequency.value=880;osc.connect(g);g.connect(ctx.destination);
   osc.start();setTimeout(function(){osc.stop();ctx.close();},400);
  }catch(e){}
  if(navigator.vibrate)navigator.vibrate([200,100,200]);
 }
 function zoneTime(tz){
  var d=new Date();
  try{
   if(!tz)return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
   return d.toLocaleTimeString([],{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }catch(e){return d.toTimeString().slice(0,8);}
 }
 function tabsHtml(){
  return '<div class="tabs">'
   +'<div class="tab'+(state.tab==='world'?' active':'')+'">'+UI.tr('World','Мир')+'</div>'
   +'<div class="tab'+(state.tab==='sw'?' active':'')+'">'+UI.tr('Stopwatch','Секунд.')+'</div>'
   +'<div class="tab'+(state.tab==='timer'?' active':'')+'">'+UI.tr('Timer','Таймер')+'</div></div>';
 }
 function render(){
  var main=UI.byId('main');
  UI.setTitle(UI.tr('Clock','Часы'));
  if(state.tab==='world'){
   var h=tabsHtml();
   for(var i=0;i<ZONES.length;i++){
    var z=ZONES[i];
    h+='<div class="card" style="display:flex;justify-content:space-between;align-items:center"><strong>'+UI.esc(z.name)+'</strong><span class="mono" data-tz="'+(z.tz||'')+'">'+zoneTime(z.tz)+'</span></div>';
   }
   main.innerHTML=h;
   UI.setSoftkeys('',null,'',null,UI.tr('Stopwatch','Секунд.'),function(){state.tab='sw';render();});
   main.focus();
  }else if(state.tab==='sw'){
   var cur=state.swRunning?(state.swElapsed+(Date.now()-state.swStart)):state.swElapsed;
   var s=tabsHtml()+'<div class="card"><div id="swDisp" class="big-time">'+fmtMs(cur)+'</div></div>';
   for(var j=state.laps.length-1;j>=0;j--){
    s+='<div class="card" style="display:flex;justify-content:space-between"><span>#'+(j+1)+'</span><strong class="mono">'+fmtMs(state.laps[j])+'</strong></div>';
   }
   main.innerHTML=s;
   UI.setSoftkeys(
    state.swRunning?UI.tr('Lap','Круг'):UI.tr('Reset','Сброс'),function(){
     if(state.swRunning){state.laps.push(state.swElapsed+(Date.now()-state.swStart));render();}
     else{state.swElapsed=0;state.laps=[];render();}
    },
    state.swRunning?UI.tr('Pause','Пауза'):UI.tr('Start','Старт'),function(){
     if(state.swRunning){state.swElapsed+=Date.now()-state.swStart;state.swRunning=false;}
     else{state.swStart=Date.now();state.swRunning=true;}
     render();
    },
    UI.tr('Timer','Таймер'),function(){state.tab='timer';render();}
   );
   main.focus();
  }else{
   var t=tabsHtml()+'<div class="card"><div id="tmDisp" class="big-time">'+fmtSec(state.tmLeft)+'</div></div>';
   var presets=[60,180,300,600,1500];
   for(var p=0;p<presets.length;p++){
    var sec=presets[p];
    t+='<button class="row" data-sec="'+sec+'"><strong>'+(sec/60)+' '+UI.tr('min','мин')+'</strong></button>';
   }
   main.innerHTML=t;
   var rows=main.querySelectorAll('.row');
   for(var r=0;r<rows.length;r++){
    rows[r].onclick=function(){
     state.tmRunning=false;state.tmSec=Number(this.dataset.sec);state.tmLeft=state.tmSec;render();
    };
   }
   UI.setSoftkeys(
    UI.tr('Reset','Сброс'),function(){state.tmRunning=false;state.tmLeft=state.tmSec;render();},
    state.tmRunning?UI.tr('Pause','Пауза'):UI.tr('Start','Старт'),function(){
     if(state.tmRunning){state.tmRunning=false;}
     else{if(state.tmLeft<=0)state.tmLeft=state.tmSec;state.tmLast=Date.now();state.tmRunning=true;}
     render();
    },
    UI.tr('World','Мир'),function(){state.tab='world';render();}
   );
   UI.focusFirst();
  }
 }
 setInterval(function(){
  if(state.tab==='world'){
   var spans=document.querySelectorAll('[data-tz]');
   for(var i=0;i<spans.length;i++)spans[i].textContent=zoneTime(spans[i].dataset.tz||null);
  }
  if(state.swRunning){
   var d=UI.byId('swDisp');
   if(d)d.textContent=fmtMs(state.swElapsed+(Date.now()-state.swStart));
  }
  if(state.tmRunning){
   var now=Date.now();
   if(now-state.tmLast>=1000){
    var step=Math.floor((now-state.tmLast)/1000);
    state.tmLast+=step*1000;
    state.tmLeft=Math.max(0,state.tmLeft-step);
    var td=UI.byId('tmDisp');if(td)td.textContent=fmtSec(state.tmLeft);
    if(state.tmLeft===0){state.tmRunning=false;beep();UI.notice(UI.tr('Timer finished!','Таймер завершён!'),4000);render();}
   }
  }
 },100);
 UI.installKeys(function(e){
  var order=['world','sw','timer'];
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
   e.preventDefault();
   var idx=order.indexOf(state.tab);
   state.tab=order[(idx+(e.key==='ArrowRight'?1:2))%3];
   render();return true;
  }
  return false;
 });
 render();
})();
