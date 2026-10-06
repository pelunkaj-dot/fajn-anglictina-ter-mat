const API_TTS = "https://fdc-gateway.vercel.app/api/tts";
const API_PRON = "https://fdc-gateway.vercel.app/api/pronunciation";
const STORAGE_KEY = "fajn-anglictina-ter-mat-v1";

const state = loadState();
let currentTopic = null;
let currentStage = 0;
let currentIndex = 0;
let quizScore = 0;
let mediaRecorder = null;
let chunks = [];

const app = document.getElementById("app");
const homeBtn = document.getElementById("homeBtn");
homeBtn.addEventListener("click", renderHome);

function loadState(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {topics:{},stars:0};
  }catch{
    return {topics:{},stars:0};
  }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); refreshStats(); }
function topicState(id){
  state.topics[id] ||= {stages:[false,false,false,false,false], mastered:false, bestPronunciation:0};
  return state.topics[id];
}
function refreshStats(){
  document.getElementById("stars").textContent = "⭐ " + (state.stars||0);
  const mastered = Object.values(state.topics).filter(t=>t.mastered).length;
  document.getElementById("mastered").textContent = "🏅 " + mastered;
}
function awardStar(){
  state.stars = (state.stars||0)+1;
  saveState();
}
function completeStage(stage){
  const ts = topicState(currentTopic.id);
  if(!ts.stages[stage]){
    ts.stages[stage]=true;
    awardStar();
  } else saveState();
  if(ts.stages.every(Boolean) && ts.bestPronunciation >= 60) ts.mastered = true;
  saveState();
}
function esc(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])); }

function renderHome(){
  currentTopic=null;
  const tpl=document.getElementById("homeTemplate").content.cloneNode(true);
  app.innerHTML="";
  app.appendChild(tpl);
  const topics=document.getElementById("topics");
  for(const topic of FAJN_DATA.topics){
    const ts=topicState(topic.id);
    const done=ts.stages.filter(Boolean).length;
    const card=document.createElement("button");
    card.className="topic-card";
    card.innerHTML=`
      <div class="emoji">${topic.emoji}</div>
      <h3>${esc(topic.title)}</h3>
      <p>${esc(topic.cz)}</p>
      <div class="status">${ts.mastered ? "🏅 Umím" : done===5 ? "✅ Prošel/a" : done ? `⭐ ${done}/5 kroků` : "Začít"}</div>`;
    card.addEventListener("click",()=>openTopic(topic.id));
    topics.appendChild(card);
  }
  const completedTopics=FAJN_DATA.topics.filter(t=>topicState(t.id).stages.every(Boolean));
  const percent=Math.round((completedTopics.length/FAJN_DATA.topics.length)*100);
  document.getElementById("worldFill").style.width=percent+"%";
  document.getElementById("worldText").textContent = completedTopics.length
    ? `Dokončená témata: ${completedTopics.length}. Každé z nich otevřelo nové místo ve světě.`
    : "Každé dokončené téma otevře nové místo ve světě.";
  const scene=document.getElementById("worldScene");
  scene.className="world-scene";
  const completedIds=completedTopics.map(t=>t.id);
  completedIds.forEach(id=>scene.classList.add("has-"+id));
  if(completedIds.length===0) scene.classList.add("level-0");
  document.getElementById("gameBtn").onclick=startAdventure;
  document.getElementById("adventureBtn").onclick=startAdventure;
  refreshStats();
}

function openTopic(id){
  currentTopic=FAJN_DATA.topics.find(t=>t.id===id);
  currentStage=0; currentIndex=0; quizScore=0;
  renderStage();
}
function pathHtml(){
  const labels=["1. Nauč mě to","2. Poznám","3. Mluvím","4. Příběh","5. Ověřím si"];
  const ts=topicState(currentTopic.id);
  return `<div class="path">${labels.map((x,i)=>`<div class="step ${i===currentStage?"active":""} ${ts.stages[i]?"done":""}">${ts.stages[i]?"✓ ":""}${x}</div>`).join("")}</div>`;
}
function shell(body){
  app.innerHTML=`
    <div class="lesson-head">
      <button class="back" id="backHome">← Témata</button>
      <div class="lesson-title">
        <h1>${currentTopic.emoji} ${esc(currentTopic.title)}</h1>
        <p>${esc(currentTopic.cz)} · krok ${currentStage+1} z 5</p>
      </div>
    </div>
    ${pathHtml()}
    <section class="panel">${body}</section>`;
  document.getElementById("backHome").addEventListener("click",renderHome);
  refreshStats();
}
function renderStage(){
  if(currentStage===0) renderLearn();
  if(currentStage===1) renderRecognize();
  if(currentStage===2) renderSpeak();
  if(currentStage===3) renderStory();
  if(currentStage===4) renderQuiz();
}
function nextStage(){
  completeStage(currentStage);
  if(currentStage<4){currentStage++;currentIndex=0;quizScore=0;renderStage();}
  else { renderFinish(); }
}
function navButton(label="Pokračovat"){
  return `<div class="controls"><button class="btn primary" id="nextStage">${label} →</button></div>`;
}

async function speak(text){
  try{
    const res=await fetch(API_TTS,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,lang:"en",voice:"english-female",speed:1.0})});
    if(!res.ok) throw new Error();
    const blob=await res.blob();
    const url=URL.createObjectURL(blob);
    const audio=new Audio(url);
    audio.onended=()=>URL.revokeObjectURL(url);
    await audio.play();
  }catch{
    if("speechSynthesis" in window){
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);u.lang="en-GB";u.rate=.82;speechSynthesis.speak(u);
    }
  }
}

function renderLearn(){
  const w=currentTopic.words[currentIndex];
  shell(`
    <h2>👋 Nauč mě to</h2>
    <p class="mini">Nejdřív slovo slyš, podívej se na význam a řekni si ho nahlas. Nespěcháme.</p>
    <div class="word-card">
      ${currentTopic.id==="colours" ? colorVisualHtml(w) : ""}
      <div class="bigword">${esc(w.en)}</div>
      <div class="translation">${esc(w.cz)}</div>
      <div class="controls">
        <button class="btn speak" id="listen">🔊 Poslechni</button>
        <button class="btn primary" id="nextWord">${currentIndex===currentTopic.words.length-1?"Mám všechna slova":"Další slovo"} →</button>
      </div>
    </div>`);
  document.getElementById("listen").onclick=()=>speak(w.en);
  document.getElementById("nextWord").onclick=()=>{
    if(currentIndex<currentTopic.words.length-1){currentIndex++;renderLearn();}
    else nextStage();
  };
}

function renderRecognize(){
  const w=currentTopic.words[currentIndex];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)];
  shuffle(choices);
  shell(`
    <h2>👀 Poznám</h2>
    <p class="mini">Vyber český význam. Po chybě můžeš zkusit znovu.</p>
    <div class="word-card">
      <button class="btn speak" id="listen">🔊</button>
      <div class="bigword">${esc(w.en)}</div>
      ${currentTopic.id==="colours" ? '<p class="mini" style="text-align:center">Klikni na správnou barvu.</p>' : ""}
      <div class="${currentTopic.id==="colours" ? "color-options" : "options"}">
        ${choices.map(c=> currentTopic.id==="colours"
          ? `<button class="color-option" data-cz="${esc(c.cz)}" aria-label="${esc(c.cz)}"><span class="swatch" style="background:${c.color};${c.en==="white"?"border:2px solid #ddd;":""}"></span><strong>${esc(c.cz)}</strong></button>`
          : `<button class="option" data-cz="${esc(c.cz)}">${esc(c.cz)}</button>`
        ).join("")}
      </div>
      <div id="feedback"></div>
    </div>`);
  document.getElementById("listen").onclick=()=>speak(w.en);
  document.querySelectorAll(currentTopic.id==="colours" ? ".color-option" : ".option").forEach(btn=>btn.onclick=()=>{
    const fb=document.getElementById("feedback");
    if(btn.dataset.cz===w.cz){
      fb.className="feedback ok";fb.textContent="Ano! Přesně.";
      setTimeout(()=>{
        if(currentIndex<currentTopic.words.length-1){currentIndex++;renderRecognize();}
        else nextStage();
      },550);
    }else{
      fb.className="feedback bad";fb.textContent="Ještě ne. Poslechni si slovo a zkus to znovu.";
      speak(w.en);
    }
  });
}

function renderSpeak(){
  const sentence=currentTopic.sentences[currentIndex];
  const ts=topicState(currentTopic.id);
  shell(`
    <h2>🎙️ Mluvím</h2>
    <p class="mini">Poslechni si větu a pak ji řekni ty. Mikrofon se spustí až po kliknutí.</p>
    <div class="sentence">${esc(sentence.en)}</div>
    <p style="text-align:center;color:var(--muted)">${esc(sentence.cz)}</p>
    <div class="controls">
      <button class="btn speak" id="listen">🔊 Poslechnout</button>
      <button class="btn good" id="record">🎙️ Řeknu to</button>
    </div>
    <div id="pronResult"></div>
    <p class="mini" style="text-align:center">Nejlepší výsledek v tématu: ${ts.bestPronunciation||0} %</p>`);
  document.getElementById("listen").onclick=()=>speak(sentence.en);
  document.getElementById("record").onclick=()=>recordPronunciation(sentence.en);
}

async function recordPronunciation(expected){
  const btn=document.getElementById("record");
  const out=document.getElementById("pronResult");
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    chunks=[];
    mediaRecorder=new MediaRecorder(stream);
    mediaRecorder.ondataavailable=e=>{if(e.data.size) chunks.push(e.data);};
    mediaRecorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      const blob=new Blob(chunks,{type:"audio/webm"});
      const fd=new FormData();
      fd.append("audio",blob,"audio.webm");
      fd.append("expectedText",expected);
      fd.append("language","en-GB");
      out.className="feedback";out.textContent="Poslouchám a porovnávám…";
      try{
        const res=await fetch(API_PRON,{method:"POST",body:fd});
        const data=await res.json();
        if(!res.ok) throw new Error(data.error||"Chyba");
        const score=Number(data.score)||0;
        const ts=topicState(currentTopic.id);
        ts.bestPronunciation=Math.max(ts.bestPronunciation||0,score);
        saveState();
        out.className="feedback "+(score>=60?"ok":"bad");
        out.innerHTML=`<div class="score">${score} %</div>
          <div class="meter"><span style="width:${score}%"></span></div>
          <p><strong>Slyšela jsem:</strong> ${esc(data.transcript||"")}</p>
          <p>${score>=80?"Výborně. Zní to velmi dobře!":score>=60?"Dobře! Ještě jednou a bude to jistější.":esc(data.tip||"Zkus si větu znovu poslechnout a zopakovat.")}</p>
          <div class="controls">
            <button class="btn" id="again">Zkusit znovu</button>
            <button class="btn primary" id="continueSpeak">${currentIndex===currentTopic.sentences.length-1?"Pokračovat":"Další věta"} →</button>
          </div>`;
        document.getElementById("again").onclick=()=>renderSpeak();
        document.getElementById("continueSpeak").onclick=()=>{
          if(currentIndex<currentTopic.sentences.length-1){currentIndex++;renderSpeak();}
          else nextStage();
        };
      }catch(err){
        out.className="feedback bad";
        out.textContent="Kontrolu výslovnosti se teď nepodařilo spustit. Můžeš pokračovat a zkusit ji později.";
      }
    };
    mediaRecorder.start();
    btn.disabled=true;btn.textContent="🔴 Mluv…";
    out.className="feedback";out.textContent="Mluv teď. Nahrávání se samo zastaví za 4 sekundy.";
    setTimeout(()=>{if(mediaRecorder?.state==="recording")mediaRecorder.stop();},4000);
  }catch{
    out.className="feedback bad";
    out.textContent="Nemám přístup k mikrofonu. Povol mikrofon v prohlížeči a zkus to znovu.";
  }
}

function colorVisualHtml(w){
  const border=w.en==="white" ? "border:2px solid #d8d8d8;" : "";
  return `
    <div class="colour-visual" aria-label="${esc(w.cz)}">
      <div class="colour-orb" style="background:${w.color};${border}">
        <span>${w.visual||""}</span>
      </div>
      <div class="colour-strip" style="background:${w.color};${border}"></div>
    </div>`;
}

function renderStory(){
  shell(`
    <h2>📖 Příběh Terezky a Matýska</h2>
    <p class="mini">Teď už nejsou slova sama. Poslechni si je v krátkém rozhovoru.</p>
    <div>
      ${currentTopic.story.map((line,i)=>`
        <div class="word-row">
          <div><strong>${esc(line.speaker)}:</strong> ${esc(line.en)}<br><span class="mini">${esc(line.cz)}</span></div>
          <button class="btn speak storySpeak" data-i="${i}">🔊</button>
        </div>`).join("")}
    </div>
    ${navButton("Rozumím příběhu")}`);
  document.querySelectorAll(".storySpeak").forEach(b=>b.onclick=()=>speak(currentTopic.story[Number(b.dataset.i)].en));
  document.getElementById("nextStage").onclick=nextStage;
}

function renderQuiz(){
  if(currentIndex>=5){
    const passed=quizScore>=4;
    shell(`
      <h2>✅ Ověřím si, co umím</h2>
      <div class="score">${quizScore}/5</div>
      <p style="text-align:center">${passed?"Paráda. Tohle téma už opravdu držíš v ruce.":"Ještě bych se do tématu jednou vrátila. To není prohra – jen víme, co ještě potrénovat."}</p>
      <div class="controls">
        ${passed?'<button class="btn primary" id="finish">Dokončit téma →</button>':'<button class="btn" id="retry">Zkusit znovu</button>'}
      </div>`);
    if(passed) document.getElementById("finish").onclick=()=>{completeStage(4);renderFinish();};
    else document.getElementById("retry").onclick=()=>{currentIndex=0;quizScore=0;renderQuiz();};
    return;
  }
  const w=currentTopic.words[currentIndex % currentTopic.words.length];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)];shuffle(choices);
  shell(`
    <h2>✅ Ověřím si, co umím</h2>
    <p class="mini">Otázka ${currentIndex+1}/5</p>
    <div class="sentence">Co znamená „${esc(w.en)}“?</div>
    <div class="options">${choices.map(c=>`<button class="option" data-cz="${esc(c.cz)}">${esc(c.cz)}</button>`).join("")}</div>
    <div id="feedback"></div>`);
  document.querySelectorAll(".option").forEach(btn=>btn.onclick=()=>{
    const fb=document.getElementById("feedback");
    if(btn.dataset.cz===w.cz){quizScore++;fb.className="feedback ok";fb.textContent="Správně.";setTimeout(()=>{currentIndex++;renderQuiz();},450);}
    else{fb.className="feedback bad";fb.textContent="Ne. Zkus jinou možnost.";}
  });
}

function renderFinish(){
  const ts=topicState(currentTopic.id);
  if(ts.stages.every(Boolean) && ts.bestPronunciation>=60) ts.mastered=true;
  saveState();
  shell(`
    <h2>${ts.mastered?"🏅 Téma opravdu umíš!":"⭐ Téma jsi prošel/prošla"}</h2>
    <p>${ts.mastered
      ?"Nejen že jsi cvičení otevřel/a. Dokázal/a jsi slova poznat, použít a také vyslovit."
      :"Cvičení máš za sebou, ale odznak „Umím“ dostaneš až tehdy, když projdeš všechny kroky a ve výslovnosti získáš alespoň 60 %."}</p>
    <div class="controls">
      <button class="btn" id="repeat">Projít téma znovu</button>
      <button class="btn primary" id="home">Vybrat další téma →</button>
    </div>`);
  document.getElementById("repeat").onclick=()=>{currentStage=0;currentIndex=0;renderStage();};
  document.getElementById("home").onclick=renderHome;
}
function shuffle(a){
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
renderHome();

let game={round:0,score:0,combo:0,bestCombo:0,questions:[],topic:null};

function startAdventure(){
  const unlocked=FAJN_DATA.topics.filter(t=>topicState(t.id).stages.some(Boolean));
  const pool=unlocked.length ? unlocked : FAJN_DATA.topics.slice(0,1);
  const topic=pool[Math.floor(Math.random()*pool.length)];
  game={round:0,score:0,combo:0,bestCombo:0,questions:buildGameQuestions(topic),topic};
  renderAdventure();
}

function buildGameQuestions(topic){
  const qs=[];
  const words=[...topic.words];
  shuffle(words);
  for(let i=0;i<8;i++){
    const w=words[i%words.length];
    const mode=i%3;
    if(mode===0){
      const opts=[w,...shuffle(topic.words.filter(x=>x!==w)).slice(0,3)];shuffle(opts);
      qs.push({type:"translate",prompt:`Co znamená „${w.en}“?`,answer:w.cz,options:opts.map(x=>x.cz),speak:w.en});
    }else if(mode===1){
      const opts=[w,...shuffle(topic.words.filter(x=>x!==w)).slice(0,3)];shuffle(opts);
      qs.push({type:"reverse",prompt:`Jak je anglicky „${w.cz}“?`,answer:w.en,options:opts.map(x=>x.en)});
    }else{
      const opts=[w,...shuffle(topic.words.filter(x=>x!==w)).slice(0,3)];shuffle(opts);
      qs.push({type:"listen",prompt:"Co jsi slyšel/a?",answer:w.en,options:opts.map(x=>x.en),speak:w.en});
    }
  }
  return qs;
}

function renderAdventure(){
  const q=game.questions[game.round];
  if(!q){renderAdventureFinish();return;}
  const progress=(game.round/game.questions.length)*100;
  app.innerHTML=`
    <div class="lesson-head">
      <button class="back" id="leaveGame">← Zpět</button>
      <div class="lesson-title"><h1>🗺️ Výprava za hvězdami</h1><p>${game.topic.emoji} ${esc(game.topic.title)} · herní režim</p></div>
    </div>
    <section class="panel game-panel">
      <div class="game-hud">
        <div class="hud-box"><small>Hvězdy</small>⭐ <span id="gScore">${game.score}</span></div>
        <div class="hud-box"><small>Série</small>🔥 <span id="gCombo">${game.combo}</span></div>
        <div class="hud-box"><small>Cesta</small>${game.round+1}/${game.questions.length}</div>
      </div>
      <div class="adventure-map">
        <div class="stars-bg"></div><div class="moon">🌙</div><div class="trail"></div>
        ${game.questions.map((_,i)=>`<div class="checkpoint ${i<game.round?"done":""}" style="left:${8+i*(80/(game.questions.length-1))}%">${i<game.round?"★":""}</div>`).join("")}
        <div class="hero-token" style="left:${6+progress*.8}%">👧🏻👦🏻</div>
        <div class="treasure">🎁</div>
      </div>
      <div class="game-question">
        <div class="combo">${game.combo>=2?`🔥 Série ${game.combo}! + bonus`:""}</div>
        ${q.type==="listen"?'<div class="controls"><button class="btn speak" id="gameListen">🔊 Poslechnout</button></div>':""}
        <h3>${esc(q.prompt)}</h3>
        <div class="game-options">${q.options.map(o=>`<button class="game-option" data-a="${esc(o)}">${esc(o)}</button>`).join("")}</div>
        <div id="gameFeedback"></div>
      </div>
    </section>`;
  document.getElementById("leaveGame").onclick=renderHome;
  if(document.getElementById("gameListen")) {
    document.getElementById("gameListen").onclick=()=>speak(q.speak);
    setTimeout(()=>speak(q.speak),250);
  }
  document.querySelectorAll(".game-option").forEach(btn=>btn.onclick=()=>answerGame(btn,q));
}

function answerGame(btn,q){
  const all=[...document.querySelectorAll(".game-option")];
  if(all.some(x=>x.disabled)) return;
  const ok=btn.dataset.a===q.answer;
  if(ok){
    game.combo++;
    game.bestCombo=Math.max(game.bestCombo,game.combo);
    const gain=game.combo>=4?3:game.combo>=2?2:1;
    game.score+=gain;
    btn.classList.add("correct");
    document.getElementById("gameFeedback").innerHTML=`<div class="feedback ok">⭐ Správně! ${gain>1?`Bonus za sérii: +${gain}`:""}</div>`;
    all.forEach(x=>x.disabled=true);
    setTimeout(()=>{game.round++;renderAdventure();},650);
  }else{
    game.combo=0;
    btn.classList.add("wrong");
    btn.disabled=true;
    document.getElementById("gameFeedback").innerHTML='<div class="feedback bad">Tudy cesta nevede. Zkus jinou odpověď.</div>';
    if(q.speak) speak(q.speak);
  }
}

function renderAdventureFinish(){
  const reward=Math.max(2,Math.round(game.score/3));
  state.stars=(state.stars||0)+reward;
  state.games ||= {plays:0,best:0};
  state.games.plays++;
  state.games.best=Math.max(state.games.best,game.score);
  saveState();
  app.innerHTML=`
    <section class="panel game-panel">
      <div class="reward-burst">🎁✨</div>
      <h1 style="text-align:center">Poklad nalezen!</h1>
      <p style="text-align:center">Terezka a Matýsek dorazili do cíle. Získáváš <strong>${reward} hvězd</strong> do svého světa.</p>
      <div class="game-hud">
        <div class="hud-box"><small>Skóre</small>⭐ ${game.score}</div>
        <div class="hud-box"><small>Nejlepší série</small>🔥 ${game.bestCombo}</div>
        <div class="hud-box"><small>Rekord</small>🏆 ${state.games.best}</div>
      </div>
      <div class="controls">
        <button class="btn" id="againGame">Hrát znovu</button>
        <button class="btn primary" id="backWorld">Do světa →</button>
      </div>
    </section>`;
  document.getElementById("againGame").onclick=startAdventure;
  document.getElementById("backWorld").onclick=renderHome;
}
