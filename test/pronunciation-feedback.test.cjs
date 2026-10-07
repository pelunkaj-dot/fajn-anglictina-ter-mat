const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { encodeAssessmentWav, phoneticProgressScore } = require('../pronunciation-feedback');

test('WAV is mono PCM16 at 16 kHz, with valid lengths and clipped samples', async () => {
  const b = Buffer.from(await encodeAssessmentWav(new Float32Array([-2, -1, 0, 1, 2])).arrayBuffer());
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.length, 54); assert.equal(b.readUInt32LE(4), 46);
  assert.equal(b.readUInt16LE(20), 1); assert.equal(b.readUInt16LE(22), 1); assert.equal(b.readUInt32LE(24), 16000);
  assert.equal(b.readUInt16LE(34), 16); assert.equal(b.readUInt32LE(40), 10);
  assert.deepEqual([44, 46, 48, 50, 52].map(i => b.readInt16LE(i)), [-32768, -32768, 0, 32767, 32767]);
});

test('Legacy recognition 100 and unavailable phonetics cannot unlock phonetic achievements', () => {
  assert.equal(phoneticProgressScore({ score: 100 }), 0);
  assert.equal(phoneticProgressScore({ score: 100, pronunciation: { status: 'unavailable' }, feedback: { level: 'content-only' } }), 0);
  assert.equal(phoneticProgressScore({ pronunciation: { status: 'assessed' }, feedback: { level: 'retry' } }), 30);
});

function helper(fetch) {
  const sandbox = { Blob, FormData, AbortController, setTimeout, clearTimeout, window: {}, API_PRON: 'https://test.invalid', fetch,
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])) };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(require.resolve('../pronunciation-feedback.js'), 'utf8'), sandbox);
  return sandbox;
}

test('Legacy deployment is displayed as unavailable phonetic assessment', async () => {
  const h = helper(async (_url, options) => {
    assert.equal(options.body.get('language'), 'en-GB'); assert.equal(options.body.get('phoneticAssessment'), 'true');
    assert.equal(options.body.get('audio').type, 'audio/mp4');
    return Response.json({ score: 100, transcript: 'frog' });
  });
  const result = await h.assessChildSpeech(new Blob([new Uint8Array(500)], { type: 'audio/mp4' }), 'frog');
  assert.equal(result.feedback.passed, false); assert.equal(result.feedback.level, 'content-only');
});

test('Child feedback contains advice and escapes returned text; never exposes scores', () => {
  const h = helper();
  const html = h.childPronunciationHtml({ score: 94, pronunciationScore: 94,
    feedback: { level: 'retry', passed: false, title: 'Poslechni si vzor znovu.', tip: '<img src=x onerror=alert(1)> Anglické R.' } });
  assert.match(html, /Anglické R/); assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /94|%|<img/);
});

test('All active speaking paths use the shared assessment and feedback', () => {
  for (const file of ['young-learners.js', 'final-polish.js', 'story-roleplay.js', 'game-voice.js']) {
    const s = fs.readFileSync(require.resolve(`../${file}`), 'utf8');
    assert.match(s, /assessChildSpeech\(blob,/); assert.match(s, /childPronunciationHtml\(data/);
    assert.doesNotMatch(s, /Number\(data.score\)/);
  }
});

test('Mixed frog result shows each sound and three progress bands without percentages', () => {
  const h = helper();
  const html = h.childPronunciationHtml({words:[{word:'frog',ok:true}], pronunciation:{status:'assessed',words:[{word:'frog',accuracyScore:82,phonemes:[100,72,93,91].map(accuracyScore=>({accuracyScore}))}],issues:[{word:'frog',expected:'g',accuracyScore:54}]},feedback:{level:'retry',passed:false,title:'Poslechni si vzor znovu.',tip:'Zkus G s hlasem.'}});
  assert.match(html, /✓ Správné slovo/);
  assert.match(html, /<b>F<\/b><span>🌟 Povedlo se/);
  assert.match(html, /<b>R<\/b><span>🙂 Už to jde/);
  assert.match(html, /<b>G<\/b><span>👂 Zkus ještě/);
  assert.doesNotMatch(html, /82|100|72|93|91|54|%/);
});
test('Unknown or differently sized phoneme sequences are not assigned guessed letters', () => {
  const h = helper();
  const html = h.childPronunciationParts({pronunciation:{status:'assessed',words:[{word:'frog',accuracyScore:70,phonemes:[{accuracyScore:60}]}]}});
  assert.match(html, /1\. zvuk/); assert.doesNotMatch(html, /<b>F<\/b>/);
  assert.equal(h.childPronunciationParts({pronunciation:{status:'unavailable',words:[{word:'frog',accuracyScore:100}]}}), '');
});
test('Confirmed TH substitution stays a correction even at the middle score threshold', () => {
  const h=helper();
  const html=h.childPronunciationParts({pronunciation:{status:'assessed',words:[{word:'this',accuracyScore:85,phonemes:[85,90,95].map(accuracyScore=>({accuracyScore}))}],issues:[{type:'th-substitution',word:'this',expected:'ð',accuracyScore:65}]}});
  assert.match(html, /<b>TH<\/b><span>👂 Zkus ještě/);
});
