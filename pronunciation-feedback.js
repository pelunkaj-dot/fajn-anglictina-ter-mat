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

async function assessChildSpeech(blob, expected) {
  const form = new FormData();
  const extension = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  form.append('audio', blob, `audio.${extension}`);
  form.append('expectedText', expected);
  // Preserve the British pronunciation used by this course.
  form.append('language', 'en-GB');
  form.append('phoneticAssessment', 'true');
  try { form.append('audioWav', await speechAsWav(blob), 'assessment.wav'); }
  catch { /* The server returns an honest content-only fallback if conversion is unavailable. */ }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24000);
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
  frog: ['f', 'r', 'ɒ', 'g'], red: ['r', 'ɛ', 'd'],
  rabbit: ['r', 'æ', 'b', 'ɪ', 't'], dog: ['d', 'ɒ', 'g'],
  three: ['θ', 'r', 'i'], think: ['θ', 'ɪ', 'ŋ', 'k'],
  this: ['ð', 'ɪ', 's'], water: ['w', 'ɔ', 't', 'ə'],
};
function childSoundLabel(sound) {
  const labels = { 'ɹ': 'R', r: 'R', 'θ': 'TH', 'ð': 'TH',
    'ɒ': 'O', 'ɔ': 'O', 'ɑ': 'A', 'æ': 'A', 'ɛ': 'E',
    'ɪ': 'I', i: 'Í', 'iː': 'Í', 'ə': 'krátký koncový zvuk', 'ŋ': 'NG', 'ɡ': 'G' };
  return labels[sound] || (/^[a-z]$/.test(sound || '') ? sound.toUpperCase() : null);
}
function childPartBand(score) {
  return score >= 80 ? { style: 'clear', text: '🌟 Povedlo se' }
    : score >= 65 ? { style: 'growing', text: '🙂 Už to jde' }
    : { style: 'practice', text: '👂 Zkus ještě' };
}
function childPronunciationParts(data) {
  const p = data.pronunciation;
  if (p?.status !== 'assessed') return '';
  const rows = (p.words || []).map((word, index) => {
    const key = String(word.word || '').toLowerCase();
    const reference = childReferenceSounds[key];
    const phonemes = word.phonemes || [];
    const issueScores = (p.issues || []).filter(i => String(i.word).toLowerCase() === key && Number.isFinite(i.accuracyScore)).map(i => i.accuracyScore);
    const band = childPartBand(Math.min(word.accuracyScore, ...phonemes.map(s => s.accuracyScore).filter(Number.isFinite), ...issueScores));
    const content = data.words?.[index];
    const recognition = content && String(content.word).toLowerCase() === key
      ? `<div class="pronunciation-content">${content.ok ? '✓ Správné slovo' : '👂 Zkus vyslovit toto slovo'}</div>` : '';
    const sounds = phonemes.map((phoneme, position) => {
      if (!Number.isFinite(phoneme.accuracyScore)) return '';
      const sound = phoneme.phoneme || (reference?.length === phonemes.length ? reference[position] : null);
      const label = childSoundLabel(sound) || `${position + 1}. zvuk`;
      const normalizeSound = s => String(s || '').replace(/ɹ/g, 'r').replace(/ɡ/g, 'g');
      const issue = (p.issues || []).find(i => String(i.word).toLowerCase() === key && sound && normalizeSound(i.expected) === normalizeSound(sound));
      // Confirmed difficulty must not be hidden by a higher aggregate GB score.
      const score = issue && Number.isFinite(issue.accuracyScore) ? Math.min(phoneme.accuracyScore, issue.accuracyScore) : phoneme.accuracyScore;
      const result = childPartBand(score);
      return `<li class="pronunciation-sound ${result.style}"><b>${esc(label)}</b><span>${result.text}</span></li>`;
    }).join('');
    return `<div class="pronunciation-word"><div class="pronunciation-word-title"><b>${esc(word.word)}</b><span class="${band.style}">${band.text}</span></div>${recognition}${sounds ? `<ul class="pronunciation-sounds" aria-label="Zvuky ve slově ${esc(word.word)}">${sounds}</ul>` : ''}</div>`;
  }).join('');
  return rows ? `<div class="pronunciation-parts"><b>Co se povedlo a co ještě zkusit</b>${rows}</div>` : '';
}

if (typeof module !== 'undefined') module.exports = { encodeAssessmentWav, phoneticProgressScore };
