/* Vrstva pro nejmladší: obraz + poslech + vlastní hlas */
const previousRenderLearn = renderLearn;

function youngVisual(topic, word){
  if(topic.id === "colours") return colorVisualHtml(word);
  if(topic.id === "animals" || topic.id === "food") return '<div class="picture-visual"><img src="assets/' + topic.id + '/' + word.en + '.svg" alt="' + esc(word.cz) + '"></div>';
  return '<div class="young-symbol" aria-hidden="true">✨</div>';
}

function wordPronState(topicId){
  const ts = topicState(topicId);
  ts.wordPhoneticPronunciation ||= {};
  return ts.wordPhoneticPronunciation;
}

renderLearn = function(){
  const w = currentTopic.words[currentIndex];
  const wp = wordPronState(currentTopic.id);
  const best = Number(wp[w.en] || 0);
  shell(`
    <h2>👋 Nauč mě to</h2>
    <div class="young-instruction" aria-label="Podívej se, poslechni a řekni">
      <div><span>👀</span><b>Podívej se</b></div>
      <div class="instruction-arrow">→</div>
      <div><span>🔊</span><b>Poslechni</b></div>
      <div class="instruction-arrow">→</div>
      <div><span>🎙️</span><b>Řekni</b></div>
    </div>
    <div class="word-card young-word-card">
      ${youngVisual(currentTopic,w)}
      <div class="bigword">${esc(w.en)}</div>
      <div class="translation">${esc(w.cz)}</div>
      <div class="speak-actions">
        <button class="big-action listen-action" id="listen"><span class="action-icon">🔊</span><span>Poslechni</span></button>
        <button class="big-action say-action" id="sayWord"><span class="action-icon">🎙️</span><span>Řekni to</span></button>
      </div>
      <div id="wordPronResult">${best >= 80 ? '<div class="kid-feedback great">🌟 Tohle už umíš krásně!</div>' : best >= 60 ? '<div class="kid-feedback good">🙂 Už to jde!</div>' : ''}</div>
      <div class="controls young-next">
        <button class="btn" id="previousWord" ${currentIndex===0 ? 'disabled' : ''}>← Předchozí slovo</button>
        <button class="btn primary" id="nextWord">${currentIndex===currentTopic.words.length-1 ? "Mám všechna slova" : "Další slovo"} →</button>
      </div>
    </div>`);
  document.getElementById("listen").onclick = ()=>speak(w.en);
  document.getElementById("sayWord").onclick = ()=>recordYoungWord(w.en);
  document.getElementById("previousWord").onclick = ()=>{
    if(currentIndex > 0){ currentIndex--; renderLearn(); }
  };
  document.getElementById("nextWord").onclick = ()=>{
    if(currentIndex < currentTopic.words.length-1){ currentIndex++; renderLearn(); } else nextStage();
  };
};

async function recordYoungWord(expected){
  if(lessonBusy) return;
  setLessonBusy(true);
  const btn=document.getElementById("sayWord");
  const out=document.getElementById("wordPronResult");
  const previous=document.getElementById("previousWord");
  const next=document.getElementById("nextWord");
  if(previous) previous.disabled=true;
  if(next) next.disabled=true;
  try{
    const blob=await captureChildSpeech({button:btn,out,maxMs:3200,minMs:350,silenceMs:650});
    const data=await assessChildSpeech(blob, expected);

    const score=phoneticProgressScore(data);
    const wp=wordPronState(currentTopic.id);
    wp[expected]=Math.max(Number(wp[expected]||0),score);
    saveState();

    out.innerHTML=childPronunciationHtml(data);
    kidSound(data.feedback.passed ? "success" : "try");
    if(data.feedback.level==="great") tinyCelebrate();
    if(data.feedback.level!=="great"){
      out.innerHTML+='<div class="micro-actions"><button class="btn speak" id="hearAgain">🔊 Poslechnout vzor</button><button class="btn good" id="sayAgain">🎙️ Zkusím znovu</button></div>';
      document.getElementById("hearAgain").onclick=()=>speak(expected);
      document.getElementById("sayAgain").onclick=()=>recordYoungWord(expected);
    }
    if(data.feedback.level==="retry") speak(expected);
  }catch(err){
    if(err?.code==="no-speech"){
      out.innerHTML='<div class="kid-feedback try"><div class="feedback-face">👂</div><strong>Neslyšela jsem tě.</strong><span>Zkus to ještě jednou.</span><div class="micro-actions"><button class="btn good" id="sayAgain">🎙️ Zkusím znovu</button></div></div>';
      const again=document.getElementById("sayAgain");
      if(again) again.onclick=()=>recordYoungWord(expected);
    }else{
      out.innerHTML='<div class="kid-feedback try">🎙️ Teď se mi nepodařilo hlas zkontrolovat. Zkus to ještě jednou.</div>';
    }
  }finally{
    setLessonBusy(false);
    if(previous) previous.disabled=currentIndex===0;
    if(next) next.disabled=false;
    btn.disabled=false;
    btn.innerHTML='<span class="action-icon">🎙️</span><span>Řekni to</span>';
  }
}

function tinyCelebrate(){
  const box=document.getElementById("wordPronResult");
  if(!box) return;
  const burst=document.createElement("div");
  burst.className="tiny-burst";
  burst.textContent="✨ ⭐ ✨";
  box.appendChild(burst);
  setTimeout(()=>burst.remove(),1100);
}
