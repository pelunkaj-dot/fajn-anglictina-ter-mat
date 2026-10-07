/* Per-word evidence, separate listening recognition from phonetic assessment. */
function learningWord(topicId,en){
  state.learning ||= {version:1,words:{}};
  const key=`${topicId}/${en.toLowerCase()}`;
  return state.learning.words[key] ||= {recognitionAttempts:0,independentCorrect:0,helpedCorrect:0,wrongChoices:0,recognitionStreak:0,speechAttempts:0,phoneticAttempts:0,speechStreak:0};
}
function recordPictureChoice(topic,word,correct,firstTry){
  const p=learningWord(topic.id,word.en);p.lastPracticed=Date.now();
  if(!correct){p.wrongChoices++;p.recognitionStreak=0;p.recognitionNeedsPractice=true;}
  else {p.recognitionAttempts++;if(firstTry){p.independentCorrect++;p.recognitionStreak++;}else{p.helpedCorrect++;p.recognitionStreak=0;}p.recognitionNeedsPractice=!firstTry||(p.recognitionNeedsPractice===true&&p.recognitionStreak<2);p.lastRecognition=firstTry?'independent':'helped';}
  topicState(topic.id).mastered=courseTopicMastered(topic);
  saveState();return p;
}
function recordWordSpeech(topic,expected,data){
  const normalize=text=>String(text).toLowerCase().replace(/[^a-z -]/g,' ').trim();
  const assessed=data.pronunciation?.status==='assessed';
  for(const word of topic.words){
    const direct=normalize(expected)===word.en.toLowerCase();
    const result=(data.pronunciation?.words||[]).find(w=>normalize(w.word)===word.en.toLowerCase());
    const mentioned=normalize(expected).split(/\s+/).some(token=>token===word.en.toLowerCase()||token===word.en.toLowerCase()+'s'||token===word.en.toLowerCase()+'es');
    if(!direct&&!result&&!mentioned)continue;
    const p=learningWord(topic.id,word.en);p.speechAttempts++;p.lastPracticed=Date.now();p.lastSpeechStatus=assessed?'assessed':'unavailable';
    if(!assessed)continue; // No failed phonetics claim when the service is unavailable.
    p.phoneticAttempts++;
    const issues=(data.pronunciation.issues||[]).filter(i=>normalize(i.word)===word.en.toLowerCase());
    const sounds=result?.phonemes||[];
    const correctedIssue=issues.some(i=>['voicing','th-substitution','vowel-substitution','phoneme-substitution'].includes(i.type));
    const clear=direct?data.feedback?.passed===true&&!correctedIssue:!!result&&Number.isFinite(result.accuracyScore)&&result.accuracyScore>=65&&sounds.length>0&&sounds.every(s=>Number.isFinite(s.accuracyScore)&&s.accuracyScore>=65)&&!correctedIssue;
    p.lastSpeechLevel=clear?(direct?data.feedback.level:'good'):'retry';
    p.lastSpeechTip=direct?String(data.feedback?.tip||''):issues.map(i=>String(i.tip||i.message||'')).filter(Boolean).join(' ');
    p.issues=issues.map(i=>({type:String(i.type||''),expected:String(i.expected||''),actual:String(i.actual||'')}));
    p.speechStreak=clear?p.speechStreak+1:0;p.speechNeedsPractice=!clear||(direct&&data.feedback?.needsPractice===true);
  }
  topicState(topic.id).mastered=courseTopicMastered(topic);
  saveState();
}
function wordNeedsPractice(topic,word){
  const p=state.learning?.words?.[`${topic.id}/${word.en.toLowerCase()}`];
  return !!p&&(p.recognitionNeedsPractice===true||p.speechNeedsPractice===true);
}
function practiceWords(){
  return FAJN_DATA.topics.flatMap(topic=>topic.words.filter(word=>wordNeedsPractice(topic,word)).map(word=>({topic,word})))
    .sort((a,b)=>(state.learning.words[`${a.topic.id}/${a.word.en.toLowerCase()}`].lastPracticed||0)-(state.learning.words[`${b.topic.id}/${b.word.en.toLowerCase()}`].lastPracticed||0));
}
function courseTopicMastered(topic){
  const ts=topicState(topic.id);
  return !!ts.stages?.every(Boolean)&&ts.lastQuiz?.passed!==false&&topic.words.every(word=>{const p=state.learning?.words?.[`${topic.id}/${word.en.toLowerCase()}`];return p?.lastRecognition==='independent'&&p.recognitionNeedsPractice!==true&&['great','good'].includes(p.lastSpeechLevel)&&p.speechNeedsPractice!==true;});
}

const originalCourseAssessment=assessChildSpeech;
assessChildSpeech=async function(blob,expected){
  const topic=currentTopic||((typeof game!=='undefined')?game.topic:null);
  const data=await originalCourseAssessment(blob,expected);
  if(topic)recordWordSpeech(topic,expected,data);
  return data;
};

const originalCourseCapture=captureChildSpeech;
captureChildSpeech=async function(options){
  stopBritishAudio();
  return originalCourseCapture(options);
};
