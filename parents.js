/* Rodičovská sekce s jednoduchým PIN zámkem */
const PARENT_PIN_KEY="fajn-anglictina-parent-pin-v1";

document.getElementById("parentBtn").addEventListener("click",openParentGate);

async function hashPin(pin){
  try{
    const bytes=new TextEncoder().encode(pin);
    const digest=await crypto.subtle.digest("SHA-256",bytes);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }catch{
    return btoa(pin);
  }
}

function parentOverlay(html){
  let el=document.getElementById("parentOverlay");
  if(!el){
    el=document.createElement("div");
    el.id="parentOverlay";
    el.className="parent-overlay";
    document.body.appendChild(el);
  }
  el.innerHTML=`<div class="parent-modal">${html}</div>`;
  el.classList.add("show");
  const close=el.querySelector("[data-close-parent]");
  if(close) close.onclick=()=>el.classList.remove("show");
}

function pinForm(title,text,mode){
  parentOverlay(`
    <button class="parent-close" data-close-parent>✕</button>
    <div class="parent-lock-icon">🔐</div>
    <h2>${title}</h2>
    <p>${text}</p>
    <form id="pinForm" class="pin-form">
      <input type="password" id="parentPin" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Čtyřmístný PIN" placeholder="••••">
      ${mode==="create"?'<input type="password" id="parentPin2" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" aria-label="Zopakujte PIN" placeholder="••••">':""}
      <button class="btn primary" type="submit">${mode==="create"?"Nastavit PIN":"Odemknout"}</button>
    </form>
    <div id="pinFeedback" class="parent-feedback"></div>`);
  document.getElementById("pinForm").onsubmit=async e=>{
    e.preventDefault();
    const p1=document.getElementById("parentPin").value.trim();
    const fb=document.getElementById("pinFeedback");
    if(!/^\d{4}$/.test(p1)){fb.textContent="PIN musí mít čtyři číslice.";return;}
    if(mode==="create"){
      const p2=document.getElementById("parentPin2").value.trim();
      if(p1!==p2){fb.textContent="PINy se neshodují.";return;}
      localStorage.setItem(PARENT_PIN_KEY,await hashPin(p1));
      renderParentDashboard();
    }else{
      const ok=(await hashPin(p1))===localStorage.getItem(PARENT_PIN_KEY);
      if(ok) renderParentDashboard(); else fb.textContent="Nesprávný PIN.";
    }
  };
}

function openParentGate(){
  if(lessonBusy)return;
  if(localStorage.getItem(PARENT_PIN_KEY)){
    pinForm("Pro rodiče","Zadejte čtyřmístný PIN.","unlock");
  }else{
    pinForm("Pro rodiče","Při prvním otevření si nastavte čtyřmístný PIN. Dítě se pak do této části omylem nedostane.","create");
  }
}

function phoneticParentLabel(score){
  return score>=80 ? "🌟 výslovnost ověřena" : score>=60 ? "🙂 výslovnost se daří" : "🌱 výslovnost ještě trénuje";
}

function pronunciationLabel(score){
  const n=Number(score)||0;
  if(n>=80)return "🌟 dobře rozpoznáno";
  if(n>=60)return "🙂 většinou rozpoznáno";
  if(n>0)return "🌱 ještě trénuje";
  return "— bez pokusu";
}

function parentWordListening(topic,word){
  const p=state.learning?.words?.[`${topic.id}/${word.en.toLowerCase()}`];
  if(!p||!p.recognitionAttempts&&!p.wrongChoices)return "— zatím neověřeno";
  if(p.recognitionNeedsPractice)return p.lastRecognition==="helped"?"🌱 pozná po pomoci":"🌱 ještě procvičit";
  return "✓ pozná samostatně";
}
function parentWordSpeech(topic,word){
  const p=state.learning?.words?.[`${topic.id}/${word.en.toLowerCase()}`];
  if(!p||!p.speechAttempts){
    const old=topicState(topic.id).wordPhoneticPronunciation?.[word.en];
    return old?`${phoneticParentLabel(old)} · dřívější výsledek`:"— zatím neověřeno";
  }
  const label=p.lastSpeechLevel==="great"?"🌟 povedlo se":p.lastSpeechLevel==="good"?"🙂 daří se":p.lastSpeechLevel==="retry"?"🌱 ještě procvičit":"bez fonetického výsledku";
  return p.lastSpeechStatus==="unavailable"?`👂 nyní neověřeno${p.lastSpeechLevel?" · poslední ověřený výsledek: "+label:""}`:label;
}
function parentWordAdvice(topic,word){
  const p=state.learning?.words?.[`${topic.id}/${word.en.toLowerCase()}`];
  if(!p)return "";
  const names={voicing:"Znělost",'th-substitution':"TH",'vowel-substitution':"Samohláska",'phoneme-substitution':"Hláska",'weak-phoneme':"Hláska",mispronunciation:"Výslovnost"};
  const issues=(p.issues||[]).map(i=>{const expected=childSoundLabel(i.expected)||i.expected;const actual=childSoundLabel(i.actual)||i.actual;return `${names[i.type]||"Výslovnost"}${expected?": "+expected:""}${actual?" (zaznělo "+actual+")":""}`;});
  return [p.recognitionNeedsPractice?"Zopakovat poslech a výběr obrázku.":"",p.speechNeedsPractice?p.lastSpeechTip:"",...issues].filter(Boolean).join(" ");
}
function parentTopicDetails(topic){
  const rows=topic.words.map(word=>{
    const p=state.learning?.words?.[`${topic.id}/${word.en.toLowerCase()}`];
    return `<tr><td><strong>${esc(word.en)}</strong><small>${esc(word.cz)}</small></td><td>${esc(parentWordListening(topic,word))}</td><td>${esc(parentWordSpeech(topic,word))}</td><td>${p?`${p.independentCorrect||0} samostatně · ${p.helpedCorrect||0} s pomocí · ${p.wrongChoices||0} chybných výběrů`:"—"}</td><td>${esc(parentWordAdvice(topic,word))||"—"}</td></tr>`;
  }).join("");
  const attempted=topic.words.filter(w=>state.learning?.words?.[`${topic.id}/${w.en.toLowerCase()}`]).length;
  const practice=topic.words.filter(w=>wordNeedsPractice(topic,w)).length;
  const quiz=topicState(topic.id).lastQuiz;
  return `<details class="parent-topic-details"><summary>${topic.emoji} ${esc(topic.cz)} <span>${attempted}/${topic.words.length} slov vyzkoušeno${practice?` · ${practice} k procvičení`:""}</span></summary>${quiz?`<p class="parent-quiz-detail">Poslední ověření: ${quiz.independent}/${quiz.total} samostatných odpovědí, ${quiz.helped} po pomoci. ${quiz.passed?"Ověření splněno.":"Ještě procvičit a znovu ověřit."}</p>`:""}<div class="parent-table-wrap"><table class="parent-word-table"><thead><tr><th>Slovo</th><th>Poznání podle poslechu</th><th>Výslovnost</th><th>Pokusy při výběru</th><th>Co procvičit</th></tr></thead><tbody>${rows}</tbody></table></div><button class="btn parent-practice-topic" data-topic="${topic.id}" ${practice?"":"disabled"}>👂 Procvičit obtížná slova</button></details>`;
}
function renderParentDashboard(){
  const rows=FAJN_DATA.topics.map(topic=>{
    const ts=topicState(topic.id),done=(ts.stages||[]).filter(Boolean).length;
    const checked=topic.words.filter(w=>['great','good'].includes(state.learning?.words?.[`${topic.id}/${w.en.toLowerCase()}`]?.lastSpeechLevel)).length;
    const verified=courseTopicMastered(topic);
    return `<tr><td><strong>${topic.emoji} ${esc(topic.cz)}</strong><small>${esc(topic.title)}</small></td><td>${done}/5</td><td>${verified?"🏅 Umím":ts.stages?.every(Boolean)?"✅ Prošlo lekcí":"—"}</td><td>${checked}/${topic.words.length} slov s dobrým fonetickým výsledkem</td></tr>`;
  }).join("");
  const mastered=FAJN_DATA.topics.filter(courseTopicMastered).length;
  const completed=FAJN_DATA.topics.filter(t=>topicState(t.id).stages.every(Boolean)).length;
  const attempted=FAJN_DATA.topics.filter(t=>topicState(t.id).stages.some(Boolean)).length;
  const games=state.games||{plays:0,best:0};
  parentOverlay(`
    <button class="parent-close" data-close-parent aria-label="Zavřít rodičovský přehled">✕</button>
    <div class="parent-head"><div><p class="eyebrow">PRO RODIČE</p><h2>Jak se dítěti daří</h2></div><div class="parent-summary"><span><b>${mastered}</b><small>zvládnutých témat</small></span><span><b>${completed}</b><small>dokončených témat</small></span><span><b>${attempted}</b><small>vyzkoušených témat</small></span><span><b>${games.best||0}</b><small>herní rekord</small></span></div></div>
    <div class="parent-note">🎙️ Poznání slova a výslovnost sledujeme odděleně. Výslovnost porovnává Azure Speech Pronunciation Assessment s britskou angličtinou, včetně výsledků jednotlivých hlásek. Pokud fonetická služba není dostupná, rozpoznání správného slova nenahrazuje hodnocení výslovnosti. Automatické hodnocení může chybovat; rozhodující je také poslech dospělého.</div>
    <div class="parent-table-wrap"><table class="parent-table"><thead><tr><th>Téma</th><th>Kroky</th><th>Stav</th><th>Mluvení</th></tr></thead><tbody>${rows}</tbody></table></div>
    <h3>Jednotlivá slova a doporučené opakování</h3><p class="parent-note">Rozbalte téma. Odpověď po chybném výběru je pomoc, nikoli samostatný výkon. Starší pokrok zachováváme; podrobné počty a aktuální obtíže zaznamenáváme od této verze. Postup je uložený v tomto prohlížeči a na tomto zařízení.</p>
    ${FAJN_DATA.topics.map(parentTopicDetails).join("")}
    <div class="parent-actions"><button class="btn" id="exportProgress">💾 Zálohovat postup</button><label class="btn parent-import-label">📂 Obnovit ze zálohy<input type="file" id="importProgress" accept="application/json,.json"></label><button class="btn" id="changePin">🔐 Změnit PIN</button><button class="btn danger-parent" id="resetProgress">🗑️ Smazat postup</button></div><div id="parentDataFeedback" role="status"></div>`);
  document.querySelectorAll('.parent-practice-topic').forEach(button=>button.onclick=()=>{if(lessonBusy)return;document.getElementById('parentOverlay').classList.remove('show');startWordPractice(button.dataset.topic);});
  document.getElementById('changePin').onclick=()=>pinForm('Nový rodičovský PIN','Nastavte nový čtyřmístný PIN. Do potvrzení zůstává původní PIN platný.','create');
  document.getElementById('resetProgress').onclick=()=>{
    const button=document.getElementById('resetProgress');
    if(button.dataset.confirm!=='yes'){button.dataset.confirm='yes';button.textContent='Opravdu smazat celý postup?';return;}
    localStorage.removeItem(STORAGE_KEY);location.reload();
  };
  document.getElementById('exportProgress').onclick=()=>{
    const file=new Blob([JSON.stringify({format:'fajn-anglictina-progress',version:1,createdAt:new Date().toISOString(),state},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='fajn-anglictina-postup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  document.getElementById('importProgress').onchange=async event=>{
    const feedback=document.getElementById('parentDataFeedback'),file=event.target.files?.[0];
    if(!file)return;
    try{if(file.size>1000000)throw new Error();const backup=JSON.parse(await file.text());const restored=validateCourseBackup(backup);feedback.innerHTML='<p>Platná záloha je připravená. Obnovení nahradí postup na tomto zařízení.</p><button class="btn primary" id="confirmRestore">Obnovit tento postup</button><button class="btn" id="cancelRestore">Zrušit</button>';document.getElementById('confirmRestore').onclick=()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(restored));location.reload();};document.getElementById('cancelRestore').onclick=()=>{feedback.textContent='Obnovení zrušeno. Dosavadní postup zůstává zachovaný.';};}
    catch{feedback.textContent='Tento soubor není platná záloha této aplikace. Dosavadní postup zůstává zachovaný.';}
  };
}
function validateCourseBackup(backup){
  if(backup?.format!=='fajn-anglictina-progress'||backup.version!==1||!backup.state||typeof backup.state!=='object'||Array.isArray(backup.state)||!backup.state.topics||typeof backup.state.topics!=='object'||Array.isArray(backup.state.topics))throw new Error('invalid-backup');
  const restored=JSON.parse(JSON.stringify(backup.state));
  for(const field of ['stars'])if(restored[field]!==undefined&&(!Number.isFinite(restored[field])||restored[field]<0))throw new Error('invalid-backup');
  for(const topic of FAJN_DATA.topics){const data=restored.topics[topic.id];if(data&&(!Array.isArray(data.stages)||data.stages.length!==5||data.stages.some(v=>typeof v!=='boolean')))throw new Error('invalid-backup');}
  if(restored.learning&&(restored.learning.version!==1||!restored.learning.words||typeof restored.learning.words!=='object'||Array.isArray(restored.learning.words)))throw new Error('invalid-backup');
  if(restored.learning)for(const [key,p] of Object.entries(restored.learning.words)){if(!FAJN_DATA.topics.some(t=>t.words.some(w=>key===`${t.id}/${w.en.toLowerCase()}`))||!p||typeof p!=="object"||Array.isArray(p))throw new Error("invalid-backup");for(const field of ["recognitionAttempts","independentCorrect","helpedCorrect","wrongChoices","recognitionStreak","speechAttempts","phoneticAttempts","speechStreak","lastPracticed"])if(p[field]!==undefined&&(!Number.isFinite(p[field])||p[field]<0))throw new Error("invalid-backup");if(p.issues&&(!Array.isArray(p.issues)||p.issues.some(i=>!i||typeof i!=="object")))throw new Error("invalid-backup");}
  if(restored.course){
    const c=restored.course,object=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(c.version!==1||![1,2,3].includes(c.level)||!object(c.topics)||!object(c.evidence)||!object(c.games)||typeof courseUnits!=='function')throw new Error('invalid-backup');
    for(const [id,levels] of Object.entries(c.topics)){
      if(!FAJN_DATA.topics.some(t=>t.id===id)||!object(levels))throw new Error('invalid-backup');
      for(const [level,data]of Object.entries(levels))if(!['2','3'].includes(level)||!object(data)||!Array.isArray(data.stages)||data.stages.length!==5||data.stages.some(v=>typeof v!=='boolean'))throw new Error('invalid-backup');
    }
    for(const [key,p]of Object.entries(c.evidence)){
      const [id,level,unitId,...rest]=key.split('/'),topic=FAJN_DATA.topics.find(t=>t.id===id);
      if(rest.length||!topic||!['1','2','3'].includes(level)||![...courseUnits(topic,Number(level)),...courseStory(topic,Number(level))].some(u=>u.id===unitId)||!object(p))throw new Error('invalid-backup');
      for(const field of ['listens','independent','helped','mistakes','streak','speechAttempts','phoneticAttempts','skipped','at'])if(p[field]!==undefined&&(!Number.isFinite(p[field])||p[field]<0))throw new Error('invalid-backup');
      for(const field of ['review','speechOk','speechReview','speechHelped','contentOk'])if(p[field]!==undefined&&typeof p[field]!=='boolean')throw new Error('invalid-backup');
      if(p.tip!==undefined&&typeof p.tip!=='string')throw new Error('invalid-backup');
    }
    for(const [key,g]of Object.entries(c.games)){const [id,level,...rest]=key.split('/');if(rest.length||!FAJN_DATA.topics.some(t=>t.id===id)||!['1','2','3'].includes(level)||!object(g)||!Number.isFinite(g.plays)||g.plays<0||!Number.isFinite(g.best)||g.best<0||g.best>8)throw new Error('invalid-backup');}
  }
  return restored;
}
