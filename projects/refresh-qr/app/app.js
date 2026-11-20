(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.qr.hist.v1';
 var hist=UI.loadJSON(KEY,['https://github.com/theatlasteam/rstore-apps']);
 var state={view:'input',mode:'text',text:hist[0]||'https://github.com/theatlasteam/rstore-apps',ssid:'',pass:''};

 function drawQR(text){
  var canvas=UI.byId('qrCanvas');if(!canvas)return;
  try{
   var m=window.RefreshQR.makeMatrix(text);
   var n=m.length,scale=Math.max(3,Math.floor(170/n)),sz=n*scale;
   canvas.width=sz;canvas.height=sz;
   var ctx=canvas.getContext('2d');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,sz,sz);
   ctx.fillStyle='#000000';
   for(var r=0;r<n;r++)for(var c=0;c<n;c++){
    if(m[r][c])ctx.fillRect(c*scale,r*scale,scale,scale);
   }
  }catch(e){UI.notice(e.message||'QR Error');}
 }
 function generate(txt){
  if(!txt){UI.notice(UI.tr('Enter text or URL','Введите текст или URL'));return;}
  state.text=txt;
  if(hist.indexOf(txt)<0){hist.unshift(txt);hist=hist.slice(0,12);UI.saveJSON(KEY,hist);}
  state.view='qr';render();
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='input'){
   UI.setTitle('Refresh QR');
   var h='<div class="tabs"><div class="tab'+(state.mode==='text'?' active':'')+'">'+UI.tr('Text / URL','Текст / URL')+'</div><div class="tab'+(state.mode==='wifi'?' active':'')+'">Wi-Fi</div></div>';
   if(state.mode==='text'){
    h+='<label>'+UI.tr('Text or URL (max ~130 chars)','Текст или URL (до ~130 симв.)')+'</label>';
    h+='<textarea id="qText">'+UI.esc(state.text)+'</textarea>';
   }else{
    h+='<label>'+UI.tr('Network Name (SSID)','Имя сети (SSID)')+'</label><input id="wSsid" value="'+UI.esc(state.ssid)+'">';
    h+='<label>'+UI.tr('Password','Пароль')+'</label><input id="wPass" value="'+UI.esc(state.pass)+'">';
   }
   h+='<p class="hint" style="margin-top:8px">'+UI.tr('Recent:','Недавние:')+'</p>';
   for(var i=0;i<hist.length;i++){
    h+='<button class="row" data-val="'+UI.esc(hist[i])+'"><strong>'+UI.esc(hist[i])+'</strong></button>';
   }
   main.innerHTML=h;
   var rows=main.querySelectorAll('.row');
   for(var j=0;j<rows.length;j++)rows[j].onclick=function(){generate(this.dataset.val);};
   UI.setSoftkeys(
    state.mode==='text'?'Wi-Fi':UI.tr('Text','Текст'),function(){state.mode=state.mode==='text'?'wifi':'text';render();},
    UI.tr('Generate','Создать'),function(){
     if(state.mode==='text')generate(UI.byId('qText').value.trim());
     else{
      var s=UI.byId('wSsid').value.trim(),p=UI.byId('wPass').value;
      if(!s){UI.notice(UI.tr('Enter SSID','Введите SSID'));return;}
      state.ssid=s;state.pass=p;
      generate('WIFI:T:WPA;S:'+s+';P:'+p+';;');
     }
    },
    UI.tr('Clear','Очист.'),function(){hist=[];UI.saveJSON(KEY,hist);render();}
   );
   UI.focusFirst();
  }else{
   UI.setTitle('QR Code');
   main.innerHTML='<div class="qr-center"><div class="qr-wrap"><canvas id="qrCanvas"></canvas></div><p class="hint" style="word-break:break-all">'+UI.esc(state.text)+'</p></div>';
   drawQR(state.text);
   UI.setSoftkeys('',null,'',null,UI.tr('Back','Назад'),function(){state.view='input';render();});
   main.focus();
  }
 }
 UI.installKeys();
 render();
})();
