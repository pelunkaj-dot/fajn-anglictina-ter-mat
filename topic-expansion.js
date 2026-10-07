/* Rozšíření témat: Numbers, Body, Family */

function numberVisual(word,compact=false){
  const n=Number(word.num||1);
  const dots=Array.from({length:n},(_,i)=>`<span class="number-dot" style="--i:${i}"></span>`).join("");
  return `<div class="${compact?"number-visual compact":"number-visual"}"><div class="number-big">${n}</div><div class="number-dots">${dots}</div></div>`;
}

function bodyVisual(word,compact=false){
  const part=word.part||word.en;
  if(!["head","eyes","ears","nose","mouth","hands","knees","feet"].includes(part)) return "";
  return `<div class="body-picture${compact?" compact":""}"><img src="assets/body/${part}.webp" alt="${esc(word.cz||part)}" width="512" height="512"></div>`;
}

function familyVisual(word,compact=false){
  const who=word.person;
  const people = who==="family" ? ["grandma","grandpa","mum","dad","sister","brother","baby"] : [who];
  return `<div class="${compact?"family-visual compact":"family-visual"}">${people.map((p,i)=>`<div class="person-card ${p}" style="--i:${i}"><div class="person-head"></div><div class="person-body"></div></div>`).join("")}</div>`;
}

const oldYoungVisual = youngVisual;
youngVisual = function(topic,word){
  if(topic.id==="numbers") return numberVisual(word);
  if(topic.id==="body") return bodyVisual(word);
  if(topic.id==="family") return familyVisual(word);
  return oldYoungVisual(topic,word);
};

const earlierRenderRecognize = renderRecognize;
renderRecognize = function(){
  if(!["numbers","body","family"].includes(currentTopic.id)) return earlierRenderRecognize();
  const w=currentTopic.words[currentIndex];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)];
  shuffle(choices);
  const visual = c => currentTopic.id==="numbers" ? numberVisual(c,true) : currentTopic.id==="body" ? bodyVisual(c,true) : familyVisual(c,true);
  shell(`
    <h2>👀 Poznám</h2>
    <div class="young-instruction mini-guide"><div><span>🔊</span><b>Poslechni</b></div><div class="instruction-arrow">→</div><div><span>👆</span><b>Ukaž</b></div></div>
    <div class="word-card recognition-card">
      ${recognitionListenControl()}
      <div class="visual-options topic-visual-options">
        ${choices.map(c=>`<button class="visual-option topic-choice" data-cz="${esc(c.cz)}">${visual(c)}</button>`).join("")}
      </div>
      <div id="feedback"></div>
    </div>`);
  document.getElementById("listen").onclick=()=>speak(w.en);
  document.querySelectorAll(".topic-choice").forEach(btn=>btn.onclick=()=>{
    const fb=document.getElementById("feedback");
    if(btn.dataset.cz===w.cz){
      fb.className="feedback ok"; fb.textContent="Ano! Přesně.";
      scheduleLessonAdvance(()=>{ if(currentIndex<currentTopic.words.length-1){currentIndex++;renderRecognize();} else nextStage(); },550);
    }else{
      fb.className="feedback bad"; fb.textContent="🙂 Zkus jiný obrázek.";
      speak(w.en);
    }
  });
};

const oldGameVisualPrompt=gameVisualPrompt;
gameVisualPrompt=function(topic,word){
  if(topic.id==="numbers") return `<div class="game-target custom-target">${numberVisual(word,false)}</div>`;
  if(topic.id==="body") return `<div class="game-target custom-target">${bodyVisual(word,false)}</div>`;
  if(topic.id==="family") return `<div class="game-target custom-target">${familyVisual(word,false)}</div>`;
  return oldGameVisualPrompt(topic,word);
};

const oldStoryScene=storyScene;
storyScene=function(topic,line){
  const t=(line.en||"").toLowerCase();
  if(topic.id==="numbers"){
    const numberWords={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8};
    const key=Object.keys(numberWords).find(k=>t.includes(k)) || "two";
    return numberVisual({num:numberWords[key],cz:key},false);
  }
  if(topic.id==="body"){
    const key=["head","eyes","ears","nose","mouth","hands","knees","feet"].find(k=>t.includes(k)) || "head";
    return bodyVisual({part:key,cz:key},false);
  }
  if(topic.id==="family"){
    const key=["grandma","grandpa","mum","dad","sister","brother","baby","family"].find(k=>t.includes(k)) || "family";
    return familyVisual({person:key,cz:key},false);
  }
  return oldStoryScene(topic,line);
};