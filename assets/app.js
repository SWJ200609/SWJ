/* ============================================================
   考点手册 · 网页版 交互脚本
   主题 / 侧栏抽屉 / 已掌握进度 / 分类筛选 / 全站搜索 / 深链定位
   ============================================================ */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
function $$(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
var SLUG=document.body.dataset.page||'';

/* ---------- 本地存储（file:// 下降级为内存，页面不崩） ---------- */
var storeOK=true, MEM={};
var LS={
  get:function(k,d){
    try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}
    catch(e){storeOK=false;return Object.prototype.hasOwnProperty.call(MEM,k)?MEM[k]:d}
  },
  set:function(k,v){
    try{localStorage.setItem(k,JSON.stringify(v))}
    catch(e){storeOK=false;MEM[k]=v}
  }
};

/* ---------- 主题（默认跟随系统，手动切换后以选择为准） ---------- */
var tBtn=$('#themeBtn'), tcMeta=document.getElementById('themeColor');
function setTheme(t){
  document.documentElement.dataset.theme=t;
  if(tBtn)tBtn.textContent=t==='dark'?'☀️':'🌙';
  if(tcMeta)tcMeta.setAttribute('content',t==='dark'?'#121218':'#faf9f7');
  LS.set('ex_theme',t);
}
var sysDark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(LS.get('ex_theme',null)||(sysDark?'dark':'light'));
if(tBtn)tBtn.onclick=function(){setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')};

/* ---------- 侧栏抽屉 ---------- */
var nav=$('#nav'), scrim=$('#scrim'), menuBtn=$('#menuBtn'), mobbar=$('#mobbar');
function openNav(v){
  if(!nav)return;
  nav.classList.toggle('open',v);
  if(scrim)scrim.classList.toggle('show',v);
  document.body.classList.toggle('nav-open',v);
}
if(menuBtn)menuBtn.onclick=function(){openNav(!nav.classList.contains('open'))};
if(mobbar)mobbar.onclick=function(){openNav(true)};
if(scrim)scrim.onclick=function(){openNav(false)};
var navList=$('#navList');
if(navList)navList.addEventListener('click',function(e){if(e.target.closest('a'))openNav(false)});

/* ---------- 已掌握 + 词卡初始化 ---------- */
var words=$$('.word');
var state=LS.get('ex_mark',{});
var TOTALS={};
var active={cet6:'all',ky2:'all'};

function dailyByExam(ex){
  for(var i=0;i<daily.length;i++){if(daily[i].exam===ex)return daily[i]}
  return null;
}
function markWord(w,checked){
  var k=w.dataset.exam+':'+w.dataset.w;
  state[k]=checked;LS.set('ex_mark',state);
  w.classList.toggle('marked',checked);
  renderStats();render();
  var d=dailyByExam(w.dataset.exam);
  if(d)renderDayStat(d);
}
/* 卡片初始化：静态核心词和每日词表都用同一个入口，所以两处的勾选/筛选行为完全一致 */
function initWord(w){
  if(!w.dataset.w){var s=w.querySelector('.w');w.dataset.w=s?s.textContent.trim():''}
  w._text=w.textContent.toLowerCase();
  var k=w.dataset.exam+':'+w.dataset.w;
  var on=!!state[k];
  w.classList.toggle('marked',on);
  var cb=w.querySelector('input[type=checkbox]');
  if(cb){
    cb.checked=on;
    cb.onchange=function(){markWord(w,cb.checked)};
  }
}
words.forEach(initWord);
function doneOf(ex){
  var n=0;
  for(var k in state){if(Object.prototype.hasOwnProperty.call(state,k)&&k.indexOf(ex+':')===0&&state[k])n++}
  return n;
}
function renderStats(){
  [['cet6','st-cet6','bar-cet6','mCet6','mbCet6'],
   ['ky2','st-ky2','bar-ky2','mKy2','mbKy2']].forEach(function(c){
    var ex=c[0];
    var total=TOTALS[ex]||words.filter(function(w){return w.dataset.exam===ex}).length;
    var done=doneOf(ex), pct=total?Math.round(done/total*100):0;
    $$('.'+c[1]).forEach(function(e){e.textContent=done+' / '+total});
    $$('.'+c[2]).forEach(function(e){e.style.width=pct+'%'});
    var mt=document.getElementById(c[3]), mb=document.getElementById(c[4]);
    if(mt)mt.textContent=done+'/'+total;
    if(mb)mb.style.width=pct+'%';
  });
  var note=$('#statNote');
  if(note)note.textContent=storeOK?'进度已自动保存（仅本机浏览器）':'进度暂存本页内存，刷新会丢失';
}

/* ---------- 播放读音（Web Speech API，无音频文件） ---------- */
var canSpeak=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
function speak(w){
  if(!w||!canSpeak)return;
  try{
    var u=new SpeechSynthesisUtterance(w);
    u.lang='en-US';u.rate=.9;
    speechSynthesis.cancel();speechSynthesis.speak(u);
  }catch(e){}
}
document.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('.say'):null;
  if(b){e.stopPropagation();speak(b.dataset.w)}
});

/* ---------- 每日词表（分页渲染） ---------- */
var daily=$$('.daily').map(function(d){
  var c={el:d, exam:d.dataset.exam, days:+d.dataset.days||0, per:+d.dataset.per||45,
         box:d.querySelector('#wordList'), stat:d.querySelector('#dayStat'),
         hint:d.querySelector('#wlHint'), day:1};
  return c;
});
function esc2(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function cardHTML(it){
  var w=esc2(it.rt||''), ipa=esc2(it.ipa||''), pos=esc2(it.pos||''),
      cn=esc2(it.rg||''), ex=esc2(it.ex||'');
  var s='<span class="w">'+w+'</span>';
  if(ipa)s+='<span class="ipa">'+ipa+'</span>';
  if(pos)s+='<span class="pos">'+pos+'</span>';
  s+='<button class="say" type="button" data-w="'+w+'">🔊</button>';
  s+='<span class="gloss">'+cn+'</span>';
  var b='<div class="card-body">';
  if(ex)b+='<p class="k"><b>搭配</b>'+ex+'</p>';
  b+='<label class="mark"><input type="checkbox"><span>已掌握</span></label></div>';
  return '<details class="word" data-exam="'+it.e+'" data-w="'+w+'" id="'+it.a+'">'+s+b+'</details>';
}
function renderDay(d){
  if(!d||!d.box||!d.days)return;
  // 换天会把旧卡从 DOM 里换掉，得先从 words 里清出去——
  // 否则筛选时那些看不见的旧卡也被算进「本页命中 N 条」
  for(var i=words.length-1;i>=0;i--){
    if(!document.contains(words[i]))words.splice(i,1);
  }
  var list=IDX.filter(function(it){return it.e===d.exam&&it.d===d.day});
  d.box.innerHTML=list.map(cardHTML).join('');
  Array.prototype.forEach.call(d.box.querySelectorAll('details.word'),function(w){
    initWord(w);words.push(w);
  });
}
function renderDayStat(d){
  if(!d||!d.stat)return;
  if(!d.days){d.stat.innerHTML='';return}
  var ex=d.exam, tot=TOTALS[ex]||0, done=doneOf(ex);
  var dn=IDX.filter(function(it){
    return it.e===ex&&it.d===d.day&&state[ex+':'+(it.rt||'')];
  }).length, n=IDX.filter(function(it){return it.e===ex&&it.d===d.day}).length;
  d.stat.innerHTML='<span>第 <b>'+d.day+'</b> / '+d.days+' 天 · 今天已掌握 <b>'+dn+'</b> / '+n
    +'</span><span>📊 '+ex+' 累计 '+done+' / '+tot+'</span>'
    +(dn===n&&n>0?'<span class="tag g">今天完成</span>':'<span class="tag">还差 '+(n-dn)+' 个</span>');
}
function setDay(d,day){
  if(!d||!d.days)return;
  day=Math.max(1,Math.min(d.days,day|0||1));
  d.day=day;
  if(d.in)d.in.value=day;
  if(d.prev)d.prev.disabled=day<=1;
  if(d.next)d.next.disabled=day>=d.days;
  LS.set('ex_day_'+d.exam,day);
  renderDay(d);renderDayStat(d);render();
}
/* 分页控件必须等索引就绪再绑：renderDay 靠 IDX 里那一条一条的 d 字段取今天的词 */
function initDaily(){
  daily.forEach(function(d){
    d.in=d.el.querySelector('#dayIn');
    d.prev=d.el.querySelector('#dayPrev');
    d.next=d.el.querySelector('#dayNext');
    var go=function(v){setDay(d,d.day+v)};
    if(d.prev)d.prev.onclick=function(){go(-1)};
    if(d.next)d.next.onclick=function(){go(1)};
    if(d.in){
      var f=function(){setDay(d,+d.in.value)};
      d.in.addEventListener('change',f);
      d.in.addEventListener('keydown',function(e){if(e.key==='Enter')f()});
    }
    setDay(d,LS.get('ex_day_'+d.exam,1));
  });
}

/* ---------- 展开全部 / 收起全部 ---------- */
$$('.acts button').forEach(function(btn){
  btn.onclick=function(){
    var sec=btn.closest('section');if(!sec)return;
    var open=btn.dataset.mode!=='open';
    btn.dataset.mode=open?'open':'close';
    btn.textContent=open?'收起全部':'展开全部';
    sec.querySelectorAll('details.word').forEach(function(d){d.open=open});
  };
});

/* ---------- 搜索 + 筛选 ---------- */
var q=$('#q'), clearBtn=$('#clearQ'), countEl=$('#count'), box=$('#results');
var IDX=[], t1, sel=-1;
function esc(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

function applyFilter(term){
  var rx=term?new RegExp(esc(term),'i'):null;
  if(clearBtn)clearBtn.classList.toggle('show',!!term);
  var hits=0;
  words.forEach(function(w){
    var exam=w.dataset.exam, key=exam+':'+w.dataset.w, f=active[exam];
    var okF=f==='all'
      ||(f==='hi'&&w.dataset.freq==='hi')
      ||(f==='done'&&!!state[key])
      ||(f==='todo'&&!state[key]);
    var hit=!rx||rx.test(w._text);
    if(hit)hits++;
    w.classList.toggle('hidden',!(okF&&hit));
  });
  // 整组没有可见卡片时，连分组标题一起藏掉
  $$('.grid').forEach(function(g){
    var vis=0;
    Array.prototype.forEach.call(g.children,function(c){if(!c.classList.contains('hidden'))vis++});
    var dead=!!term&&vis===0;
    g.classList.toggle('hidden',dead);
    var p=g.previousElementSibling, n=0;
    while(p&&n<2){if(p.tagName==='H3'){p.classList.toggle('hidden',dead);break}p=p.previousElementSibling;n++}
  });
  // 每日词表的网格没有分组标题，改成给一句提示而不是凭空消失
  daily.forEach(function(d){
    if(!d.box||!d.hint)return;
    var v=0;
    Array.prototype.forEach.call(d.box.children,function(c){if(!c.classList.contains('hidden'))v++});
    d.hint.classList.toggle('hidden',!(d.box.children.length>0&&v===0));
  });
  var pe=$('#pageEmpty');
  if(pe)pe.classList.toggle('hidden',!(term&&hits===0&&words.length>0));
  return hits;
}

function addMarked(el,text,term){
  var i=text.toLowerCase().indexOf(term);
  if(i<0){el.textContent=text;return}
  el.appendChild(document.createTextNode(text.slice(0,i)));
  var m=document.createElement('mark');m.textContent=text.slice(i,i+term.length);el.appendChild(m);
  el.appendChild(document.createTextNode(text.slice(i+term.length)));
}
function renderResults(term,hits){
  if(!box)return;
  if(!term){box.classList.remove('show');while(box.firstChild)box.removeChild(box.firstChild);return}
  var rx=new RegExp(esc(term),'i');
  var list=IDX.filter(function(it){return rx.test(it._s)})
    .map(function(it){return {it:it, sc:(it.rt||'').toLowerCase().indexOf(term)}})
    .sort(function(a,b){return a.sc-b.sc})
    .slice(0,12);
  while(box.firstChild)box.removeChild(box.firstChild);
  list.forEach(function(o){
    var it=o.it;
    var a=document.createElement('a');
    a.className='r';
    a.href=it.p+(it.a?'#'+encodeURIComponent(it.a):'');
    var ic=document.createElement('span');ic.className='ic';ic.textContent=it.ic||'📄';
    var tx=document.createElement('div');tx.className='tx';
    var t=document.createElement('div');t.className='rt';addMarked(t,it.rt||'(无标题)',term);tx.appendChild(t);
    if(it.rg){var g=document.createElement('div');g.className='rg';g.textContent=it.rg;tx.appendChild(g)}
    var pg=document.createElement('span');
    /* 每日词表的 r 是空串（没有频率分层），给它 .sec 的蓝色底，
       好在搜索结果里和核心词的灰色徽章一眼分开 */
    pg.className='rp'+(it.kind==='w'?(it.r?' '+it.r:' sec'):' sec');
    pg.textContent=it.d?(it.pg+' · 第'+it.d+'天'):it.pg;
    a.appendChild(ic);a.appendChild(tx);a.appendChild(pg);
    a.addEventListener('click',function(){box.classList.remove('show');openNav(false)});
    box.appendChild(a);
  });
  var f=document.createElement('div');f.className='res-foot';
  f.textContent=list.length
    ?('本页命中 '+hits+' 条 · 全站前 '+list.length+' 条 · 回车打开第一条 / ↑↓ 选择')
    :('全站没有匹配「'+term+'」的内容');
  box.appendChild(f);
  box.classList.add('show');
}
function closeResults(){if(box)box.classList.remove('show');sel=-1}

function render(){
  var term=q?q.value.trim().toLowerCase():'';
  var hits=applyFilter(term);
  renderResults(term,hits);
  if(countEl){
    countEl.hidden=!!(term&&box&&box.classList.contains('show'));
    countEl.textContent=term
      ?(hits?'本页命中 '+hits+' 条':'本页无匹配')
      :(active.cet6!=='all'||active.ky2!=='all'?'按筛选显示':'');
  }
  if(term&&words.length)words.forEach(function(w){if(!w.classList.contains('hidden'))w.open=true});
}

$$('.pill-row').forEach(function(row){
  row.querySelectorAll('.chip').forEach(function(ch){
    ch.onclick=function(){
      row.querySelectorAll('.chip').forEach(function(c){c.classList.remove('on')});
      ch.classList.add('on');
      active[ch.dataset.exam]=ch.dataset.filter;
      render();
    };
  });
});
if(q){
  q.addEventListener('input',function(){clearTimeout(t1);t1=setTimeout(render,130)});
  q.addEventListener('keydown',function(e){
    if(e.key==='Escape'){q.value='';render();closeResults();return}
    var links=$$('#results a.r');
    if(!links.length)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      sel=(sel+(e.key==='ArrowDown'?1:-1)+links.length)%links.length;
      links.forEach(function(l,i){l.classList.toggle('sel',i===sel)});
      links[sel].scrollIntoView({block:'nearest'});
    } else if(e.key==='Enter'){
      var t=links[sel>=0?sel:0];if(t)location.href=t.href;
    }
  });
  if(clearBtn)clearBtn.onclick=function(){q.value='';render();q.focus()};
}
document.addEventListener('click',function(e){
  if(box&&box.classList.contains('show')
     &&!e.target.closest('.search')&&!e.target.closest('#results'))closeResults();
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')openNav(false)});

/* ---------- 本节小目录高亮 ---------- */
var tocLinks=$$('.toc2 a'), tmap={};
tocLinks.forEach(function(a){tmap[a.getAttribute('href').slice(1)]=a});
if(tocLinks.length&&'IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(en.isIntersecting){
        tocLinks.forEach(function(l){l.classList.remove('on')});
        var l=tmap[en.target.id];if(l)l.classList.add('on');
      }
    });
  },{rootMargin:'-12% 0px -72% 0px'});
  Object.keys(tmap).forEach(function(id){var e=document.getElementById(id);if(e)io.observe(e)});
}

/* ---------- 深链：#word / #小节 定位并展开 ---------- */
function flash(el){
  el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
  setTimeout(function(){
    try{el.scrollIntoView({block:'start',behavior:'smooth'})}catch(e){el.scrollIntoView()}
  },90);
  setTimeout(function(){el.classList.remove('flash')},2800);
}
function gotoHash(){
  var h=location.hash.replace(/^#/,'');if(!h)return;
  try{h=decodeURIComponent(h)}catch(e){}
  var el=document.getElementById(h);
  if(el){
    if(el.tagName==='DETAILS')el.open=true;
    flash(el);
    return;
  }
  // 每日词表的锚点只在索引数据里（卡片按需渲染），先切到那一天再定位
  var it=null;
  for(var i=0;i<IDX.length;i++){if(IDX[i].a===h){it=IDX[i];break}}
  if(!it||!it.d)return;
  var d=dailyByExam(it.e);
  if(!d)return;
  if(d.day!==it.d)setDay(d,it.d);else renderDayStat(d);
  var t2=document.getElementById(h);
  if(!t2)return;
  t2.open=true;
  flash(t2);
}

/* ---------- 载入全站搜索索引 ---------- */
/* 顺序有讲究：initDaily 先渲染今天的词，render 再给动态加的卡补上筛选后的隐藏状态，
   最后才处理深链 —— 深链可能再切一次天数，那一次 setDay 内部自己会补跑 render */
function finish(){renderStats();initDaily();render();gotoHash()}
if(window.fetch){
  fetch('assets/search-index.json',{cache:'force-cache'})
    .then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json()})
    .then(function(d){
      IDX=(d&&d.items)||[];
      if(d&&d.totals)TOTALS=d.totals;
      IDX.forEach(function(it){
        /* ex（英文搭配）也进搜索面，这样 "carbon emissions" 也能搜到 carbon */
        it._s=[it.rt,it.rg,it.t,it.ex,it.pg].filter(Boolean).join(' ').toLowerCase();
      });
      finish();
    })
    .catch(finish);
}else finish();
})();
