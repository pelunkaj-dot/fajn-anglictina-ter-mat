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
  return `<div class="${style}"><div class="${game ? '' : 'feedback-face'}">${face}</div><strong>${esc(f.title)}</strong><span>${esc(f.tip)}</span></div>`;
}

if (typeof module !== 'undefined') module.exports = { encodeAssessmentWav, phoneticProgressScore };
