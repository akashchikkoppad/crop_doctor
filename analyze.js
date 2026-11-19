// Netlify Function (free Gemini version). File name must stay analyze.js so the URL is /.netlify/functions/analyze
// In Netlify > Site configuration > Environment variables add: GEMINI_API_KEY = your key
// Optional: GEMINI_MODEL (default below). If you get a "model not found" error, set it to a current Flash model name from aistudio.google.com.
const PROMPT = `You are an expert Indian agronomist and plant pathologist. The user sends one photo of a crop or vegetable plant (leaf, fruit or stem).
Identify the crop yourself (any vegetable, cereal, millet, pulse, oilseed, fruit, spice, plantation or cash crop grown in India) and any disease, pest or nutrient deficiency.
Reply with ONLY a JSON object with exactly these keys:
is_plant (bool), healthy (bool), confidence (0-100 integer), severity ("None"|"Moderate"|"Severe"),
crop_en, crop_kn, disease_en, disease_kn ("Healthy"/"ಆರೋಗ್ಯಕರ" if healthy),
cause_en, cause_kn, symptoms_en, symptoms_kn, treatment_en, treatment_kn, note_en, note_kn (only if is_plant is false).
Write the _kn fields in natural, simple Kannada script that a farmer in Karnataka understands, using the common local crop names (e.g. ಕಡಲೆ, ಹೆಸರು ಕಾಳು, ಹತ್ತಿ). Keep pesticide/chemical names in English in brackets.
Treatment must be practical (organic and chemical options, dosage per litre, spray interval) and end by advising to confirm with the local Raita Samparka Kendra (ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ). If the photo is unclear, lower the confidence.`;

const json = (statusCode, obj) => ({ statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(obj) });
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return json(500, { error: 'Server is not configured' });
  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Invalid request' }); }
  const { image } = payload;
  const mediaType = ALLOWED_TYPES.includes(payload.mediaType) ? payload.mediaType : 'image/jpeg';
  if (!image || typeof image !== 'string') return json(400, { error: 'No image' });

  const main = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  // Gemini's free tier is sometimes busy (UNAVAILABLE), so try the main model, then a lighter one, then the main one again.
  const models = [main, 'gemini-flash-lite-latest', main];
  // Netlify stops a function after about 10 s, so keep the total under that and return a clean error instead of a platform timeout.
  const BUDGET_MS = Number(process.env.BUDGET_MS) || 9000;
  const started = Date.now();
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: PROMPT }] },
    contents: [{ parts: [
      { inline_data: { mime_type: mediaType, data: image } },
      { text: 'Analyze this plant photo.' } ] }],
    generationConfig: { responseMimeType: 'application/json' }
  });
  let lastError = 'No attempt made';
  for (let i = 0; i < models.length; i++) {
    const remaining = BUDGET_MS - (Date.now() - started);
    if (remaining < 1500) break;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body, signal: AbortSignal.timeout(Math.min(7000, remaining))
      });
      const d = await r.json();
      if (!r.ok) { lastError = JSON.stringify(d); continue; }
      const parts = (d.candidates && d.candidates[0] && d.candidates[0].content.parts) || [];
      const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
      const result = JSON.parse(text); // make sure it is valid JSON before sending it on
      if (!result || typeof result !== 'object') throw new Error('Reply was not a JSON object');
      return json(200, result);
    } catch (e) { lastError = String(e.message || e); }
  }
  console.error('Gemini failed:', lastError); // details stay in the Netlify logs, not in the browser
  return json(502, { error: 'The analysis service is busy. Please try again.' });
};
