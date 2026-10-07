/* Piktogramové okruhy Weather, Transport, Emotions */
const ICON_TOPICS=["weather","transport","emotions"];

function iconTopicVisual(word,compact=false){
  const topic=window.FAJN_DATA.topics.find(t=>ICON_TOPICS.includes(t.id)&&t.words.some(w=>w.en===word.en));
  if(!topic)return "";
  return `<div class="course-scene${compact?" compact":""}"><img src="assets/${topic.id}/${word.en}.svg" alt="${esc(word.cz||word.en)}" width="256" height="220"></div>`;
}

const prevYoungVisual3=youngVisual;
youngVisual=function(topic,word){
  if(ICON_TOPICS.includes(topic.id)) return iconTopicVisual(word,false);
  return prevYoungVisual3(topic,word);
};

const prevRecognize3=renderRecognize;
renderRecognize=function(){
  if(!ICON_TOPICS.includes(currentTopic.id)) return prevRecognize3();
  const w=currentTopic.words[currentIndex];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)]; shuffle(choices);
  shell(`
    <h2>👀 Poznám</h2>
    <div class="young-instruction mini-guide"><div><span>🔊</span><b>Poslechni</b></div><div class="instruction-arrow">→</div><div><span>👆</span><b>Ukaž</b></div></div>
    <div class="word-card recognition-card">
      ${recognitionListenControl()}
      <div class="visual-options icon-choice-grid">${choices.map(c=>`<button class="visual-option icon-choice" data-cz="${esc(c.cz)}">${iconTopicVisual(c,true)}</button>`).join("")}</div>
      <div id="feedback"></div>
    </div>`);
  document.getElementById("listen").onclick=()=>speak(w.en);
  document.querySelectorAll(".icon-choice").forEach(btn=>btn.onclick=()=>{
    const fb=document.getElementById("feedback");
    if(btn.dataset.cz===w.cz){
      fb.className="feedback ok"; fb.textContent="Ano! Přesně.";
      scheduleLessonAdvance(()=>{if(currentIndex<currentTopic.words.length-1){currentIndex++;renderRecognize();}else nextStage();},550);
    }else{
      fb.className="feedback bad"; fb.textContent="🙂 Zkus jiný obrázek.";
      speak(w.en);
    }
  });
};

const prevGameVisual3=gameVisualPrompt;
gameVisualPrompt=function(topic,word){
  if(ICON_TOPICS.includes(topic.id)) return `<div class="game-target icon-game-target">${iconTopicVisual(word,false)}</div>`;
  return prevGameVisual3(topic,word);
};

const prevStoryScene3=storyScene;
storyScene=function(topic,line){
  if(ICON_TOPICS.includes(topic.id)){
    const t=(line.en||"").toLowerCase();
    const hits=topic.words.filter(w=>t.includes(w.en));
    if(hits.length) return `<div class="story-icon-row">${hits.map(w=>`<span>${w.visual}</span>`).join("")}</div>`;
    return `<div class="story-rainbow">${topic.emoji}</div>`;
  }
  return prevStoryScene3(topic,line);
};