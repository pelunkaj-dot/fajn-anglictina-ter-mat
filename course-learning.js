/* Picture and listening choices for non-readers, including the final check. */
const courseQuizSessions=new Map();
const pictureAttempts=new Set();
function coursePictureChoices(topic,word){return shuffle([word,...shuffle(topic.words.filter(w=>w!==word)).slice(0,3)]);}
function coursePictureOptions(topic,choices){
  return `<div class="visual-options course-picture-options">${choices.map((word,i)=>`<button class="visual-option course-picture-choice" data-en="${esc(word.en)}" aria-label="${esc(word.cz)}">${smallVisual(topic,word,true)}</button>`).join('')}</div>`;
}
function bindCoursePictures(topic,word,onCorrect,helped=false,onWrong=()=>{}){
  let answered=false;
  document.getElementById('listen').onclick=()=>speak(word.en);
  document.querySelectorAll('.course-picture-choice').forEach(button=>button.onclick=()=>{
    if(answered)return;
    const correct=button.dataset.en===word.en;
    const feedback=document.getElementById('feedback');
    recordPictureChoice(topic,word,correct,!helped);
    if(correct){answered=true;document.querySelectorAll('.course-picture-choice').forEach(b=>b.disabled=true);kidSound('success');feedback.className='feedback ok';feedback.textContent='🌟 Správně!';onCorrect(!helped);}
    else{helped=true;button.disabled=true;kidSound('try');feedback.className='feedback bad';feedback.textContent='🙂 Poslechni si slovo a zkus jiný obrázek.';onWrong();speak(word.en);}
  });
}
renderRecognize=function(){
  const topic=currentTopic,word=topic.words[currentIndex],key=`${topic.id}/${word.en}`;
  shell(`<div class="word-card recognition-card"><h2>👂 Poslechni a ukaž</h2>${recognitionListenControl()}${coursePictureOptions(topic,coursePictureChoices(topic,word))}<div id="feedback" role="status"></div></div>`);
  bindCoursePictures(topic,word,()=>{pictureAttempts.delete(key);scheduleLessonAdvance(()=>{if(currentIndex<topic.words.length-1){currentIndex++;renderRecognize();}else nextStage();},700);},pictureAttempts.has(key),()=>pictureAttempts.add(key));
};
function resetCourseQuiz(topicId){courseQuizSessions.delete(topicId);lessonPositions.delete(`${topicId}:4`);quizScore=0;currentIndex=0;}
function courseQuizSession(topic){
  if(!courseQuizSessions.has(topic.id))courseQuizSessions.set(topic.id,{words:shuffle([...topic.words]),answers:[],helped:{}});
  return courseQuizSessions.get(topic.id);
}
function courseQuizSummary(session){
  const independent=session.answers.filter(answer=>answer?.independent).length;
  return {independent,helped:session.answers.filter(answer=>answer&&!answer.independent).length,total:session.words.length,passed:independent>=Math.ceil(session.words.length*.8)};
}
renderQuiz=function(){
  const topic=currentTopic,session=courseQuizSession(topic);
  // A remembered completed answer cannot be counted twice after navigation.
  while(session.answers[currentIndex])currentIndex++;
  if(currentIndex>=session.words.length){
    const result=courseQuizSummary(session);topicState(topic.id).lastQuiz={...result,at:Date.now()};saveState();
    shell(`<div class="quiz-result-visual">${result.passed?'🏆':'🌱'}</div><h2>${result.passed?'Paráda! Slova poznáš.':'Hotovo! Některá slova ještě potrénujeme.'}</h2><p>${result.helped?'Některé obrázky jsi našel/našla po pomoci. Příště to zkusíme samostatně.':'Obrázky jsi našel/našla samostatně.'}</p><div class="controls">${result.passed?'<button class="btn primary" id="finish">Dokončit téma →</button>':'<button class="btn primary" id="reviewQuiz">👂 Ještě potrénujeme</button><button class="btn" id="retryQuiz">🔊 Zkusit znovu</button><button class="btn" id="quizHome">🏠 Do našeho světa</button>'}</div>`);
    if(result.passed)document.getElementById('finish').onclick=()=>{completeStage(4);renderFinish();};
    else{document.getElementById('reviewQuiz').onclick=()=>startWordPractice(topic.id);document.getElementById('retryQuiz').onclick=()=>{resetCourseQuiz(topic.id);renderQuiz();};document.getElementById('quizHome').onclick=renderHome;}
    return;
  }
  const word=session.words[currentIndex];
  shell(`<div class="word-card recognition-card quiz-picture-check"><h2>👂 Poslechni a ukaž</h2><div class="course-progress" aria-label="Úloha ${currentIndex+1} z ${session.words.length}">${session.words.map((_,i)=>`<span class="${i<currentIndex?'done':i===currentIndex?'active':''}">${i<currentIndex?'⭐':'●'}</span>`).join('')}</div>${recognitionListenControl()}${coursePictureOptions(topic,coursePictureChoices(topic,word))}<div id="feedback" role="status"></div></div>`);
  bindCoursePictures(topic,word,independent=>{session.answers[currentIndex]={en:word.en,independent};quizScore=courseQuizSummary(session).independent;scheduleLessonAdvance(()=>{currentIndex++;renderQuiz();},700);},!!session.helped[currentIndex],()=>{session.helped[currentIndex]=true;});
};
const earlierCourseOpenTopic=openTopic;
openTopic=function(id){if(lessonBusy)return;if(typeof wordPractice!=="undefined")wordPractice=null;resetCourseQuiz(id);earlierCourseOpenTopic(id);};
renderFinish=function(){
  const topic=currentTopic,ts=topicState(topic.id),completed=ts.stages.every(Boolean);
  ts.mastered=courseTopicMastered(topic);saveState();
  shell(`<div class="finish-characters"><img src="assets/characters/terezka.svg" alt="Terezka"><img src="assets/characters/matysek.svg" alt="Matýsek"></div><h2 class="finish-title">${ts.mastered?"🏅 Téma opravdu umíš!":completed?"⭐ Téma je hotové!":"🌟 Ověření se povedlo!"}</h2><p class="finish-copy">${ts.mastered?"Slova poznáš samostatně a jejich výslovnost se ti daří. Získáváš odznak Umím.":completed?"Nové místo ve světě se odemklo. Pro odznak Umím ještě potrénujeme jednotlivá slova.":"Můžeš pokračovat další částí tématu."}</p><div class="controls">${completed?'<button class="btn" id="repeat">🔊 Projít znovu</button>':'<button class="btn primary" id="continueTopic">Pokračovat v tématu →</button>'}<button class="btn" id="home">🏠 Do našeho světa</button></div>`);
  if(completed)document.getElementById('repeat').onclick=()=>{resetCourseQuiz(topic.id);currentStage=0;currentIndex=0;renderStage();};
  else document.getElementById('continueTopic').onclick=()=>{currentStage=ts.stages.findIndex(done=>!done);currentIndex=0;renderStage();};
  document.getElementById('home').onclick=renderHome;
};
// Every game choice is also pictorial; speaking rounds keep their picture prompt.
buildGameQuestions=function(topic){
  const words=shuffle([...topic.words]);
  return Array.from({length:8},(_,i)=>{const word=words[i%words.length];return i%4===3?{type:'speak',word,prompt:'Řekni, co vidíš.',answer:word.en,speak:word.en}:{type:'picturePick',word,prompt:'Poslechni a ukaž.',answer:word.cz,options:coursePictureChoices(topic,word),speak:word.en};});
};
