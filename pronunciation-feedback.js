/* Shared phonetic request and child feedback. No cloud credentials in the browser. */
function encodeAssessmentWav(samples) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? Math.round(value * 32768) : Math.round(value * 32767), true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

async function speechAsWav(blob) {
  const Context = window.AudioContext || window.webkitAudioContext;
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Context || !Offline) throw new Error('audio-conversion-unavailable');
  const context = new Context();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (!decoded.duration || decoded.duration > 15) throw new Error('audio-duration');
    const offline = new Offline(1, Math.ceil(decoded.duration * 16000), 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeAssessmentWav(rendered.getChannelData(0));
  } finally { await context.close(); }
}

async function assessChildSpeech(blob, expected, responseGroup=null) {
  const form = new FormData();
  const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', blob, `audio.${extension}`);
  form.append('expectedText', expected);
  // Preserve the British pronunciation used by this course.
  form.append('language', 'en-GB');
  form.append('phoneticAssessment', 'true');
  if(responseGroup)form.append('responseGroup',responseGroup);
  try { form.append('audioWav', await speechAsWav(blob), 'assessment.wav'); }
  catch { /* The server returns an honest content-only fallback if conversion is unavailable. */ }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), responseGroup?30000:24000);
  try {
    const response = await fetch(API_PRON, { method: 'POST', body: form, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error('speech-assessment-failed');
    // Old deployments can recognize words, but must not claim phonetic success.
    if (!data.feedback || !data.pronunciation) {
      data.feedback = { level: 'content-only', passed: false, title: 'Výslovnost se teď nepodařilo ověřit.', tip: 'Poslechni si vzor a zkus to ještě jednou.' };
    }
    return data;
  } finally { clearTimeout(timer); }
}

function phoneticProgressScore(data) {
  if (data.pronunciation?.status !== 'assessed') return 0;
  // Achievement bands for progress, never displayed as technical percentages.
  return data.feedback?.level === 'great' ? 90 : data.feedback?.level === 'good' ? 70 : 30;
}

function childPronunciationHtml(data, game = false) {
  const f = data.feedback;
  const face = f.level === 'great' ? '🌟' : f.level === 'good' || f.level === 'content-only' ? '🙂' : '👂';
  const style = game ? `voice-game-result ${f.passed ? 'goodvoice' : 'tryvoice'}` : `kid-feedback ${f.level === 'great' ? 'great' : f.level === 'good' ? 'good' : 'try'}`;
  return `<div class="${style}"><div class="${game ? '' : 'feedback-face'}">${face}</div><strong>${esc(f.title)}</strong><span>${esc(f.tip)}</span>${childPronunciationParts(data)}</div>`;
}

// British responses include phoneme scores but no names. Label only known,
// unambiguous reference sequences when their lengths match the response.
const childReferenceSounds = {
  dad: ['d', 'æ', 'd'], frog: ['f', 'r', 'ɒ', 'g'], red: ['r', 'ɛ', 'd'],
  rabbit: ['r', 'æ', 'b', 'ɪ', 't'], dog: ['d', 'ɒ', 'g'],
  three: ['θ', 'r', 'i'], think: ['θ', 'ɪ', 'ŋ', 'k'],
  this: ['ð', 'ɪ', 's'], water: ['w', 'ɔ', 't', 'ə'],
  my: ['m','aɪ'], is: ['ɪ','z'], blue: ['b','l','uː'], green: ['g','r','iː','n'], yellow: ['j','ɛ','l','əʊ'],
  orange: ['ɒ','r','ɪ','n','dʒ'], pink: ['p','ɪ','ŋ','k'], purple: ['p','ɜː','p','ə','l'],
  brown: ['b','r','aʊ','n'], black: ['b','l','æ','k'], white: ['w','aɪ','t'],
  cat: ['k','æ','t'], bird: ['b','ɜː','d'], fish: ['f','ɪ','ʃ'], horse: ['h','ɔː','s'], mouse: ['m','aʊ','s'],
  apple: ['æ','p','ə','l'], bread: ['b','r','ɛ','d'], milk: ['m','ɪ','l','k'], cheese: ['tʃ','iː','z'],
  banana: ['b','ə','n','ɑː','n','ə'], egg: ['ɛ','g'], cake: ['k','eɪ','k'],
  one: ['w','ʌ','n'], two: ['t','uː'], four: ['f','ɔː'], five: ['f','aɪ','v'], six: ['s','ɪ','k','s'],
  seven: ['s','ɛ','v','ə','n'], eight: ['eɪ','t'], nine: ['n','aɪ','n'], ten: ['t','ɛ','n'],
  head: ['h','ɛ','d'], eyes: ['aɪ','z'], ears: ['ɪə','z'], nose: ['n','əʊ','z'], mouth: ['m','aʊ','θ'],
  hands: ['h','æ','n','d','z'], knees: ['n','iː','z'], feet: ['f','iː','t'],
  mum: ['m','ʌ','m'], sister: ['s','ɪ','s','t','ə'], brother: ['b','r','ʌ','ð','ə'],
  grandma: ['g','r','æ','n','m','ɑː'], grandpa: ['g','r','æ','n','p','ɑː'], baby: ['b','eɪ','b','i'], family: ['f','æ','m','ə','l','i'],
  't-shirt': ['t','iː','ʃ','ɜː','t'], shoes: ['ʃ','uː','z'], socks: ['s','ɒ','k','s'], hat: ['h','æ','t'],
  coat: ['k','əʊ','t'], dress: ['d','r','ɛ','s'], trousers: ['t','r','aʊ','z','ə','z'], gloves: ['g','l','ʌ','v','z'],
  house: ['h','aʊ','s'], door: ['d','ɔː'], window: ['w','ɪ','n','d','əʊ'], kitchen: ['k','ɪ','tʃ','ə','n'],
  table: ['t','eɪ','b','ə','l'], chair: ['tʃ','eə'], bed: ['b','ɛ','d'], garden: ['g','ɑː','d','ə','n'],
  school: ['s','k','uː','l'], bag: ['b','æ','g'], pencil: ['p','ɛ','n','s','ə','l'], book: ['b','ʊ','k'],
  ruler: ['r','uː','l','ə'], desk: ['d','ɛ','s','k'], teacher: ['t','iː','tʃ','ə'], bell: ['b','ɛ','l'],
  sun: ['s','ʌ','n'], rain: ['r','eɪ','n'], snow: ['s','n','əʊ'], cloud: ['k','l','aʊ','d'],
  wind: ['w','ɪ','n','d'], rainbow: ['r','eɪ','n','b','əʊ'], thunder: ['θ','ʌ','n','d','ə'], fog: ['f','ɒ','g'],
  car: ['k','ɑː'], bus: ['b','ʌ','s'], train: ['t','r','eɪ','n'], bike: ['b','aɪ','k'],
  plane: ['p','l','eɪ','n'], boat: ['b','əʊ','t'], taxi: ['t','æ','k','s','i'], tram: ['t','r','æ','m'],
  happy: ['h','æ','p','i'], sad: ['s','æ','d'], angry: ['æ','ŋ','g','r','i'], scared: ['s','k','eə','d'],
  surprised: ['s','ə','p','r','aɪ','z','d'], tired: ['t','aɪə','d'], excited: ['ɪ','k','s','aɪ','t','ɪ','d'], bored: ['b','ɔː','d'],

};
function childSoundLabel(sound) {
  const labels = { 'ɹ': 'R', r: 'R', 'θ': 'TH', 'ð': 'TH', 'ʃ': 'SH', 'tʃ': 'CH', 'dʒ': 'J',
    'ɒ': 'krátké O', 'ɔ': 'O podle vzoru', 'ɔː': 'dlouhé O', 'ɑ': 'A podle vzoru', 'ɑː': 'dlouhé A', 'æ': 'otevřené A', 'ɛ': 'krátké E',
    'ɪ': 'krátké I', i: 'I podle vzoru', 'iː': 'dlouhé I', 'uː': 'dlouhé U', 'ʊ': 'krátké U',
    'ʌ': 'samohláska v mum', 'ɜː': 'samohláska v bird', 'ə': 'slabá samohláska',
    'eɪ': 'samohláska v cake', 'aɪ': 'samohláska v five', 'əʊ': 'samohláska v nose',
    'aʊ': 'samohláska v mouse', 'ɪə': 'samohláska v ears', 'eə': 'samohláska v chair', 'aɪə': 'samohláska v tired', 'ŋ': 'NG', 'ɡ': 'G' };
  return labels[sound] || (/^[a-z]$/.test(sound || '') ? sound.toUpperCase() : null);
}
function childSoundDescription(sound, position) {
  const descriptions = {
    r: 'Anglické R: jazyk nekmitá jako u českého R.', 'ɹ': 'Anglické R: jazyk nekmitá jako u českého R.',
    'θ': 'TH bez hlasu: špička jazyka lehce mezi zuby.', 'ð': 'TH s hlasem: špička jazyka mezi zuby, krk vibruje.',
    g: 'G s hlasem: krk jemně vibruje.', 'ɡ': 'G s hlasem: krk jemně vibruje.',
    k: 'K bez hlasu: krk nevibruje.', 'ŋ': 'Nosový zvuk jako na konci sing.',
    'ʃ': 'Zvuk SH jako na začátku shoes.', 'tʃ': 'Zvuk CH jako na začátku cheese.',
    'dʒ': 'Zvuk J jako na začátku juice.', 'uː': 'Dlouhá samohláska jako v blue: zaokrouhli rty.',
    'æ': 'Samohláska jako v cat: otevři ústa víc než u českého E.',
  };
  if (descriptions[sound]) return descriptions[sound];
  if (/^[a-z]$/.test(sound || '')) return `Hláska ${childSoundLabel(sound)}: vyslov zvuk, ne název písmene.`;
  if (childSoundLabel(sound)) return 'Samohláska: napodob její zvuk a délku v britském vzoru.';
  return `Hláska na ${position + 1}. místě ve výslovnosti. Její název se nepodařilo spolehlivě určit.`;
}
function childPartBand(score) {
  return score >= 80 ? { style: 'clear', text: '🌟 Povedlo se' }
    : score >= 65 ? { style: 'growing', text: '🙂 Už to jde' }
    : { style: 'practice', text: '👂 Zkus ještě' };
}
function childPronunciationParts(data) {
  const p = data.pronunciation;
  if (p?.status !== 'assessed') return '';
  const sentenceRecognition = (p.words || []).length > 1 && Number.isFinite(data.contentScore)
    ? `<div class="pronunciation-content"><b>Rozpoznání celé věty:</b> ${data.contentScore === 100 ? '✓ Věta souhlasí se vzorem.' : '👂 Rozpoznáním věty si nejsem jistá. Výsledky hlásek jsou uvedené zvlášť.'}</div>` : '';
  const rows = (p.words || []).map((word, index) => {
    const key = String(word.word || '').toLowerCase();
    const reference = childReferenceSounds[key];
    const phonemes = word.phonemes || [];
    const wordIssues = (p.issues || []).filter(i => String(i.word).toLowerCase() === key);
    const isSubstitution = i => ['voicing', 'th-substitution', 'vowel-substitution', 'phoneme-substitution'].includes(i?.type);
    const issueScores = wordIssues.filter(i => Number.isFinite(i.accuracyScore)).map(i => i.accuracyScore);
    const allClear = data.feedback?.passed && data.feedback?.needsPractice === false && wordIssues.length === 0 && phonemes.length > 0 && phonemes.every(s => Number.isFinite(s.accuracyScore) && s.accuracyScore >= 80);
    const band = childPartBand(allClear ? 80 : wordIssues.some(isSubstitution) ? 0 : Math.min(word.accuracyScore, ...phonemes.map(s => s.accuracyScore).filter(Number.isFinite), ...issueScores));
    const content = data.words?.[index];
    const recognition = content && String(content.word).toLowerCase() === key
      ? `<div class="pronunciation-content"><b>Řekl/a jsi správné slovo?</b> ${content.ok ? '✓ Správné slovo' : '👂 Rozpoznáním si nejsem jistá'}</div>` : '';
    const sounds = phonemes.map((phoneme, position) => {
      if (!Number.isFinite(phoneme.accuracyScore)) return '';
      const sound = phoneme.phoneme || (reference?.length === phonemes.length ? reference[position] : null);
      const label = childSoundLabel(sound) || `${position + 1}. hláska`;
      const normalizeSound = s => String(s || '').replace(/ɹ/g, 'r').replace(/ɡ/g, 'g');
      const issue = wordIssues.find(i => sound && normalizeSound(i.expected) === normalizeSound(sound));
      // Confirmed difficulty must not be hidden by a higher aggregate GB score.
      const score = issue && Number.isFinite(issue.accuracyScore) ? Math.min(phoneme.accuracyScore, issue.accuracyScore) : phoneme.accuracyScore;
      const result = childPartBand(isSubstitution(issue) ? 0 : score);
      return `<li class="pronunciation-sound ${result.style}"><b>${esc(label)}</b><small>${esc(childSoundDescription(sound, position))}</small><span>${result.text}</span></li>`;
    }).join('');
    return `<div class="pronunciation-word"><div class="pronunciation-word-title"><b>${esc(word.word)}</b><span class="${band.style}"><small>Výslovnost celého slova</small>${band.text}</span></div>${recognition}${sounds ? `<div class="pronunciation-sounds-heading">Jak zněly jednotlivé hlásky?</div><ul class="pronunciation-sounds" aria-label="Zvuky ve slově ${esc(word.word)}">${sounds}</ul>` : ''}</div>`;
  }).join('');
  return rows ? `<div class="pronunciation-parts"><b>${data.feedback?.needsPractice === false ? 'Co se povedlo' : 'Co se povedlo a co ještě zkusit'}</b><p class="pronunciation-guide">Porovnávám s britským vzorem. Kartičky ukazují hlásky, ne písmena. Jedna hláska může být napsaná více písmeny, třeba TH.</p>${sentenceRecognition}${rows}</div>` : '';
}

if (typeof module !== 'undefined') module.exports = { encodeAssessmentWav, phoneticProgressScore };
