const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = JSON.parse(localStorage.getItem('krReadingState') || '{"completed":{},"tasks":{},"mistakes":[],"currentLevel":"A0"}');
function save(){ localStorage.setItem('krReadingState', JSON.stringify(state)); renderAll(); }
function unlockedLevels(){ const done = Object.keys(state.completed).length; return LEVELS.filter(l=>done>=l.unlock).map(l=>l.id); }
function levelBooks(level){ return BOOKS.filter(b=>b.level===level); }
function currentLevel(){ const unlocked = unlockedLevels(); const firstOpen = LEVELS.find(l=>unlocked.includes(l.id) && levelBooks(l.id).some(b=>!state.completed[b.id])); return firstOpen?.id || unlocked.at(-1) || 'A0'; }
function task(bookId, key){ return state.tasks[bookId]?.[key]; }
function setTask(bookId, key, val=true){ state.tasks[bookId] ||= {}; state.tasks[bookId][key]=val; }

function showMode(mode){
  $$('.mode').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#' + mode + 'View').classList.add('active');
}
$$('.mode').forEach(btn=>btn.onclick=()=>showMode(btn.dataset.mode));
$('#backBtn').onclick=()=>showMode('library');
$('#resetBtn').onclick=()=>{ if(confirm('确定清除这个浏览器里的学习进度吗？')){ localStorage.removeItem('krReadingState'); location.reload(); }};

function renderLevels(){
 const unlocked = unlockedLevels();
 $('#levelList').innerHTML = LEVELS.map(l=>{
  const total=levelBooks(l.id).length, done=levelBooks(l.id).filter(b=>state.completed[b.id]).length;
  return `<div class="level-item ${unlocked.includes(l.id)?'':'locked'}"><span>${l.name}</span><b>${done}/${total}</b></div>`
 }).join('');
 const lvl=currentLevel(); state.currentLevel=lvl; $('#currentLevelPill').textContent='Level '+lvl;
 const total=levelBooks(lvl).length || 1, done=levelBooks(lvl).filter(b=>state.completed[b.id]).length;
 $('#levelProgressBar').style.width=(done/total*100)+'%'; $('#levelProgressText').textContent=`${lvl} 完成 ${done} / ${total}`;
}

function renderBooks(){
 const unlocked = unlockedLevels();
 $('#bookGrid').innerHTML = BOOKS.map(b=>{
  const locked=!unlocked.includes(b.level), done=!!state.completed[b.id];
  return `<div class="card book ${locked?'locked':''}">
    <div><div class="cover">${b.icon}</div><p class="eyebrow">${b.level} · ${b.genre} · ${b.words} words</p><h2>${b.title}</h2><small>${locked?'完成前一等级后解锁':'点击进入阅读任务'}</small>
    <div class="badges"><span class="badge ${task(b.id,'listen')?'done':''}">🎧 Listen</span><span class="badge ${task(b.id,'read')?'done':''}">👀 Read</span><span class="badge ${task(b.id,'quiz')?'done':''}">✅ Quiz</span></div></div>
    <button ${locked?'disabled':''} onclick="openBook('${b.id}')">${done?'复习':'开始'}</button>
  </div>`
 }).join('');
}

window.openBook = function(id){
 const b=BOOKS.find(x=>x.id===id); window.activeBook=b;
 $('#readerLevel').textContent=`${b.level} · ${b.genre} · ${b.words} words`; $('#readerTitle').textContent=b.title; $('#readerMeta').textContent='目标：听一遍 → 自读一遍 → Quiz 80% 以上';
 $('#readerText').innerHTML=b.text.map(p=>`<p>${p}</p>`).join('');
 $('#readerSupport').innerHTML='<ul>'+b.support.map(s=>`<li>${s}</li>`).join('')+'</ul>';
 $('#quizBox').classList.add('hidden'); $('#quizResult').textContent=''; updateReaderBadges(); showMode('reader');
}
function updateReaderBadges(){ const b=window.activeBook; if(!b) return; [['listen','listenBadge'],['read','readBadge'],['quiz','quizBadge']].forEach(([k,id])=>$('#'+id).classList.toggle('done',!!task(b.id,k))); }
$('#listenBtn').onclick=()=>{ const b=window.activeBook; const u=new SpeechSynthesisUtterance(b.text.join(' ')); u.lang='ko-KR'; speechSynthesis.cancel(); speechSynthesis.speak(u); setTask(b.id,'listen'); save(); updateReaderBadges(); };
$('#markReadBtn').onclick=()=>{ setTask(window.activeBook.id,'read'); save(); updateReaderBadges(); };
$('#showQuizBtn').onclick=()=>renderQuiz(window.activeBook);
function renderQuiz(b){
 $('#quizBox').classList.remove('hidden'); $('#quizQuestions').innerHTML=b.quiz.map((q,i)=>`<div class="quiz-q"><b>${i+1}. ${q.q}</b>${q.choices.map((c,j)=>`<label><input type="radio" name="q${i}" value="${j}"> ${c}</label>`).join('')}</div>`).join('');
}
$('#submitQuizBtn').onclick=()=>{ const b=window.activeBook; let correct=0; const wrong=[]; b.quiz.forEach((q,i)=>{ const picked=$(`input[name=q${i}]:checked`); const val=picked?Number(picked.value):-1; if(val===q.answer) correct++; else wrong.push({book:b.title, level:b.level, q:q.q, answer:q.choices[q.answer], skill:q.skill, date:new Date().toISOString().slice(0,10)}); }); const score=Math.round(correct/b.quiz.length*100); $('#quizResult').textContent=`得分 ${score}%：${score>=80?'通过！本篇完成 🎉':'未通过，错题已进入复习池。'}`; $('#quizResult').style.color=score>=80?'var(--ok)':'var(--bad)'; if(wrong.length) state.mistakes.push(...wrong); if(score>=80){ setTask(b.id,'quiz'); state.completed[b.id]=true; } save(); updateReaderBadges(); };

function renderTopics(){
 $('#topicSelect').innerHTML=TOPICS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
 $('#topicSelect').onchange=()=>drawTopic($('#topicSelect').value); drawTopic(TOPICS[0].id);
}
function drawTopic(id){ const t=TOPICS.find(x=>x.id===id); $('#topicVersions').innerHTML=Object.entries(t.versions).map(([lvl,txt])=>`<div class="version"><p class="eyebrow">${lvl}</p><p class="korean-mini">${txt}</p><button onclick="speak('${txt.replaceAll("'","\\'")}')">🎧 听这一版</button></div>`).join(''); }
window.speak=function(txt){ const u=new SpeechSynthesisUtterance(txt); u.lang='ko-KR'; speechSynthesis.cancel(); speechSynthesis.speak(u); };

function renderReview(){
 if(!state.mistakes.length){ $('#reviewList').innerHTML='<p>目前没有错题。做几篇 Quiz 后这里会自动出现复习内容。</p>'; return; }
 $('#reviewList').innerHTML=state.mistakes.slice().reverse().map((m,i)=>`<div class="quiz-q"><p class="eyebrow">${m.level} · ${m.skill} · ${m.date}</p><b>${m.q}</b><p>正确答案：${m.answer}</p><small>来源：${m.book}</small></div>`).join('');
}
function renderDashboard(){
 const done=Object.keys(state.completed).length, listened=Object.values(state.tasks).filter(t=>t.listen).length, read=Object.values(state.tasks).filter(t=>t.read).length, quiz=Object.values(state.tasks).filter(t=>t.quiz).length;
 const skillCount={}; state.mistakes.forEach(m=>skillCount[m.skill]=(skillCount[m.skill]||0)+1);
 $('#dashboard').innerHTML=`<div class="dashboard-grid"><div class="stat"><strong>${done}</strong>完成文章</div><div class="stat"><strong>${listened}</strong>听读</div><div class="stat"><strong>${read}</strong>阅读</div><div class="stat"><strong>${quiz}</strong>通过 Quiz</div><div class="stat"><strong>${state.mistakes.length}</strong>错题</div></div><h3>薄弱技能</h3><p>${Object.keys(skillCount).length?Object.entries(skillCount).map(([k,v])=>`${k}: ${v}`).join(' · '):'暂无数据'}</p>`;
}
$('#diagnosticBtn').onclick=()=>alert('诊断原型：先从 A0 开始。正式版可按词汇、语法、阅读理解各 5 题自动分配 Level。');
function renderAll(){ renderLevels(); renderBooks(); renderReview(); renderDashboard(); }
renderTopics(); renderAll();
