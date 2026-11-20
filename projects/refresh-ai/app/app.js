(function(){
 'use strict';
 var UI=window.RefreshUI;
 var CFG_KEY='refresh.ai.cfg.v1',HIST_KEY='refresh.ai.hist.v1';
 var PRESETS={
  openai:{name:'OpenAI',url:'https://api.openai.com/v1/chat/completions',model:'gpt-4o-mini'},
  openrouter:{name:'OpenRouter',url:'https://openrouter.ai/api/v1/chat/completions',model:'google/gemini-2.0-flash-001'},
  groq:{name:'Groq',url:'https://api.groq.com/openai/v1/chat/completions',model:'llama-3.3-70b-versatile'},
  ollama:{name:'Local Ollama',url:'http://127.0.0.1:11434/v1/chat/completions',model:'llama3.2'}
 };
 var PERSONAS={
  assistant:'You are a helpful, concise assistant on a KaiOS feature phone. Keep answers clear and brief.',
  translator:'Translate the user text cleanly between English and Russian. Provide only the translation and a short note if needed.',
  coder:'You are a concise software engineering assistant. Give short, accurate answers and code snippets.'
 };
 var cfg=UI.loadJSON(CFG_KEY,{preset:'openai',url:PRESETS.openai.url,model:PRESETS.openai.model,key:'',persona:'assistant'});
 var history=UI.loadJSON(HIST_KEY,[]);
 var state={view:cfg.key||cfg.preset==='ollama'?'chat':'settings',busy:false,draft:''};

 function saveCfg(){UI.saveJSON(CFG_KEY,cfg);}
 function saveHist(){UI.saveJSON(HIST_KEY,history.slice(-24));}

 function sendPrompt(text){
  if(state.busy||!text)return;
  if(!cfg.url){UI.notice(UI.tr('Set API URL first','Укажите URL API'));state.view='settings';render();return;}
  history.push({role:'user',content:text});
  saveHist();
  state.busy=true;state.draft='';render();
  var msgs=[{role:'system',content:PERSONAS[cfg.persona]||PERSONAS.assistant}];
  var tail=history.slice(-10);
  for(var i=0;i<tail.length;i++)msgs.push(tail[i]);
  var headers={'Content-Type':'application/json'};
  if(cfg.key)headers['Authorization']='Bearer '+cfg.key;
  UI.xhr({
   method:'POST',
   url:cfg.url,
   timeout:30000,
   headers:headers,
   body:JSON.stringify({model:cfg.model||'gpt-4o-mini',messages:msgs,temperature:0.6,max_tokens:500})
  }).then(function(raw){
   state.busy=false;
   var data=JSON.parse(raw);
   var reply=(data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||'';
   if(!reply)throw new Error('Empty reply');
   history.push({role:'assistant',content:reply.trim()});
   saveHist();render();
  }).catch(function(err){
   state.busy=false;
   history.push({role:'assistant',content:'[Error] '+(err&&err.message?err.message:'Request failed')});
   saveHist();render();
  });
 }

 function render(){
  var main=UI.byId('main');
  if(state.view==='chat'){
   UI.setTitle('Refresh AI',state.busy?'...':(cfg.model||'').split('/').pop().slice(0,12));
   var h='';
   if(!history.length){
    h+='<div class="card"><h2>'+UI.tr('Ready to help','Готов помочь')+'</h2><p class="hint">'+UI.tr('Type a prompt below and press Center to send. Configure API key in Settings.','Введите запрос ниже и нажмите Центр. Настройте API-ключ в Настройках.')+'</p></div>';
   }else{
    for(var i=0;i<history.length;i++){
     var m=history[i];
     h+='<div class="msg '+UI.esc(m.role)+'" tabindex="0"><div class="role">'+(m.role==='user'?UI.tr('You','Вы'):'AI')+'</div>'+UI.esc(m.content)+'</div>';
    }
   }
   h+='<label>'+UI.tr('Message','Сообщение')+'</label>';
   h+='<textarea id="prompt" placeholder="'+UI.tr('Ask anything...','Спросите что угодно...')+'">'+UI.esc(state.draft)+'</textarea>';
   main.innerHTML=h;
   var p=UI.byId('prompt');
   p.oninput=function(){state.draft=p.value;};
   UI.setSoftkeys(
    UI.tr('Settings','Настр.'),function(){state.view='settings';render();},
    state.busy?UI.tr('Wait...','Ждите...'):UI.tr('Send','Отпр.'),function(){
     var val=(UI.byId('prompt')?UI.byId('prompt').value:state.draft).trim();
     if(!val){UI.notice(UI.tr('Enter a message','Введите сообщение'));if(UI.byId('prompt'))UI.byId('prompt').focus();return;}
     sendPrompt(val);
    },
    UI.tr('Clear','Очист.'),function(){
     history=[];saveHist();UI.notice(UI.tr('Chat cleared','Чат очищен'));render();
    }
   );
   p.focus();
   main.scrollTop=main.scrollHeight;
  }else{
   UI.setTitle(UI.tr('AI Settings','Настройки AI'));
   var s='<label>'+UI.tr('Provider Preset','Провайдер')+'</label><select id="preset">';
   Object.keys(PRESETS).forEach(function(k){
    s+='<option value="'+k+'"'+(cfg.preset===k?' selected':'')+'>'+UI.esc(PRESETS[k].name)+'</option>';
   });
   s+='<option value="custom"'+(cfg.preset==='custom'?' selected':'')+'>Custom</option></select>';
   s+='<label>API URL</label><input id="url" value="'+UI.esc(cfg.url)+'">';
   s+='<label>'+UI.tr('Model','Модель')+'</label><input id="model" value="'+UI.esc(cfg.model)+'">';
   s+='<label>'+UI.tr('API Key (stored locally)','API-ключ (локально)')+'</label><input id="key" type="password" value="'+UI.esc(cfg.key)+'">';
   s+='<label>'+UI.tr('Persona','Роль')+'</label><select id="persona">';
   s+='<option value="assistant"'+(cfg.persona==='assistant'?' selected':'')+'>'+UI.tr('Assistant','Ассистент')+'</option>';
   s+='<option value="translator"'+(cfg.persona==='translator'?' selected':'')+'>'+UI.tr('Translator EN/RU','Переводчик EN/RU')+'</option>';
   s+='<option value="coder"'+(cfg.persona==='coder'?' selected':'')+'>'+UI.tr('Code Helper','Программист')+'</option></select>';
   main.innerHTML=s;
   var presetEl=UI.byId('preset');
   presetEl.onchange=function(){
    var v=presetEl.value;
    if(PRESETS[v]){UI.byId('url').value=PRESETS[v].url;UI.byId('model').value=PRESETS[v].model;}
   };
   UI.setSoftkeys(
    UI.tr('Chat','Чат'),function(){state.view='chat';render();},
    UI.tr('Save','Сохр.'),function(){
     cfg.preset=UI.byId('preset').value;
     cfg.url=UI.byId('url').value.trim();
     cfg.model=UI.byId('model').value.trim();
     cfg.key=UI.byId('key').value.trim();
     cfg.persona=UI.byId('persona').value;
     saveCfg();UI.notice(UI.tr('Saved','Сохранено'));state.view='chat';render();
    },
    UI.tr('Back','Назад'),function(){state.view='chat';render();}
   );
   UI.focusFirst();
  }
 }
 UI.installKeys();
 render();
})();
