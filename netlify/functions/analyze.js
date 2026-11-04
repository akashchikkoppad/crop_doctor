// Netlify Function (free Gemini version).
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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'POST only' };
  const { image, mediaType } = JSON.parse(event.body || '{}');
  if (!image) return { statusCode: 400, body: 'No image' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ parts: [
        { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
        { text: 'Analyze this plant photo.' } ] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });
  const d = await r.json();
  if (!r.ok) return { statusCode: 502, body: JSON.stringify(d) };
  const parts = (d.candidates && d.candidates[0] && d.candidates[0].content.parts) || [];
  const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').replace(/```json|```/g, '').trim();
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: text };
};
