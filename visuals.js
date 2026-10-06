const baseRenderLearn = renderLearn;
const baseRenderRecognize = renderRecognize;

renderLearn = function(){
  if(!['animals','food'].includes(currentTopic.id)) return baseRenderLearn();
  const w=currentTopic.words[currentIndex];
  shell(`
    <h2>👋 Nauč mě to</h2>
    <p class="mini">Nejdřív slovo slyš, podívej se na obrázek a spoj si zvuk s významem.</p>
    <div class="word-card">
      <div class="picture-visual"><img src="assets/${currentTopic.id}/${w.en}.svg" alt="${esc(w.cz)}"></div>
      <div class="bigword">${esc(w.en)}</div>
      <div class="translation">${esc(w.cz)}</div>
      <div class="controls">
        <button class="btn speak" id="listen">🔊 Poslechni</button>
        <button class="btn primary" id="nextWord">${currentIndex===currentTopic.words.length-1?'Mám všechna slova':'Další slovo'} →</button>
      </div>
    </div>`);
  document.getElementById('listen').onclick=()=>speak(w.en);
  document.getElementById('nextWord').onclick=()=>{
    if(currentIndex<currentTopic.words.length-1){currentIndex++;renderLearn();}
    else nextStage();
  };
};

renderRecognize = function(){
  if(!['animals','food'].includes(currentTopic.id)) return baseRenderRecognize();
  const w=currentTopic.words[currentIndex];
  const choices=[w,...shuffle(currentTopic.words.filter(x=>x!==w)).slice(0,3)];
  shuffle(choices);
  shell(`
    <h2>👀 Poznám</h2>
    <p class="mini">Klikni na obrázek, který patří ke slovu.</p>
    <div class="word-card">
      <button class="btn speak" id="listen">🔊</button>
      <div class="bigword">${esc(w.en)}</div>
      <div class="visual-options">
        ${choices.map(c=>`<button class="visual-option picture-choice" data-cz="${esc(c.cz)}"><span class="mini-picture"><img src="assets/${currentTopic.id}/${c.en}.svg" alt=""></span><strong>${esc(c.cz)}</strong></button>`).join('')}
      </div>
      <div id="feedback"></div>
    </div>`);
  document.getElementById('listen').onclick=()=>speak(w.en);
  document.querySelectorAll('.visual-option').forEach(btn=>btn.onclick=()=>{
    const fb=document.getElementById('feedback');
    if(btn.dataset.cz===w.cz){
      fb.className='feedback ok'; fb.textContent='Ano! Přesně.';
      setTimeout(()=>{
        if(currentIndex<currentTopic.words.length-1){currentIndex++;renderRecognize();}
        else nextStage();
      },550);
    }else{
      fb.className='feedback bad'; fb.textContent='Ještě ne. Poslechni si slovo a zkus jiný obrázek.';
      speak(w.en);
    }
  });
};