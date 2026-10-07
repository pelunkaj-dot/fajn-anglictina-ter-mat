/* Three complete routes. Level-one legacy progress stays in state.topics;
   higher levels never overwrite it. All new evidence includes the level. */
state.course ||= {version:1,level:1,topics:{},evidence:{},games:{}};
let courseLevel=[1,2,3].includes(state.course.level)?state.course.level:1;
let courseFlow=null;
let courseGame=null;
let courseReview=null;
if(!state.course.migratedWords){
  for(const topic of FAJN_DATA.topics.filter(t=>!t.situation))for(const unit of courseUnits(topic,1)){
    const old=state.learning?.words?.[`${topic.id}/${unit.en.toLowerCase()}`];if(!old)continue;
    state.course.evidence[`${topic.id}/1/${unit.id}`]={listens:0,independent:old.independentCorrect||0,helped:old.helpedCorrect||0,mistakes:old.wrongChoices||0,streak:old.recognitionStreak||0,speechAttempts:old.speechAttempts||0,phoneticAttempts:old.phoneticAttempts||0,skipped:0,lastChoice:old.lastRecognition,review:old.recognitionNeedsPractice===true,lastSpeechStatus:old.lastSpeechStatus,speechOk:['good','great'].includes(old.lastSpeechLevel),speechReview:old.speechNeedsPractice===true,tip:old.lastSpeechTip||'',at:old.lastPracticed||0};
  }
  state.course.migratedWords=true;
}
const originalLevelTopicState=topicState;
topicState=function(id){
  if(courseLevel===1)return originalLevelTopicState(id);
  state.course.topics[id] ||= {};
  return state.course.topics[id][courseLevel] ||= {stages:[false,false,false,false,false],mastered:false,bestPronunciation:0};
};
function courseEvidence(topic,unit,level=courseLevel){
  const key=`${topic.id}/${level}/${unit.id}`;
  return state.course.evidence[key] ||= {listens:0,independent:0,helped:0,mistakes:0,streak:0,speechAttempts:0,phoneticAttempts:0,skipped:0};
}
function courseReadEvidence(topic,unit,level=courseLevel){return state.course.evidence[`${topic.id}/${level}/${unit.id}`];}
function recordCourseChoice(topic,unit,correct,independent,level=courseLevel){
  const p=courseEvidence(topic,unit,level);p.at=Date.now();
  if(!correct){p.mistakes++;p.streak=0;p.review=true;}
  else{p[independent?'independent':'helped']++;p.lastChoice=independent?'independent':'helped';p.streak=independent?p.streak+1:0;p.review=!independent||(p.review===true&&p.streak<2);}
  if(level===1&&!topic.situation){const word=topic.words.find(w=>w.en===unit.en);if(word)recordPictureChoice(topic,word,correct,independent);}
  saveState();return p;
}
function recordCourseSpeech(topic,unit,data,level=courseLevel){
  const p=courseEvidence(topic,unit,level);p.speechAttempts++;p.at=Date.now();
  p.lastSpeechStatus=data.pronunciation?.status||'unavailable';
  p.contentOk=(data.contentScore??data.score)===100;
  if(p.lastSpeechStatus==='assessed'){
    p.phoneticAttempts++;p.lastSpeechLevel=data.feedback.level;p.speechOk=data.feedback.passed===true;p.speechReview=!p.speechOk||data.feedback.needsPractice===true;p.tip=data.feedback.tip||'';
  }
  if(level===1&&!topic.situation)recordWordSpeech(topic,unit.en,data);
  saveState();return p;
}
courseTopicMastered=function(topic){
  const ts=topicState(topic.id);
  const units=courseUnits(topic,courseLevel);
  const recognition=units.every(unit=>{const p=courseReadEvidence(topic,unit);return p?.lastChoice==='independent'&&!p.review;});
  const speech=courseLevel===3?courseSpeakingUnits(topic,3).every(question=>units.some(unit=>{const p=courseReadEvidence(topic,unit);return unit.prompt===question.prompt&&p?.speechOk===true&&!p.speechReview&&!p.speechHelped;})):units.every(unit=>{const p=courseReadEvidence(topic,unit);return p?.speechOk===true&&!p.speechReview;});
  return ts.stages.every(Boolean)&&ts.lastQuiz?.passed===true&&recognition&&speech;
};
function levelInfo(){return COURSE_LEVELS.find(l=>l.id===courseLevel);}
function levelButtons(home=false){return `<div class="course-levels ${home?'home-levels':'lesson-levels'}" role="group" aria-label="Obtížnost">${COURSE_LEVELS.map(l=>`<button type="button" data-level="${l.id}" class="level-button ${l.id===courseLevel?'selected':''}" aria-pressed="${l.id===courseLevel}" ${lessonBusy?'disabled':''}><span>${l.icon}</span><strong>${l.name}</strong><small>${l.description}</small></button>`).join('')}</div>`;}
function bindLevelButtons(){document.querySelectorAll('[data-level]').forEach(button=>button.onclick=()=>switchCourseLevel(Number(button.dataset.level)));}
function switchCourseLevel(level){
  if(lessonBusy||![1,2,3].includes(level)||level===courseLevel)return;
  const topic=currentTopic;stopBritishAudio();courseLevel=level;state.course.level=level;courseGame=null;courseReview=null;courseFlow=null;lessonPositions.clear();saveState();
  if(topic)openTopic(topic.id);else renderHome();
}
refreshStats=function(){
  document.getElementById('stars').textContent='⭐ '+(state.stars||0);
  let badges=0;
  for(const topic of FAJN_DATA.topics){if(state.topics[topic.id]?.mastered)badges++;for(const level of [2,3])if(state.course.topics[topic.id]?.[level]?.mastered)badges++;}
  document.getElementById('mastered').textContent='🏅 '+badges;
};
const originalLevelsBusy=setLessonBusy;
setLessonBusy=function(busy){originalLevelsBusy(busy);document.querySelectorAll('[data-level],#coursePrevious,#courseNext,#courseSkip,#courseExit,[data-personal],#courseStoryNext,#courseGameNext').forEach(b=>b.disabled=busy);};
const originalLevelShell=shell;
shell=function(body){
  originalLevelShell(body);
  const path=document.querySelector('.path');if(path)path.insertAdjacentHTML('beforebegin',levelButtons());bindLevelButtons();
  const subtitle=document.querySelector('.lesson-title p');if(subtitle)subtitle.textContent=`${currentTopic.cz} · ${levelInfo().name} · krok ${currentStage+1} z 5`;
  const back=document.getElementById('backToWords');if(back)back.closest('.controls').remove();
};
openTopic=function(id){
  if(lessonBusy)return;stopBritishAudio();wordPractice=null;courseGame=null;courseReview=null;
  currentTopic=FAJN_DATA.topics.find(t=>t.id===id);if(!currentTopic)return;
  currentStage=0;currentIndex=0;quizScore=0;lessonPositions.clear();courseFlow={topic:id,level:courseLevel,visited:{},quiz:null,attempts:{}};renderStage();
};
function ensureCourseFlow(){
  if(!courseFlow||courseFlow.topic!==currentTopic.id||courseFlow.level!==courseLevel)courseFlow={topic:currentTopic.id,level:courseLevel,visited:{},quiz:null,attempts:{}};
  return courseFlow;
}
function courseMarkVisit(stage,id){const flow=ensureCourseFlow();flow.visited[stage] ||= new Set();flow.visited[stage].add(id);}
function courseStageUnits(stage){return stage===3?courseStory(currentTopic,courseLevel):stage===2?courseSpeakingUnits(currentTopic,courseLevel):courseUnits(currentTopic,courseLevel);}
function courseAdvance(stage=currentStage){
  if(lessonBusy)return;const units=courseStageUnits(stage),visited=ensureCourseFlow().visited[stage];
  if(visited?.size>=units.length)completeStage(stage);
  if(currentStage<4){currentStage++;currentIndex=0;renderStage();}else renderFinish();
}
function courseNavigation(units,stage){return `<div class="controls course-navigation"><button class="btn" id="coursePrevious" ${currentIndex===0?'disabled':''}>← Předchozí</button><button class="btn primary" id="courseNext">${currentIndex===units.length-1?'Pokračovat':'Další'} →</button></div>`;}
function bindCourseNavigation(units,stage){
  const previous=document.getElementById('coursePrevious'),next=document.getElementById('courseNext');
  if(previous)previous.onclick=()=>{if(lessonBusy)return;currentIndex--;renderStage();};
  if(next)next.onclick=()=>{if(lessonBusy)return;if(!ensureCourseFlow().visited[stage]?.has(units[currentIndex].id)){courseEvidence(currentTopic,units[currentIndex]).skipped++;saveState();}if(currentIndex<units.length-1){currentIndex++;renderStage();}else courseAdvance(stage);};
}
function courseProgress(index,total){return `<div class="course-progress" aria-label="Úloha ${index+1} z ${total}">${Array.from({length:total},(_,i)=>`<span class="${i<index?'done':i===index?'active':''}">${i<index?'⭐':'●'}</span>`).join('')}</div>`;}
function courseObjectVisual(object){
  const topic=FAJN_DATA.topics.find(t=>t.id===object.topic),word=topic?.words.find(w=>w.en===object.word);
  return word?smallVisual(topic,word,true):'';
}
function courseSceneLabel(scene){
  if(scene.situation)return 'Obrázek situace';if(scene.characters)return 'Terezka a Matýsek';
  return (scene.objects||[]).map(o=>{const t=FAJN_DATA.topics.find(t=>t.id===o.topic),w=t?.words.find(w=>w.en===o.word);return `${o.count||1} × ${o.size?(o.size==='small'?'malá ':'velká '):''}${w?.cz||o.word}`;}).join(', ');
}
function courseSceneHtml(scene,compact=false){
  if(scene.situation)return situationVisual(scene,compact);
  if(scene.characters)return `<div class="course-characters"><img src="assets/characters/terezka.svg" alt="Terezka"><img src="assets/characters/matysek.svg" alt="Matýsek"></div>`;
  return `<div class="meaning-scene ${compact?'compact':''}" role="img" aria-label="${esc(courseSceneLabel(scene))}">${(scene.objects||[]).map(o=>`<div class="meaning-objects count-${o.count||1} ${o.size?'object-'+o.size:''}">${Array.from({length:o.count||1},()=>`<div class="meaning-object">${courseObjectVisual(o)}</div>`).join('')}</div>`).join('')}</div>`;
}
function situationVisual(scene,compact){
  if(scene.situation==='playtime')return `<div class="meaning-scene toy-scene ${compact?'compact':''}"><img src="assets/situations/${esc(scene.prop)}.svg" alt="${esc({ball:'míč',teddy:'plyšový medvídek',kite:'drak',blocks:'kostky'}[scene.prop]||'hračka')}"></div>`;
  if(['terezka','matysek'].includes(scene.prop))return `<div class="meaning-scene ${compact?'compact':''}"><img class="role-character" src="assets/characters/${scene.prop}.svg" alt="${scene.prop==='terezka'?'Terezka':'Matýsek'}"></div>`;
  return `<div class="meaning-scene greeting-scene ${compact?'compact':''}"><img src="assets/situations/${esc(scene.prop)}.svg" alt="${esc({hello:'setkání a pozdrav',goodbye:'loučení',thanks:'poděkování za dárek',please:'prosba o hračku'}[scene.prop]||'situace')}"></div>`;
}
function courseChoices(units,unit){
  const distinct=units.filter(u=>u.id!==unit.id&&JSON.stringify(u.scene)!==JSON.stringify(unit.scene));
  return shuffle([unit,...shuffle([...distinct]).slice(0,3)]);
}
function meaningButtons(choices,personal=false){return `<div class="course-picture-options meaning-options">${choices.map((u,i)=>`<button type="button" class="course-picture-choice meaning-choice" ${personal?'data-personal':'data-meaning'}="${i}" aria-label="${esc(courseSceneLabel(u.scene))}">${courseSceneHtml(u.scene,true)}</button>`).join('')}</div>`;}
function attachCourseListen(unit,stage){
  const button=document.getElementById('listen');if(!button)return;
  button.onclick=()=>{courseEvidence(currentTopic,unit).listens++;if(stage===0)courseMarkVisit(0,unit.id);saveState();speak(unit.en);};
}
renderLearn=function(){
  const units=courseUnits(currentTopic,courseLevel),unit=units[currentIndex];
  if(!unit){courseAdvance(0);return;}
  shell(`<h2>👋 Nauč mě to</h2>${courseProgress(currentIndex,units.length)}${courseLevel===3?`<p class="course-role-note">${currentTopic.id==='family'?'Zahraj si na Terezku nebo Matýska a představ obrázek rodiny.':currentTopic.id==='hello'?'Terezka hraje Lily a Matýsek Toma. Vyber si postavu.':'Poslechni si otázku a jednu možnou odpověď.'}</p><button class="btn" id="courseQuestion">🔊 Otázka</button><p>${esc(unit.promptCz)}</p>`:''}${courseSceneHtml(unit.scene)}<div class="course-model-text"><strong>${esc(unit.en)}</strong><span>${esc(unit.cz)}</span></div>${recognitionListenControl()}${courseNavigation(units,0)}`);
  attachCourseListen(unit,0);if(courseLevel===3)document.getElementById('courseQuestion').onclick=()=>speak(unit.prompt);bindCourseNavigation(units,0);
};
function bindMeaningChoice(choices,unit,onCorrect,attemptKey){
  const flow=ensureCourseFlow();let answered=false,helped=!!flow.attempts[attemptKey];
  document.querySelectorAll('[data-meaning]').forEach(button=>button.onclick=()=>{
    if(answered||button.disabled)return;const candidate=choices[Number(button.dataset.meaning)],correct=candidate.id===unit.id;
    recordCourseChoice(currentTopic,unit,correct,!helped);
    const output=document.getElementById('feedback');
    if(correct){answered=true;document.querySelectorAll('[data-meaning]').forEach(b=>b.disabled=true);output.innerHTML='<div class="kid-feedback great">🌟 Správně!</div>';kidSound('success');onCorrect(!helped);}
    else{helped=true;flow.attempts[attemptKey]=true;button.disabled=true;output.innerHTML='<div class="kid-feedback try">👂 Poslechni si vzor znovu a vyber jiný obrázek.</div>';kidSound('try');speak(unit.en);}
  });
}
renderRecognize=function(){
  const units=courseUnits(currentTopic,courseLevel);while(units[currentIndex]&&ensureCourseFlow().visited[1]?.has(units[currentIndex].id))currentIndex++;
  const unit=units[currentIndex];if(!unit){courseAdvance(1);return;}
  const choices=courseChoices(units,unit);
  shell(`<h2>👂 Poslechni a ukaž</h2>${courseProgress(currentIndex,units.length)}${recognitionListenControl()}${meaningButtons(choices)}<div id="feedback" role="status"></div>`);attachCourseListen(unit,1);
  bindMeaningChoice(choices,unit,()=>{courseMarkVisit(1,unit.id);scheduleLessonAdvance(()=>{currentIndex++;renderRecognize();},800);},'recognise/'+unit.id);
};
function courseSpeechCard(unit,context){
  const showReply=context==='model';
  return `${courseSceneHtml(unit.scene)}${showReply?`<div class="course-model-text"><strong>${esc(unit.en)}</strong><span>${esc(unit.cz)}</span></div>`:''}<div class="speak-actions"><button class="big-action listen-action" id="listen"><span>🔊</span><span>${showReply?'Poslechni':'Otázka'}</span></button><button class="big-action say-action" id="courseRecord"><span>🎙️</span><span>Řeknu to</span></button></div>${showReply?'':'<button class="btn" id="courseHint">👂 Pomoz mi</button>'}<div id="feedback" role="status"></div>`;
}
function prepareCourseSpeech(unit,stage,context,onDone,visitId=unit.id){
  let usedHint=context==='model';const button=document.getElementById('listen');
  button.onclick=()=>speak(context==='model'?unit.en:unit.prompt);
  const hint=document.getElementById('courseHint');if(hint)hint.onclick=()=>{usedHint=true;speak(unit.en);const fb=document.getElementById('feedback');fb.innerHTML=`<div class="course-model-text"><strong>${esc(unit.en)}</strong><span>${esc(unit.cz)}</span></div>`;};
  document.getElementById('courseRecord').onclick=async()=>{
    if(lessonBusy)return;setLessonBusy(true);const record=document.getElementById('courseRecord'),out=document.getElementById('feedback');
    try{
      const blob=await captureChildSpeech({button:record,out,maxMs:10500,minMs:450,silenceMs:900});
      const group=courseLevel===3&&unit.prompt?courseResponseGroup(currentTopic,unit):null;
      const data=await originalCourseAssessment(blob,unit.en,group);
      const evidence=recordCourseSpeech(currentTopic,unit,data);evidence.speechHelped=usedHint;saveState();
      const contentOk=(data.contentScore??data.score)===100;
      if(contentOk&&data.pronunciation?.status==='assessed')courseMarkVisit(stage,visitId);
      out.innerHTML=(context==='reply'?`<div class="communication-result"><strong>💬 Domluva</strong><p>${contentOk?'Rozumím tvé odpovědi.':'Odpovědí si ještě nejsem jistá. Poslechni si otázku znovu.'}${usedHint?' Odpověď jsme zkusili s pomocí.':''}</p></div><h3 class="assessment-heading">🎙️ Výslovnost</h3>`:'')+childPronunciationHtml(data);
      kidSound(data.feedback.passed?'success':'try');
      const okay=data.feedback.passed===true;
      if(onDone){
        const understoodReply=context==='reply'&&contentOk&&data.pronunciation?.status==='assessed';
        if(okay||understoodReply){out.innerHTML+=`<button class="btn primary" id="courseSpeechDone">${okay?'Pokračovat':'Pokračovat, výslovnost ještě procvičím'} →</button>`;document.getElementById('courseSpeechDone').onclick=()=>onDone({independent:!usedHint,passed:true,phoneticPassed:okay,verified:true});}
        else{out.innerHTML+='<button class="btn" id="courseSpeechDone">⏭️ Teď přeskočit</button>';document.getElementById('courseSpeechDone').onclick=()=>{evidence.skipped++;saveState();onDone({independent:false,passed:false,verified:data.pronunciation?.status==='assessed'});};}
      }
    }catch(error){out.innerHTML=`<div class="kid-feedback try">👂 ${error?.code==='no-speech'?'Neslyšela jsem tě. Zkus to ještě jednou.':'Hlas se teď nepodařilo ověřit. Můžeš pokračovat a zkusit to později.'}</div>`;if(onDone&&error?.code!=='no-speech'){out.innerHTML+='<button class="btn" id="courseSpeechDone">Pokračovat bez ověření →</button>';document.getElementById('courseSpeechDone').onclick=()=>onDone({independent:false,passed:false,verified:false});}}
    finally{setLessonBusy(false);if(record.isConnected){record.disabled=false;record.innerHTML='<span>🎙️</span><span>Zkusím znovu</span>';}}
  };
}
renderSpeak=function(){
  const units=courseSpeakingUnits(currentTopic,courseLevel),unit=units[currentIndex];if(!unit){courseAdvance(2);return;}
  if(courseLevel===3&&!ensureCourseFlow().selectedReply){
    const candidates=courseUnits(currentTopic,courseLevel).filter(u=>u.prompt===unit.prompt),choices=candidates.length>1?candidates:[unit];
    shell(`<h2>💬 Teď odpovíš ty</h2>${courseProgress(currentIndex,units.length)}<p>${esc(unit.promptCz)}</p><p class="course-role-note">${currentTopic.id==='family'?'Vyber obrázek z naší pohádkové rodiny.':'Vyber si obrázek a odpověz podle něj.'}</p><button class="big-action listen-action" id="listen">🔊 Otázka</button>${meaningButtons(choices,true)}`);
    document.getElementById('listen').onclick=()=>speak(unit.prompt);
    document.querySelectorAll('[data-personal]').forEach(b=>b.onclick=()=>{ensureCourseFlow().selectedReply=choices[Number(b.dataset.personal)];renderSpeak();});return;
  }
  const selected=courseLevel===3?ensureCourseFlow().selectedReply:unit;
  shell(`<h2>🎙️ ${courseLevel===3?'Odpovím':'Mluvím'}</h2>${courseProgress(currentIndex,units.length)}${courseLevel===3?`<p>${esc(selected.promptCz)}</p>`:''}${courseSpeechCard(selected,courseLevel===3?'reply':'model')}${courseNavigation(units,2)}`);
  prepareCourseSpeech(selected,2,courseLevel===3?'reply':'model',null,unit.id);bindCourseNavigation(units,2);
  const next=document.getElementById('courseNext'),prev=document.getElementById('coursePrevious');
  const nextAction=next.onclick;next.onclick=()=>{ensureCourseFlow().selectedReply=null;nextAction();};
  const prevAction=prev.onclick;prev.onclick=()=>{ensureCourseFlow().selectedReply=null;prevAction();};
};
renderStory=function(){
  const lines=courseStory(currentTopic,courseLevel),line=lines[currentIndex];if(!line){courseAdvance(3);return;}
  const childTurn=courseLevel===3&&currentIndex%2===1;
  shell(`<h2>📖 ${courseLevel===1?'Společně objevujeme':'Malý příběh'}</h2>${courseProgress(currentIndex,lines.length)}<div class="story-partner"><img src="assets/characters/${line.speaker==='Terezka'?'terezka':'matysek'}.svg" alt="${line.speaker}"><strong>${esc(line.speaker)}</strong><span>${childTurn?'Teď promluvíš za tuto postavu.':'Poslechni si tuto postavu.'}</span></div>${childTurn?courseSpeechCard(line,'model'):`${courseSceneHtml(line.scene)}<div class="course-model-text"><strong>${esc(line.en)}</strong><span>${esc(line.cz)}</span></div>${recognitionListenControl()}`}${courseNavigation(lines,3)}`);
  if(childTurn)prepareCourseSpeech(line,3,'model');else document.getElementById('listen').onclick=()=>{courseMarkVisit(3,line.id);speak(line.en);};
  bindCourseNavigation(lines,3);
};
function makeCourseQuiz(topic,level){
  const units=shuffle([...courseUnits(topic,level)]),tasks=units.map(unit=>({type:'listen',unit}));
  if(level===3)tasks.push(...shuffle([...courseSpeakingUnits(topic,3)]).slice(0,2).map(unit=>({type:'reply',unit})));
  return {tasks,index:0,answers:[],helped:{}};
}
function courseLevelQuizResult(quiz){
  const listening=quiz.tasks.filter(t=>t.type==='listen').length,spoken=quiz.tasks.length-listening;
  const independent=quiz.answers.filter((a,i)=>quiz.tasks[i].type==='listen'&&a?.independent).length;
  const replies=quiz.answers.filter((a,i)=>quiz.tasks[i].type==='reply'&&a?.passed&&a?.independent).length;
  const unverified=quiz.answers.filter(a=>a?.verified===false).length;
  return {independent,total:listening,helped:listening-independent,replies,spoken,unverified,passed:independent>=Math.ceil(listening*.8)&&replies===spoken};
}
renderQuiz=function(){
  const flow=ensureCourseFlow();flow.quiz ||= makeCourseQuiz(currentTopic,courseLevel);const quiz=flow.quiz;
  while(quiz.answers[quiz.index])quiz.index++;
  const task=quiz.tasks[quiz.index];
  if(!task){
    const result=courseLevelQuizResult(quiz);topicState(currentTopic.id).lastQuiz={...result,at:Date.now()};
    if(result.passed)completeStage(4);saveState();
    const phoneticReview=quiz.answers.some(a=>a?.passed&&a.phoneticPassed===false);
    shell(`<div class="quiz-result-visual">${result.passed?'🏆':'🌱'}</div><h2>${result.passed?'Paráda! Ověření se povedlo.':'Hotovo! Ještě něco potrénujeme.'}</h2><p>${result.unverified?'Některé odpovědi se nepodařilo ověřit. Zkusíme je později.':result.passed?'Poslechu rozumíš a odpovědi se ti daří.':'Některé odpovědi potřebovaly pomoc. Příště to zkusíme samostatně.'}${phoneticReview?' Domluva se povedla. Některé zvuky ještě procvičíme.':''}</p><div class="controls"><button class="btn primary" id="courseQuizFinish">${result.passed?'Pokračovat →':'👂 Potrénovat'}</button><button class="btn" id="courseQuizRetry">🔊 Zkusit znovu</button><button class="btn" id="courseExit">🏠 Domů</button></div>`);
    document.getElementById('courseQuizFinish').onclick=result.passed?renderFinish:()=>startCourseReview(currentTopic.id);document.getElementById('courseQuizRetry').onclick=()=>{flow.quiz=null;for(const key of Object.keys(flow.attempts))if(key.startsWith('quiz/'))delete flow.attempts[key];renderQuiz();};document.getElementById('courseExit').onclick=renderHome;return;
  }
  if(task.type==='reply'){
    if(!task.selected){const choices=courseUnits(currentTopic,3).filter(u=>u.prompt===task.unit.prompt);shell(`<h2>💬 Vyber si a odpověz</h2>${courseProgress(quiz.index,quiz.tasks.length)}<p>${esc(task.unit.promptCz)}</p><button class="big-action listen-action" id="listen">🔊 Otázka</button>${meaningButtons(choices,true)}`);document.getElementById('listen').onclick=()=>speak(task.unit.prompt);document.querySelectorAll('[data-personal]').forEach(b=>b.onclick=()=>{task.selected=choices[Number(b.dataset.personal)];renderQuiz();});return;}
    shell(`<h2>💬 Odpovíš na otázku?</h2>${courseProgress(quiz.index,quiz.tasks.length)}<p>${esc(task.selected.promptCz)}</p><p>Odpověz podle vybraného obrázku. Krátká správná odpověď také stačí.</p>${courseSpeechCard(task.selected,'reply')}`);
    prepareCourseSpeech(task.selected,4,'reply',result=>{quiz.answers[quiz.index]=result;quiz.index++;renderQuiz();});return;
  }
  const choices=courseChoices(courseUnits(currentTopic,courseLevel),task.unit);
  shell(`<h2>👂 Poslechni a ukaž</h2>${courseProgress(quiz.index,quiz.tasks.length)}${recognitionListenControl()}${meaningButtons(choices)}<div id="feedback" role="status"></div>`);attachCourseListen(task.unit,4);
  bindMeaningChoice(choices,task.unit,independent=>{quiz.answers[quiz.index]={independent,verified:true};scheduleLessonAdvance(()=>{quiz.index++;renderQuiz();},800);},'quiz/'+quiz.index);
};
renderFinish=function(){
  const ts=topicState(currentTopic.id);ts.mastered=courseTopicMastered(currentTopic);saveState();const complete=ts.stages.every(Boolean);
  shell(`<div class="course-characters"><img src="assets/characters/terezka.svg" alt="Terezka"><img src="assets/characters/matysek.svg" alt="Matýsek"></div><h2>${ts.mastered?'🏅 Tohle už umíš!':complete?'⭐ Tato výprava je hotová!':'🌟 Ověření se povedlo!'}</h2><p>${ts.mastered?'Poslechu rozumíš samostatně a výslovnost je ověřená.':complete?'Pro odznak ještě můžeme procvičit samostatné odpovědi a výslovnost.':'Můžeš pokračovat ostatními částmi lekce.'}</p><div class="controls"><button class="btn primary" id="courseContinue">${complete&&courseLevel<3?'🌿 Zkusit další úroveň':'Pokračovat v tématu'} →</button><button class="btn" id="courseGameStart">🎮 Výprava za mostem</button><button class="btn" id="courseExit">🏠 Domů</button></div>`);
  document.getElementById('courseContinue').onclick=()=>{if(complete&&courseLevel<3)switchCourseLevel(courseLevel+1);else{currentStage=Math.max(0,ts.stages.findIndex(v=>!v));currentIndex=0;renderStage();}};document.getElementById('courseGameStart').onclick=()=>startAdventureFor(currentTopic.id);document.getElementById('courseExit').onclick=renderHome;
};
function courseReviewQueue(topicId){return FAJN_DATA.topics.filter(t=>!topicId||t.id===topicId).flatMap(topic=>courseUnits(topic,courseLevel).filter(unit=>{const p=courseReadEvidence(topic,unit);return p?.review||p?.speechReview||p?.lastSpeechStatus==='unavailable';}).map(unit=>({topic,unit}))).sort((a,b)=>(courseReadEvidence(a.topic,a.unit)?.at||0)-(courseReadEvidence(b.topic,b.unit)?.at||0));}
function startCourseReview(topicId){
  if(lessonBusy)return;const queue=courseReviewQueue(topicId).slice(0,6);courseReview={queue,index:0,mode:'listen'};
  if(courseFlow)for(const key of Object.keys(courseFlow.attempts))if(key.startsWith('review/'))delete courseFlow.attempts[key];renderCourseReview();
}
startWordPractice=startCourseReview;
function renderCourseReview(){
  const item=courseReview.queue[courseReview.index];
  if(!item){app.innerHTML='<section class="panel"><div class="reward-burst">🌟</div><h1>Na dnešek pěkná práce!</h1><p>Vrať se do našeho světa, nebo zkus jinou výpravu.</p><button class="btn primary" id="courseExit">🏠 Domů</button></section>';document.getElementById('courseExit').onclick=renderHome;return;}
  currentTopic=item.topic;currentStage=1;currentIndex=0;const unit=item.unit,p=courseReadEvidence(currentTopic,unit),units=courseUnits(currentTopic,courseLevel),choices=courseChoices(units,unit);
  shell(`<h2>👂 Ještě potrénujeme</h2>${courseProgress(courseReview.index,courseReview.queue.length)}${courseReview.mode==='speak'?courseSpeechCard(unit,courseLevel===3?'reply':'model'):recognitionListenControl()+meaningButtons(choices)+'<div id="feedback" role="status"></div>'}<div class="controls"><button class="btn" id="courseSkip">⏭️ Teď přeskočit</button><button class="btn" id="courseExit">🏠 Domů</button></div>`);
  const advance=()=>{courseReview.index++;courseReview.mode='listen';renderCourseReview();};document.getElementById('courseSkip').onclick=()=>{courseEvidence(currentTopic,unit).skipped++;saveState();advance();};document.getElementById('courseExit').onclick=renderHome;
  if(courseReview.mode==='speak')prepareCourseSpeech(unit,1,courseLevel===3?'reply':'model',advance);
  else{attachCourseListen(unit,1);bindMeaningChoice(choices,unit,()=>scheduleLessonAdvance(()=>{if(p?.speechReview||p?.lastSpeechStatus==='unavailable'){courseReview.mode='speak';renderCourseReview();}else advance();},800),'review/'+courseReview.index);}
}
const previousLevelsHome=renderHome;
renderHome=function(){
  if(lessonBusy)return;courseGame=null;courseReview=null;courseFlow=null;previousLevelsHome();
  const hero=document.querySelector('.hero');const levels=document.createElement('section');levels.className='level-home';levels.innerHTML=`<h2>Jakou výpravu si vybereš?</h2>${levelButtons(true)}<p>Obtížnost můžeš kdykoliv změnit. Každá má vlastní pokrok.</p>`;
  if(hero)hero.after(levels);else app.prepend(levels);bindLevelButtons();
  const oldReview=document.querySelector('.practice-home-card');if(oldReview)oldReview.remove();
  if(courseReviewQueue().length){const card=document.createElement('section');card.className='practice-home-card';card.innerHTML='<div><h2>👂 Ještě potrénujeme</h2><p>Krátká výprava za tím, co potřebuje zopakovat.</p></div><button class="btn primary" id="startWordPractice">Pojďme na to →</button>';document.querySelector('.section-title')?.before(card);document.getElementById('startWordPractice').onclick=()=>startCourseReview();}
  document.querySelectorAll('.topic-card').forEach((card,i)=>{if(FAJN_DATA.topics[i]?.situation)card.classList.add('situation-card');});
  const gameCard=document.getElementById('gameBtn')?.closest('section');if(gameCard){gameCard.querySelector('h2').textContent='Postavíme most!';gameCard.querySelector('p:not(.eyebrow)').textContent='Pomoz Terezce a Matýskovi přejít řeku. Každou odpovědí přidáme kus mostu. Na druhém břehu čeká další výprava.';}
};

/* A bridge that actually grows: no lives, no penalties, no bonus for guessing.
   Each answer adds a plank. A finish changes the destination and opens a route. */
function courseGameShell(body){shell(body);document.querySelector('.path')?.remove();const subtitle=document.querySelector('.lesson-title p');if(subtitle)subtitle.textContent=`${currentTopic.cz} · ${levelInfo().name} · herní výprava`;}
function courseBridgeHtml(round,complete=false){return `<div class="bridge-world ${complete?'bridge-complete':''}" role="img" aria-label="Most: ${Math.min(round,8)} z 8 částí"><svg viewBox="0 0 800 240" aria-hidden="true"><defs><linearGradient id="river" x2="0" y2="1"><stop stop-color="#7dd8f7"/><stop offset="1" stop-color="#3897d6"/></linearGradient></defs><rect width="800" height="240" rx="25" fill="#dbf5ff"/><circle cx="100" cy="55" r="30" fill="#ffdb59"/><path d="M0 180Q90 120 220 180L220 240H0Z M580 180Q700 100 800 170V240H580Z" fill="#64bc7d"/><path d="M220 170Q410 195 580 160V240H220Z" fill="url(#river)"/><path class="river-wave" d="M255 212Q320 194 385 212T520 212" stroke="#d9f8ff" stroke-width="7" fill="none"/>${Array.from({length:8},(_,i)=>`<g class="bridge-plank ${i<round?'built':''}" style="--plank:${i}"><rect x="${215+i*47}" y="158" width="45" height="18" rx="4" fill="${i<round?'#b6753d':'#bed2d6'}"/><path d="M${237+i*47} 159v-40" stroke="${i<round?'#87532e':'#bed2d6'}" stroke-width="5"/></g>`).join('')}<path d="M232 120Q405 140 566 120" stroke="#ae7445" stroke-width="5" fill="none" opacity="${round/8}"/><path d="M665 165v-42l30-18 30 18v42" fill="${complete?'#ffd371':'#bed2d6'}"/><path d="M654 124l41-33 42 33" fill="${complete?'#d96370':'#a5bdc4'}"/><circle cx="695" cy="145" r="10" fill="#fff1b1"/><path d="M755 166v-28m-18 10h35" stroke="${complete?'#46a660':'#bed2d6'}" stroke-width="8" stroke-linecap="round"/></svg><div class="bridge-heroes" style="left:${10+Math.min(round,8)*8}%"><img src="assets/characters/terezka.svg" alt=""><img src="assets/characters/matysek.svg" alt=""></div>${complete?'<div class="bridge-destination">🏡 Dorazili jsme!</div>':''}</div>`;}
startAdventure=function(){startAdventureFor(currentTopic?.id||FAJN_DATA.topics.find(t=>topicState(t.id).stages.some(Boolean))?.id||'animals');};
startAdventureFor=function(id){
  if(lessonBusy)return;stopBritishAudio();currentTopic=FAJN_DATA.topics.find(t=>t.id===id);currentStage=1;currentIndex=0;courseFlow=null;
  const units=shuffle([...courseUnits(currentTopic,courseLevel)]);
  courseGame={topic:currentTopic,level:courseLevel,round:0,helped:false,independent:0,spoken:0,unverified:0,questions:Array.from({length:8},(_,i)=>({unit:units[i%units.length],type:courseLevel===3&&[3,7].includes(i)?'reply':'listen'}))};renderAdventure();
};
renderAdventure=function(){
  if(!courseGame)return;const played=courseGame,task=played.questions[played.round];
  if(!task){renderAdventureFinish();return;}
  currentTopic=played.topic;currentIndex=played.round;
  const gameChoices=courseChoices(courseUnits(currentTopic,courseLevel),task.unit);
  if(task.type==='reply'&&!task.selected){
    const choices=courseUnits(currentTopic,3).filter(u=>u.prompt===task.unit.prompt);
    courseGameShell(`<h2>🌉 Vyber si a odpověz</h2>${courseBridgeHtml(played.round)}<p>${esc(task.unit.promptCz)}</p><button class="big-action listen-action" id="listen">🔊 Otázka</button>${meaningButtons(choices,true)}<button class="btn" id="courseExit">🏠 Ukončit výpravu</button>`);
    document.getElementById('listen').onclick=()=>speak(task.unit.prompt);document.querySelectorAll('[data-personal]').forEach(b=>b.onclick=()=>{task.selected=choices[Number(b.dataset.personal)];renderAdventure();});document.getElementById('courseExit').onclick=renderHome;return;
  }
  const speakingUnit=task.selected||task.unit;
  courseGameShell(`<div class="course-game-heading"><h2>🌉 Postavíme most!</h2><p>${esc(levelInfo().name)} · ${played.round+1}/8</p></div>${courseBridgeHtml(played.round)}<p class="bridge-mission">Každou odpovědí přidáme prkno. Pomoc je vždycky po ruce.</p>${task.type==='reply'?`<p>${esc(speakingUnit.promptCz)}</p>${courseSpeechCard(speakingUnit,'reply')}`:`${recognitionListenControl()}${meaningButtons(gameChoices)}<div id="feedback" role="status"></div>`}<div class="controls"><button class="btn" id="courseExit">🏠 Ukončit výpravu</button></div>`);
  const advance=result=>{if(courseGame!==played)return;if(result?.verified===false)played.unverified++;if(result?.independent)played.independent++;if(task.type==='reply'&&result?.passed)played.spoken++;played.round++;renderAdventure();};
  if(task.type==='reply')prepareCourseSpeech(speakingUnit,1,'reply',advance);
  else{
    attachCourseListen(task.unit,1);
    const buttons=[...document.querySelectorAll('[data-meaning]')];
    let answered=false,helped=false;
    buttons.forEach(b=>b.onclick=()=>{if(answered||b.disabled)return;const correct=task.unit.id===gameChoices[Number(b.dataset.meaning)].id;recordCourseChoice(currentTopic,task.unit,correct,!helped);const out=document.getElementById('feedback');if(correct){answered=true;buttons.forEach(x=>x.disabled=true);kidSound('success');out.innerHTML='<div class="kid-feedback great">🌟 Další prkno na most!</div>';const panel=document.querySelector('.panel');setTimeout(()=>{if(panel.isConnected&&courseGame===played)advance({independent:!helped,verified:true});},850);}else{helped=true;b.disabled=true;kidSound('try');out.innerHTML='<div class="kid-feedback try">👂 Poslechni si vzor a zkus jiný obrázek.</div>';speak(task.unit.en);}});
  }
  document.getElementById('courseExit').onclick=renderHome;
};
renderAdventureFinish=function(){
  const played=courseGame,key=`${played.topic.id}/${played.level}`,previous=state.course.games[key]||{plays:0,best:0};
  if(!played.recorded){previous.plays++;previous.best=Math.max(previous.best,played.independent);previous.last={independent:played.independent,spoken:played.spoken,unverified:played.unverified,at:Date.now()};state.course.games[key]=previous;played.recorded=true;saveState();}
  courseGameShell(`${courseBridgeHtml(8,true)}<h2>🌟 Most stojí!</h2><p>${played.unverified?'Část mluvení ještě ověříme později. Most jsme společně dokončili.':'Terezka a Matýsek přešli řeku. Na druhém břehu čeká další dobrodružství.'}</p><div class="controls"><button class="btn primary" id="courseGameNext">${courseLevel<3?'🌿 Výprava o úroveň výš':'🗺️ Další téma'} →</button><button class="btn" id="courseReplay">🎮 Postavit znovu</button><button class="btn" id="courseExit">🏠 Domů</button></div>`);
  document.getElementById('courseGameNext').onclick=()=>{const id=played.topic.id;if(courseLevel<3){switchCourseLevel(courseLevel+1);startAdventureFor(id);}else{const i=FAJN_DATA.topics.findIndex(t=>t.id===id);startAdventureFor(FAJN_DATA.topics[(i+1)%FAJN_DATA.topics.length].id);}};document.getElementById('courseReplay').onclick=()=>startAdventureFor(played.topic.id);document.getElementById('courseExit').onclick=renderHome;
};

/* Parents: all three levels visible together, independently of selected level. */
const previousLevelParentDashboard=renderParentDashboard;
renderParentDashboard=function(){
  const selected=courseLevel;courseLevel=1;try{previousLevelParentDashboard();}finally{courseLevel=selected;}
  document.querySelector('.parent-head h2').textContent='Základní přehled · Objevuji';
  const legacyHeading=document.querySelector('.parent-modal>h3');if(legacyHeading)legacyHeading.textContent='Původní přehled slov · Objevuji';
  const note=document.createElement('section');note.className='parent-course-levels';
  note.innerHTML='<h3>Pokrok podle obtížnosti</h3><p>Objevuji: slova. Spojuji: význam krátkých vět. Domluvím se: odpověď na otázku. Poslech, pomoc a výslovnost jsou oddělené. Přeskočená nebo neověřená odpověď není důkaz zvládnutí.</p>'+FAJN_DATA.topics.map(topic=>`<details><summary>${topic.emoji} ${esc(topic.cz)}</summary>${COURSE_LEVELS.map(level=>{
    const units=courseUnits(topic,level.id),ts=level.id===1?state.topics[topic.id]:state.course.topics[topic.id]?.[level.id],gameResult=state.course.games[`${topic.id}/${level.id}`];
    return `<h4>${level.icon} ${level.name} · ${(ts?.stages||[]).filter(Boolean).length}/5 částí</h4>${gameResult?`<p>Dokončených herních výprav: ${gameResult.plays}. Nejlepší samostatný výkon: ${gameResult.best}/8.${gameResult.last?.unverified?` Poslední výprava: ${gameResult.last.unverified} mluvených odpovědí bez ověření.`:''}</p>`:''}<div class="parent-table-wrap"><table class="parent-word-table"><thead><tr><th>Slovo nebo odpověď</th><th>Poslech</th><th>Mluvení</th><th>Doporučení</th></tr></thead><tbody>${units.map(unit=>{const p=courseReadEvidence(topic,unit,level.id);return `<tr><td>${esc(unit.en)}<small>${esc(unit.cz)}</small></td><td>${p?`${p.independent} samostatně · ${p.helped} s pomocí · ${p.mistakes} chyb`:'Zatím neověřeno'}</td><td>${p?.speechAttempts?`${p.lastSpeechStatus==='unavailable'?'Nyní bez ověření'+(p.speechOk?' · dříve se povedlo':''):p.speechOk?'✓ poslední fonetický výsledek se povedl':'Ještě procvičit'}${p.speechHelped?' · se vzorem':''}`:'Zatím neověřeno'}</td><td>${esc(p?.tip||'')}${p?.skipped?` · ${p.skipped} přeskočeno`:''}</td></tr>`;}).join('')}</tbody></table></div>${ts?.lastQuiz?`<p>Ověření: ${ts.lastQuiz.independent}/${ts.lastQuiz.total} samostatně${ts.lastQuiz.spoken?`, ${ts.lastQuiz.replies}/${ts.lastQuiz.spoken} samostatných odpovědí`:''}. ${ts.lastQuiz.passed?'Splněno.':'Ještě procvičit.'}</p>`:''}`;
  }).join('')}</details>`).join('');
  document.querySelector('.parent-head').after(note);
};
renderHome();
