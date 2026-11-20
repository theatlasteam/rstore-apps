(function(){
 'use strict';
 var UI=window.RefreshUI;
 var FEEDS_KEY='refresh.rss.feeds.v1',CACHE_KEY='refresh.rss.cache.v1';
 var feeds=UI.loadJSON(FEEDS_KEY,[
  {name:'Hacker News',url:'https://hnrss.org/frontpage'},
  {name:'Lobsters',url:'https://lobste.rs/rss'},
  {name:'BBC World',url:'https://feeds.bbci.co.uk/news/world/rss.xml'}
 ]);
 var cache=UI.loadJSON(CACHE_KEY,{});
 var state={view:'feeds',feed:null,items:[],article:null,busy:false};

 function stripHtml(s){
  return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
 }
 function parseFeed(xmlText){
  var parser=new DOMParser();
  var doc=parser.parseFromString(xmlText,'text/xml');
  var nodes=doc.querySelectorAll('item, entry');
  var out=[];
  for(var i=0;i<nodes.length&&i<25;i++){
   var n=nodes[i];
   var tEl=n.querySelector('title'),dEl=n.querySelector('description, summary, content'),lEl=n.querySelector('link'),pEl=n.querySelector('pubDate, updated, published');
   var link=lEl?(lEl.getAttribute('href')||lEl.textContent||''):'';
   out.push({
    title:stripHtml(tEl?tEl.textContent:'Untitled'),
    body:stripHtml(dEl?dEl.textContent:''),
    link:link.trim(),
    date:pEl?stripHtml(pEl.textContent).slice(0,22):''
   });
  }
  return out;
 }
 function openFeed(f){
  state.feed=f;state.items=cache[f.url]||[];state.view='items';state.busy=true;render();
  UI.xhr({url:f.url,timeout:12000}).then(function(txt){
   state.busy=false;
   var parsed=parseFeed(txt);
   if(parsed.length){state.items=parsed;cache[f.url]=parsed;UI.saveJSON(CACHE_KEY,cache);}
   render();
  }).catch(function(err){
   state.busy=false;
   UI.notice(UI.tr('Offline/error: ','Ошибка/офлайн: ')+(err&&err.message||''));
   render();
  });
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='feeds'){
   UI.setTitle('Refresh RSS',String(feeds.length));
   var h='';
   for(var i=0;i<feeds.length;i++){
    h+='<button class="row" data-idx="'+i+'"><strong>'+UI.esc(feeds[i].name)+'</strong><span>'+UI.esc(feeds[i].url)+'</span></button>';
   }
   main.innerHTML=h||'<div class="empty">'+UI.tr('No feeds','Нет лент')+'</div>';
   var rows=main.querySelectorAll('.row');
   for(var j=0;j<rows.length;j++)rows[j].onclick=function(){openFeed(feeds[Number(this.dataset.idx)]);};
   UI.setSoftkeys(
    UI.tr('Add','Доб.'),function(){state.view='add';render();},
    UI.tr('Open','Открыть'),function(){if(document.activeElement&&document.activeElement.dataset.idx)document.activeElement.click();},
    UI.tr('Remove','Удал.'),function(){
     var el=document.activeElement;
     if(el&&el.dataset&&el.dataset.idx){
      feeds.splice(Number(el.dataset.idx),1);
      UI.saveJSON(FEEDS_KEY,feeds);render();
     }
    }
   );
   UI.focusFirst();
  }else if(state.view==='items'){
   UI.setTitle(state.feed.name,state.busy?'...':String(state.items.length));
   var s='';
   if(!state.items.length)s='<div class="empty">'+(state.busy?UI.tr('Loading feed...','Загрузка...'):UI.tr('No articles','Нет статей'))+'</div>';
   else for(var k=0;k<state.items.length;k++){
    var it=state.items[k];
    s+='<button class="row" data-idx="'+k+'"><strong>'+UI.esc(it.title)+'</strong><span>'+UI.esc(it.date||it.body.slice(0,42))+'</span></button>';
   }
   main.innerHTML=s;
   var irows=main.querySelectorAll('.row');
   for(var r=0;r<irows.length;r++)irows[r].onclick=function(){state.article=state.items[Number(this.dataset.idx)];state.view='article';render();};
   UI.setSoftkeys(
    UI.tr('Refresh','Обнов.'),function(){openFeed(state.feed);},
    UI.tr('Read','Читать'),function(){if(document.activeElement&&document.activeElement.dataset.idx)document.activeElement.click();},
    UI.tr('Back','Назад'),function(){state.view='feeds';render();}
   );
   UI.focusFirst();
  }else if(state.view==='article'){
   var a=state.article;
   UI.setTitle(state.feed.name);
   main.innerHTML='<div class="card"><h2>'+UI.esc(a.title)+'</h2>'
    +(a.date?'<p class="hint">'+UI.esc(a.date)+'</p>':'')
    +'<p>'+UI.esc(a.body||UI.tr('No summary in feed.','Нет описания в ленте.'))+'</p>'
    +(a.link?'<a class="btn" href="'+UI.esc(a.link)+'" target="_blank">'+UI.tr('Open in Browser','Открыть в браузере')+'</a>':'')
    +'</div>';
   UI.setSoftkeys('',null,'',null,UI.tr('Back','Назад'),function(){state.view='items';render();});
   UI.focusFirst();
  }else{
   UI.setTitle(UI.tr('Add Feed','Добавить ленту'));
   main.innerHTML='<label>'+UI.tr('Name','Название')+'</label><input id="fName" placeholder="Tech Blog">'
    +'<label>RSS / Atom URL</label><input id="fUrl" type="url" placeholder="https://example.com/rss.xml">';
   UI.setSoftkeys(
    UI.tr('Cancel','Отмена'),function(){state.view='feeds';render();},
    UI.tr('Save','Сохр.'),function(){
     var name=UI.byId('fName').value.trim(),url=UI.byId('fUrl').value.trim();
     if(!url){UI.notice(UI.tr('Enter URL','Введите URL'));return;}
     feeds.push({name:name||url,url:url});
     UI.saveJSON(FEEDS_KEY,feeds);UI.notice(UI.tr('Added','Добавлено'));state.view='feeds';render();
    },
    UI.tr('Back','Назад'),function(){state.view='feeds';render();}
   );
   UI.focusFirst();
  }
 }
 UI.installKeys();
 render();
})();
