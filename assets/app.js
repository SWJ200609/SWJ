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

/* ---------- 已掌握 ---------- */
var words=$$('.word');
var state=LS.get('ex_mark',{});
var TOTALS={};
words.forEach(function(w){
  if(!w.dataset.w){var s=w.querySelector('.w');w.dataset.w=s?s.textContent.trim():''}
  w._text=w.textContent.toLowerCase();
  var k=w.dataset.exam+':'+w.dataset.w;
  w.classList.toggle('marked',!!state[k]);
  var cb=w.querySelector('input[type=checkbox]');
  if(cb){
    cb.checked=!!state[k];
    cb.onchange=function(){
      state[k]=cb.checked;LS.set('ex_mark',state);
      w.classList.toggle('marked',cb.checked);
      renderStats();render();
    };
  }
});
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
var active={cet6:'all',ky2:'all'};
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
    pg.className='rp'+(it.kind==='w'?' '+it.r:' sec');
    pg.textContent=it.pg;
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
function gotoHash(){
  var h=location.hash.replace(/^#/,'');if(!h)return;
  try{h=decodeURIComponent(h)}catch(e){}
  var el=document.getElementById(h);if(!el)return;
  if(el.tagName==='DETAILS')el.open=true;
  el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
  setTimeout(function(){
    try{el.scrollIntoView({block:'start',behavior:'smooth'})}catch(e){el.scrollIntoView()}
  },90);
  setTimeout(function(){el.classList.remove('flash')},2800);
}

/* ---------- 载入全站搜索索引 ---------- */
function finish(){renderStats();render();gotoHash()}
if(window.fetch){
  fetch('assets/search-index.json',{cache:'force-cache'})
    .then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json()})
    .then(function(d){
      IDX=(d&&d.items)||[];
      if(d&&d.totals)TOTALS=d.totals;
      IDX.forEach(function(it){
        it._s=[it.rt,it.rg,it.t,it.pg].filter(Boolean).join(' ').toLowerCase();
      });
      finish();
    })
    .catch(finish);
}else finish();
})();
