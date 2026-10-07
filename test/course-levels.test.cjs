const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {parseHTML}=require('linkedom');
const root=path.join(__dirname,'..');
function application(saved){
  const {document}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8')),storage=new Map(saved?[['fajn-anglictina-ter-mat-v1',JSON.stringify(saved)]]:[]),timers=[];
  const sandbox={document,console,Date,Map,Set,Blob,FormData,AbortController,URL,TextEncoder,crypto:require('node:crypto').webcrypto,navigator:{},location:{reload(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},fetch:async()=>{throw new Error('offline-test');}};
  sandbox.window=sandbox;vm.createContext(sandbox);
  for(const script of [...document.querySelectorAll('script[src]')])vm.runInContext(fs.readFileSync(path.join(root,script.getAttribute('src').split('?')[0]),'utf8'),sandbox,{filename:script.getAttribute('src')});
  return {s:sandbox,document,storage,run:code=>vm.runInContext(code,sandbox),flush(){const pending=timers.splice(0);pending.forEach(fn=>fn());}};
}
test('All 16 topics render all five sections at all three levels with meaningful distinct images',()=>{
  const h=application();assert.equal(h.s.FAJN_DATA.topics.length,16);
  for(const level of [1,2,3])for(const topic of h.s.FAJN_DATA.topics){h.s.switchCourseLevel(level);h.s.openTopic(topic.id);for(let stage=0;stage<5;stage++){h.run(`currentStage=${stage};currentIndex=0;renderStage()`);assert.equal(h.document.querySelectorAll('[data-level]').length,3);assert.equal(h.document.querySelectorAll('.path [data-stage]').length,5);assert.doesNotMatch(h.document.getElementById('app').innerHTML,/undefined|fallback-visual/);assert.equal(new Set([...h.document.querySelectorAll('[id]')].map(e=>e.id)).size,h.document.querySelectorAll('[id]').length,'No duplicate IDs');for(const img of h.document.querySelectorAll('img'))assert.ok(fs.existsSync(path.join(root,img.getAttribute('src'))),img.getAttribute('src'));}};
});
test('Selecting a higher level preserves original progress and isolates new evidence',()=>{
  const saved={topics:{animals:{stages:[true,false,false,false,false],mastered:false,bestPronunciation:90}},stars:7,learning:{version:1,words:{'animals/frog':{independentCorrect:2,wrongChoices:1,lastRecognition:'independent',recognitionNeedsPractice:true}}}};
  const h=application(saved);h.s.openTopic('animals');h.s.switchCourseLevel(2);const unit=h.s.courseUnits(h.s.FAJN_DATA.topics.find(t=>t.id==='animals'),2)[0];h.s.recordCourseChoice(h.s.FAJN_DATA.topics.find(t=>t.id==='animals'),unit,false,true);assert.equal(h.run('state.topics.animals.stages[0]'),true);assert.equal(h.run('state.stars'),7);assert.equal(h.run('state.course.evidence["animals/1/word-7"].review'),true);assert.equal(h.run('state.course.evidence["animals/2/dog"].mistakes'),1);
  h.s.completeStage(0);assert.equal(h.run('state.course.topics.animals[2].stages[0]'),true);assert.equal(h.run('state.topics.animals.stages[1]'),false);
});
test('A personal preference has four choices and just one communication task, not four imposed favourites',()=>{
  const h=application();h.s.switchCourseLevel(3);h.s.openTopic('animals');h.run('currentStage=2;renderSpeak()');assert.equal(h.document.querySelectorAll('[data-personal]').length,4);assert.equal(h.s.courseSpeakingUnits(h.s.FAJN_DATA.topics.find(t=>t.id==='animals'),3).length,1);h.document.querySelector('[data-personal]').onclick();assert.ok(h.document.getElementById('courseRecord'));assert.ok(h.document.getElementById('courseHint'));
});
test('Wrong, helped and duplicate picture clicks remain fair after navigation',()=>{
  const h=application();h.s.openTopic('animals');h.run('currentStage=1;renderRecognize()');const expected=h.s.courseUnits(h.s.FAJN_DATA.topics.find(t=>t.id==='animals'),1)[0];const buttons=[...h.document.querySelectorAll('[data-meaning]')],right=buttons.find(b=>b.getAttribute('aria-label')==='1 × pes'),wrong=buttons.find(b=>b!==right);wrong.onclick();h.run('renderRecognize()');const correct=[...h.document.querySelectorAll('[data-meaning]')].find(b=>b.getAttribute('aria-label')==='1 × pes');correct.onclick();correct.onclick();assert.equal(h.run('state.course.evidence["animals/1/word-0"].helped'),1);assert.equal(h.run('state.course.evidence["animals/1/word-0"].independent'),0);
});
test('Unavailable pronunciation never passes the communication check or earns mastery',()=>{
  const h=application();h.s.switchCourseLevel(3);const topic=h.s.FAJN_DATA.topics.find(t=>t.id==='animals'),unit=h.s.courseUnits(topic,3)[0];h.s.recordCourseSpeech(topic,unit,{contentScore:100,pronunciation:{status:'unavailable'},feedback:{level:'content-only',passed:false}});assert.equal(h.s.courseReadEvidence(topic,unit).phoneticAttempts,0);assert.equal(h.s.courseTopicMastered(topic),false);const quiz=h.s.makeCourseQuiz(topic,3);quiz.answers=quiz.tasks.map(t=>t.type==='listen'?{independent:true}:{independent:false,passed:false,verified:false});assert.equal(h.s.courseLevelQuizResult(quiz).passed,false);assert.equal(h.s.courseLevelQuizResult(quiz).unverified,1);
});
test('All games have eight rounds, correct pictures and an actual growing bridge; old timeout cannot hijack another page',()=>{
  const h=application();for(const level of [1,2,3])for(const topic of h.s.FAJN_DATA.topics){h.s.switchCourseLevel(level);h.s.startAdventureFor(topic.id);assert.equal(h.run('courseGame.questions.length'),8);assert.equal(h.document.querySelectorAll('.bridge-plank').length,8);assert.ok(h.document.getElementById('listen'));assert.ok(h.document.querySelectorAll('[data-meaning]').length>=3);assert.doesNotMatch(h.document.getElementById('app').innerHTML,/undefined|fallback-visual/);}h.s.renderHome();h.flush();assert.ok(h.document.getElementById('topics'));
});
test('Parent dashboard renders all levels and latest service unavailability honestly',()=>{
  const h=application();h.s.switchCourseLevel(2);const topic=h.s.FAJN_DATA.topics[0],unit=h.s.courseUnits(topic,2)[0];h.s.recordCourseSpeech(topic,unit,{contentScore:100,pronunciation:{status:'assessed'},feedback:{passed:true,level:'great'}});h.s.recordCourseSpeech(topic,unit,{contentScore:100,pronunciation:{status:'unavailable'},feedback:{passed:false,level:'content-only'}});h.s.renderParentDashboard();assert.equal(h.document.querySelectorAll('.parent-course-levels>details').length,16);assert.match(h.document.querySelector('.parent-course-levels').textContent,/Objevuji.*Spojuji.*Domluvím se/s);assert.match(h.document.querySelector('.parent-course-levels').textContent,/Nyní bez ověření · dříve se povedlo/);assert.equal(h.run('courseLevel'),2);
});
test('Complete meaning is illustrated: two and three rabbits have different counts; big and small cat different scale',()=>{
  const h=application(),topic=h.s.FAJN_DATA.topics.find(t=>t.id==='animals'),units=h.s.courseUnits(topic,2);const two=units.find(u=>u.id==='two-rabbits'),three=units.find(u=>u.id==='three-rabbits');assert.equal((h.s.courseSceneHtml(two.scene).match(/meaning-object"/g)||[]).length,2);assert.equal((h.s.courseSceneHtml(three.scene).match(/meaning-object"/g)||[]).length,3);assert.match(h.s.courseSceneHtml(units.find(u=>u.id==='small-cat').scene),/object-small/);assert.match(h.s.courseSceneHtml(units.find(u=>u.id==='big-cat').scene),/object-big/);
});
test('Every taught phrase, question, story and reply variant has the same server catalogue and real scene assets',()=>{
  const h=application(),catalogue=JSON.parse(fs.readFileSync(path.join(root,'course-catalogue.json'),'utf8')),server=JSON.parse(fs.readFileSync(path.join(root,'../fdc-gateway/lib/course-response-groups.json'),'utf8'));
  for(const topic of h.s.FAJN_DATA.topics)for(const level of [1,2,3]){
    const units=h.s.courseUnits(topic,level);assert.equal(new Set(units.map(u=>u.id)).size,units.length);assert.equal(new Set(units.map(u=>JSON.stringify(u.scene))).size,units.length,'Distinct listening meanings');
    for(const unit of [...units,...h.s.courseStory(topic,level)]){assert.ok(unit.en&&unit.cz);assert.ok(catalogue.texts.includes(unit.en),unit.en);if(unit.prompt)assert.ok(catalogue.texts.includes(unit.prompt));assert.doesNotMatch(unit.en,/\b(color|favorite|mom|airplane)\b/i);for(const o of unit.scene.objects||[]){const t=h.s.FAJN_DATA.topics.find(t=>t.id===o.topic);assert.ok(t?.words.some(w=>w.en===o.word),`${o.topic}/${o.word}`);}if(unit.answers.length>1)assert.deepEqual([...unit.answers],server[h.s.courseResponseGroup(topic,unit)]);}
  }
});
test('Retry clears helped quiz state, keeps actual practice evidence and permits a new independent attempt',()=>{
  const h=application();h.s.openTopic('animals');h.run('currentStage=4;ensureCourseFlow().attempts["quiz/0"]=true;courseFlow.quiz=makeCourseQuiz(currentTopic,1);courseFlow.quiz.index=courseFlow.quiz.tasks.length;courseFlow.quiz.answers=courseFlow.quiz.tasks.map(()=>({independent:false}));renderQuiz()');h.document.getElementById('courseQuizRetry').onclick();assert.equal(h.run('courseFlow.attempts["quiz/0"]'),undefined);assert.ok(h.document.querySelectorAll('[data-meaning]').length===4);
});
test('New backup round-trip preserves every level, mistakes, pending pronunciation and game record',()=>{
  const h=application();h.s.switchCourseLevel(2);const t=h.s.FAJN_DATA.topics[0],u=h.s.courseUnits(t,2)[0];h.s.recordCourseChoice(t,u,false,true);h.s.recordCourseSpeech(t,u,{contentScore:100,pronunciation:{status:'unavailable'},feedback:{level:'content-only',passed:false}});
  const saved=JSON.parse(h.run('JSON.stringify(state)'));const restored=h.s.validateCourseBackup({format:'fajn-anglictina-progress',version:1,state:saved});assert.equal(restored.course.evidence['colours/2/red'].mistakes,1);
  const invalid=JSON.parse(JSON.stringify(saved));invalid.course.level=9;assert.throws(()=>h.s.validateCourseBackup({format:'fajn-anglictina-progress',version:1,state:invalid}));invalid.course.level=2;invalid.course.evidence['colours/2/red'].independent='bad';assert.throws(()=>h.s.validateCourseBackup({format:'fajn-anglictina-progress',version:1,state:invalid}));
});
test('Leaving after a correct quiz click resumes at the next task and cannot count the same answer twice',()=>{
  const h=application();h.s.openTopic('animals');h.run('currentStage=4;renderQuiz()');const label=h.run('courseSceneLabel(courseFlow.quiz.tasks[0].unit.scene)');const right=[...h.document.querySelectorAll('[data-meaning]')].find(b=>b.getAttribute('aria-label')===label);right.onclick();h.run('currentStage=0;renderLearn();currentStage=4;renderQuiz()');assert.equal(h.run('courseFlow.quiz.index'),1);assert.equal(h.run('courseFlow.quiz.answers.filter(Boolean).length'),1);
});
test('Skipping an unverified speaking task is recorded without completing its stage',()=>{
  const h=application();h.s.switchCourseLevel(2);h.s.openTopic('animals');h.run('currentStage=2;renderSpeak()');h.document.getElementById('courseNext').onclick();assert.equal(h.run('state.course.evidence["animals/2/dog"].skipped'),1);assert.equal(h.run('state.course.topics.animals[2].stages[2]'),false);
});
