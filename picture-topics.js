/* Obrázkové okruhy Clothes, House, School */
const PICTURE_TOPICS = ["clothes","house","school"];

function topicPictureVisual(topic,word,compact=false){
  return `<div class="${compact?"topic-picture compact":"topic-picture"}"><img src="assets/${topic.id}/${word.en}.svg" alt="${esc(word.cz)}"></div>`;
}

const prevYoungVisual2 = youngVisual;
youngVisual = function(topic,word){
  if(PICTURE_TOPICS.includes(topic.id)) return topicPictureVisual(topic,word,false);
  return prevYoungVisual2(topic,word);
};

const prevRecognize2 = renderRecognize;
renderRecognize = function(){
  if(!PICTURE_TOPICS.includes(currentTopic.id)) return prevRecognize2();
  const w=currentTopic.words[currentIndex];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)];
  shuffle(choices);
  shell(`
    <h2>👀 Poznám</h2>
    <div class="young-instruction mini-guide"><div><span>🔊</span><b>Poslechni</b></div><div class="instruction-arrow">→</div><div><span>👆</span><b>Ukaž</b></div></div>
    <div class="word-card recognition-card">
      ${recognitionListenControl()}
      <div class="visual-options">
        ${choices.map(c=>`<button class="visual-option picture-choice" data-cz="${esc(c.cz)}">${topicPictureVisual(currentTopic,c,true)}</button>`).join("")}
      </div>
      <div id="feedback"></div>
    </div>`);
  document.getElementById("listen").onclick=()=>speak(w.en);
  document.querySelectorAll(".picture-choice").forEach(btn=>btn.onclick=()=>{
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

const prevGameVisual2 = gameVisualPrompt;
gameVisualPrompt = function(topic,word){
  if(PICTURE_TOPICS.includes(topic.id)) return `<div class="game-target custom-target">${topicPictureVisual(topic,word,false)}</div>`;
  return prevGameVisual2(topic,word);
};

const prevStoryScene2 = storyScene;
storyScene = function(topic,line){
  if(PICTURE_TOPICS.includes(topic.id)){
    const t=(line.en||"").toLowerCase();
    const key=topic.words.find(w=>t.includes(w.en));
    return key ? topicPictureVisual(topic,key,false) : `<div class="story-rainbow">${topic.emoji}</div>`;
  }
  return prevStoryScene2(topic,line);
};