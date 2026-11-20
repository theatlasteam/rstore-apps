(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.radio.stations.v1';
 var stations=UI.loadJSON(KEY,[
  {name:'SomaFM Groove Salad',genre:'Ambient / Chill',url:'https://ice1.somafm.com/groovesalad-128-mp3'},
  {name:'SomaFM Drone Zone',genre:'Space / Ambient',url:'https://ice1.somafm.com/dronezone-128-mp3'},
  {name:'SomaFM DEF CON Radio',genre:'Electronic / Hacker',url:'https://ice1.somafm.com/defcon-128-mp3'},
  {name:'SomaFM Lush',genre:'Dreamy / Vocals',url:'https://ice1.somafm.com/lush-128-mp3'},
  {name:'Nightwave Plaza',genre:'Vaporwave',url:'https://radio.plaza.one/mp3'}
 ]);
 var audio=new Audio();
 try{audio.mozAudioChannelType='content';}catch(e){}
 var state={view:'list',playing:null,status:'stopped'};

 audio.onplaying=function(){state.status='playing';renderStatus();};
 audio.onwaiting=function(){state.status='buffering';renderStatus();};
 audio.onpause=function(){state.status='stopped';renderStatus();};
 audio.onerror=function(){state.status='error';UI.notice(UI.tr('Stream error','Ошибка потока'));renderStatus();};

 function playStation(st){
  if(state.playing&&state.playing.url===st.url&&!audio.paused){
   audio.pause();state.status='stopped';render();return;
  }
  state.playing=st;state.status='buffering';
  audio.src=st.url;
  audio.play().catch(function(){state.status='error';renderStatus();});
  render();
 }
 function renderStatus(){
  if(state.view!=='list')return;
  UI.setTitle(UI.tr('Radio','Радио'),state.status==='playing'?'LIVE':state.status==='buffering'?'...':'');
  var box=UI.byId('nowPlaying');
  if(box&&state.playing){
   box.innerHTML='<strong>'+UI.esc(state.playing.name)+'</strong><br><span class="hint">'+UI.esc(state.status.toUpperCase()+' · '+state.playing.genre)+'</span>';
  }
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='list'){
   UI.setTitle(UI.tr('Radio','Радио'),state.status==='playing'?'LIVE':'');
   var h='<div id="nowPlaying" class="card">'+(state.playing?('<strong>'+UI.esc(state.playing.name)+'</strong><br><span class="hint">'+UI.esc(state.status.toUpperCase())+'</span>'):'<span class="hint">'+UI.tr('Select a station to listen','Выберите станцию для прослушивания')+'</span>')+'</div>';
   for(var i=0;i<stations.length;i++){
    var st=stations[i],act=(state.playing&&state.playing.url===st.url&&state.status!=='stopped');
    h+='<button class="row" data-idx="'+i+'"><strong>'+(act?'▶ ':'')+UI.esc(st.name)+'</strong><span>'+UI.esc(st.genre)+'</span></button>';
   }
   main.innerHTML=h;
   var rows=main.querySelectorAll('.row');
   for(var j=0;j<rows.length;j++)rows[j].onclick=function(){playStation(stations[Number(this.dataset.idx)]);};
   UI.setSoftkeys(
    UI.tr('Add','Доб.'),function(){state.view='add';render();},
    state.status==='playing'||state.status==='buffering'?UI.tr('Stop','Стоп'):UI.tr('Play','Играть'),function(){
     if(state.status==='playing'||state.status==='buffering'){audio.pause();state.status='stopped';render();}
     else if(document.activeElement&&document.activeElement.dataset.idx)document.activeElement.click();
     else if(stations.length)playStation(stations[0]);
    },
    UI.tr('Remove','Удал.'),function(){
     var el=document.activeElement;
     if(el&&el.dataset&&el.dataset.idx){
      stations.splice(Number(el.dataset.idx),1);
      UI.saveJSON(KEY,stations);render();
     }
    }
   );
   UI.focusFirst();
  }else{
   UI.setTitle(UI.tr('Add Station','Добавить станцию'));
   main.innerHTML='<label>'+UI.tr('Station Name','Название')+'</label><input id="sName" placeholder="My Station">'
    +'<label>'+UI.tr('Genre','Жанр')+'</label><input id="sGenre" placeholder="Chill / News">'
    +'<label>Stream URL (MP3/AAC)</label><input id="sUrl" type="url" placeholder="https://...">';
   UI.setSoftkeys(
    UI.tr('Cancel','Отмена'),function(){state.view='list';render();},
    UI.tr('Save','Сохр.'),function(){
     var name=UI.byId('sName').value.trim(),url=UI.byId('sUrl').value.trim();
     if(!url){UI.notice(UI.tr('Enter stream URL','Введите URL потока'));return;}
     stations.push({name:name||url,genre:UI.byId('sGenre').value.trim()||'Stream',url:url});
     UI.saveJSON(KEY,stations);UI.notice(UI.tr('Added','Добавлено'));state.view='list';render();
    },
    UI.tr('Back','Назад'),function(){state.view='list';render();}
   );
   UI.focusFirst();
  }
 }
 UI.installKeys();
 render();
})();
