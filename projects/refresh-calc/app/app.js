(function(){
 'use strict';
 var UI=window.RefreshUI;
 var KEY='refresh.calc.hist.v1';
 var history=UI.loadJSON(KEY,[]);
 var state={expr:'',res:'0',view:'calc'};
 var BUTTONS=['C','(',')','/','7','8','9','*','4','5','6','-','1','2','3','+','0','.','^','=','sqrt(','%','pi','DEL'];

 function evalExpr(raw){
  var s=String(raw||'').replace(/\s+/g,'').replace(/pi/gi,String(Math.PI));
  if(!s)return 0;
  var pos=0;
  function peek(){return s.charAt(pos);}
  function num(){
   var start=pos;
   if(s.slice(pos,pos+5)==='sqrt('){
    pos+=5;var v=expr();if(peek()===')')pos++;return Math.sqrt(v);
   }
   if(peek()==='('){pos++;var inside=expr();if(peek()!==')')throw new Error('Paren');pos++;return inside;}
   if(peek()==='-'){pos++;return -num();}
   if(peek()==='+'){pos++;return num();}
   while(/[0-9.]/.test(peek()))pos++;
   if(pos===start)throw new Error('Syntax');
   var n=parseFloat(s.slice(start,pos));
   if(isNaN(n))throw new Error('NaN');
   return n;
  }
  function pow(){
   var left=num();
   while(peek()==='^'){pos++;left=Math.pow(left,num());}
   return left;
  }
  function term(){
   var left=pow();
   while(peek()==='*'||peek()==='/'||peek()==='%'){
    var op=peek();pos++;var right=pow();
    if(op==='*')left*=right;
    else if(op==='/'){if(right===0)throw new Error('Div0');left/=right;}
    else left%=right;
   }
   return left;
  }
  function expr(){
   var left=term();
   while(peek()==='+'||peek()==='-'){
    var op=peek();pos++;var right=term();
    if(op==='+')left+=right;else left-=right;
   }
   return left;
  }
  var out=expr();
  if(pos!==s.length)throw new Error('Trailing');
  if(!isFinite(out))throw new Error('Inf');
  return Math.round(out*1e10)/1e10;
 }

 function press(tok){
  if(tok==='C'){state.expr='';state.res='0';render();return;}
  if(tok==='DEL'){state.expr=state.expr.slice(0,-1);updatePreview();return;}
  if(tok==='='){
   try{
    var val=evalExpr(state.expr||'0');
    history.unshift({expr:state.expr||'0',res:String(val)});
    history=history.slice(0,20);
    UI.saveJSON(KEY,history);
    state.res=String(val);
    state.expr=String(val);
   }catch(e){state.res=UI.tr('Error','Ошибка');}
   render();return;
  }
  state.expr+=tok;
  updatePreview();
 }
 function updatePreview(){
  try{if(state.expr)state.res=String(evalExpr(state.expr));else state.res='0';}catch(e){}
  var ex=UI.byId('cExpr'),rs=UI.byId('cRes');
  if(ex)ex.textContent=state.expr||'0';
  if(rs)rs.textContent=state.res;
 }
 function render(){
  var main=UI.byId('main');
  if(state.view==='calc'){
   UI.setTitle(UI.tr('Calculator','Калькулятор'));
   var h='<div class="calc-disp"><div id="cExpr" class="calc-expr">'+UI.esc(state.expr||'0')+'</div><div id="cRes" class="calc-res">'+UI.esc(state.res)+'</div></div>';
   h+='<div class="pad">';
   for(var i=0;i<BUTTONS.length;i++){
    h+='<button class="kbtn" data-k="'+UI.esc(BUTTONS[i])+'">'+UI.esc(BUTTONS[i])+'</button>';
   }
   h+='</div>';
   main.innerHTML=h;
   var btns=main.querySelectorAll('.kbtn');
   for(var j=0;j<btns.length;j++)btns[j].onclick=function(){press(this.dataset.k);};
   UI.setSoftkeys(
    UI.tr('History','История'),function(){state.view='hist';render();},
    '=',function(){press('=');},
    'DEL',function(){press('DEL');}
   );
   UI.focusFirst();
  }else{
   UI.setTitle(UI.tr('History','История'),String(history.length));
   var s='';
   if(!history.length)s='<div class="empty">'+UI.tr('No history yet','История пуста')+'</div>';
   else for(var k=0;k<history.length;k++){
    s+='<button class="row" data-idx="'+k+'"><strong>= '+UI.esc(history[k].res)+'</strong><span>'+UI.esc(history[k].expr)+'</span></button>';
   }
   main.innerHTML=s;
   var rows=main.querySelectorAll('.row');
   for(var r=0;r<rows.length;r++)rows[r].onclick=function(){
    var item=history[Number(this.dataset.idx)];
    state.expr=item.res;state.res=item.res;state.view='calc';render();
   };
   UI.setSoftkeys(
    UI.tr('Clear','Очист.'),function(){history=[];UI.saveJSON(KEY,history);render();},
    UI.tr('Use','Вставить'),function(){if(document.activeElement&&document.activeElement.dataset.idx)document.activeElement.click();},
    UI.tr('Back','Назад'),function(){state.view='calc';render();}
   );
   UI.focusFirst();
  }
 }
 UI.installKeys(function(e){
  if(state.view!=='calc')return false;
  if(/^[0-9+\-*/().%^]$/.test(e.key)){e.preventDefault();press(e.key);return true;}
  if(e.key==='*'){e.preventDefault();press('*');return true;}
  if(e.key==='#'){e.preventDefault();press('.');return true;}
  return false;
 });
 render();
})();
