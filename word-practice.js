/* A short practice queue drawn from actual mistakes, with no penalties. */
let wordPractice=null;
function startWordPractice(topicId){
  if(lessonBusy)return;
  stopBritishAudio();
  const words=practiceWords().filter(item=>!topicId||item.topic.id===topicId).slice(0,6);
  wordPractice={words,index:0,mode:'listen',topicId:topicId||null};
  renderWordPractice();
}
function renderWordPractice(){
  const item=wordPractice?.words[wordPractice.index];
  if(!item){
    app.classList.remove('picture-lesson');
    app.innerHTML='<section class="panel practice-finish"><div class="reward-burst">🌟</div><h1>Na dnešek pěkná práce!</h1><p>Slova jsme znovu potrénovali. Můžeš se vrátit do našeho světa.</p><button class="btn primary" id="practiceHome">🏠 Do našeho světa</button></section>';
    document.getElementById('practiceHome').onclick=()=>{wordPractice=null;renderHome();};return;
  }
  const {topic,word}=item;
  currentTopic=topic;currentStage=1;currentIndex=topic.words.indexOf(word);
  const p=learningWord(topic.id,word.en);
  const speechNeeded=p.speechNeedsPractice===true;
  shell(`<div class="word-card recognition-card word-practice"><div class="practice-heading">👂 Ještě potrénujeme <span>${wordPractice.index+1}/${wordPractice.words.length}</span></div>${recognitionListenControl()}${wordPractice.mode==='speak'?`<div class="practice-main-picture">${smallVisual(topic,word,false)}</div><button class="big-action say-action" id="practiceSay"><span class="action-icon">🎙️</span><span>Řeknu to</span></button>`:coursePictureOptions(topic,coursePictureChoices(topic,word))}<div id="feedback" role="status"></div><div class="controls"><button class="btn" id="practiceSkip">⏭️ Teď přeskočit</button><button class="btn" id="practiceExit">🏠 Do našeho světa</button></div></div>`);
  app.classList.add('picture-lesson');
  document.getElementById('practiceExit').onclick=()=>{if(lessonBusy)return;wordPractice=null;renderHome();};
  document.getElementById('practiceSkip').onclick=()=>{if(lessonBusy)return;advanceWordPractice();};
  if(wordPractice.mode==='listen'){
    bindCoursePictures(topic,word,()=>scheduleLessonAdvance(()=>{if(speechNeeded){wordPractice.mode='speak';renderWordPractice();}else advanceWordPractice();},850));
  }else{
    document.getElementById('listen').onclick=()=>speak(word.en);
    document.getElementById('practiceSay').onclick=async()=>{
      if(lessonBusy)return;setLessonBusy(true);
      const button=document.getElementById('practiceSay'),out=document.getElementById('feedback');
      document.getElementById('practiceSkip').disabled=true;document.getElementById('practiceExit').disabled=true;
      try{
        const blob=await captureChildSpeech({button,out,maxMs:3200,minMs:350,silenceMs:650});
        const data=await assessChildSpeech(blob,word.en);
        out.innerHTML=childPronunciationHtml(data)+`<div class="controls"><button class="btn good" id="practiceAgain">🎙️ Zkusím znovu</button><button class="btn primary" id="practiceNext">Další slovo →</button></div>`;
        kidSound(data.feedback.passed?'success':'try');
        document.getElementById('practiceAgain').onclick=()=>{wordPractice.mode='speak';renderWordPractice();};
        document.getElementById('practiceNext').onclick=advanceWordPractice;
      }catch{out.innerHTML='<div class="kid-feedback try">👂 Teď jsem tě neslyšela dobře. Zkus to ještě jednou.</div>';}
      finally{setLessonBusy(false);if(button.isConnected)button.disabled=false;document.getElementById('practiceSkip').disabled=false;document.getElementById('practiceExit').disabled=false;}
    };
  }
}
function advanceWordPractice(){if(lessonBusy)return;wordPractice.index++;wordPractice.mode='listen';renderWordPractice();}
const earlierPracticeHome=renderHome;
renderHome=function(){
  wordPractice=null;app.classList.remove('picture-lesson');earlierPracticeHome();
  const count=practiceWords().length;
  if(!count)return;
  const section=document.createElement('section');section.className='practice-home-card';
  section.innerHTML=`<div><h2>👂 Ještě potrénujeme</h2><p>Krátká výprava za slovy, která si ještě procvičíme.</p></div><button class="btn primary" id="startWordPractice">🔊 Pojďme na to</button>`;
  const topics=document.querySelector('.section-title');
  if(topics)topics.before(section);else app.appendChild(section);
  document.getElementById('startWordPractice').onclick=()=>startWordPractice();
};
renderHome();
