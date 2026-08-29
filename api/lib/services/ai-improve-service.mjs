/**
 * api/lib/services/ai-improve-service.mjs
 *
 * Application/business logic for "AI improvement suggestions" — building the
 * editorial prompt, calling Groq, and parsing its response into a validated
 * suggestions array.
 *
 * server.mjs (the HTTP/controller layer) only ever calls `generateSuggestions()`
 * below; it never imports the Groq SDK directly. That's the dependency
 * inversion this module exists for: swapping the LLM provider, or unit-testing
 * the prompt/parsing logic with a fake client, doesn't require touching routes.
 *
 * Thrown errors carry a `.code` so the HTTP layer can map them to a status
 * without knowing anything about Groq: AI_PARSE_ERROR (422) or AI_ERROR (500).
 *
 * @module
 */

import Groq from 'groq-sdk';

export const GROQ_MODEL = 'qwen/qwen3.6-27b';

/**
 * Extract plain URLs from raw content (href= attributes + bare https?:// links).
 * Returns at most 3 to avoid prompt bloat.
 * @param {string} contentHtml
 * @returns {string[]}
 */
export function extractUrls(contentHtml) {
  const found = new Set();
  for (const m of contentHtml.matchAll(/href=['"]?(https?:\/\/[^\s'"<>]+)/gi)) found.add(m[1]);
  for (const m of contentHtml.matchAll(/(?<!['"=])(https?:\/\/[^\s<>"']+)/g)) found.add(m[1]);
  return [...found].slice(0, 3);
}

/**
 * Fetch plain text from a URL (best-effort, 5s timeout, max 3000 chars).
 * Returns null on any error — never throws. Used to give the model context
 * on external sources an article links to.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export async function fetchUrlText(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KilomboBot/1.0)' },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('html') && !ct.includes('text')) return null;
    const html = await resp.text();
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000);
  } catch {
    return null;
  }
}

/**
 * Build the system prompt for article improvement, optionally including
 * fetched external-link content.
 * @param {string} contentHtml
 * @param {Array<{url: string, text: string|null}>} [urlPreviews]
 * @returns {string}
 */
export function buildImprovePrompt(contentHtml, urlPreviews = []) {
  const articleText = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);

  const urlSection =
    urlPreviews.length > 0
      ? '\n\nCONTENIDO DE ENLACES EXTERNOS (extraído automáticamente):\n' +
        urlPreviews
          .map(({ url, text }) =>
            text
              ? `URL: ${url}\nContenido: ${text}`
              : `URL: ${url}\nContenido: [no disponible — URL inaccesible o sin texto]`
          )
          .join('\n\n')
      : '';

  const summaryRule = urlPreviews.some(({ text }) => text)
    ? '\n6. Si hay contenido de enlaces externos disponible, UNA de las sugerencias debe ser de kind="add" con un resumen en español del artículo enlazado, para enriquecer el contexto del borrador.'
    : '';

  return `Eres un editor de textos políticos para un portal de izquierda internacionalista en español/francés.
Tu tarea es revisar el siguiente artículo en HTML y devolver una lista de sugerencias de mejora concretas.

REGLAS ESTRICTAS:
1. Responde SOLO con un array JSON válido, sin texto extra antes ni después.
2. Cada sugerencia tiene exactamente esta forma:
   { "id": "sug-N", "kind": "rewrite"|"add"|"remove"|"metadata", "selector": "descripción del párrafo o campo", "original": "texto original (vacío si kind=add)", "proposed": "texto propuesto", "rationale": "por qué" }
3. Máximo 5 sugerencias. Prioriza: claridad, precisión política, fluidez.
4. No alteres el HTML — trabaja sobre el texto visible solamente.
5. PROHIBIDO INVENTAR HECHOS. No atribuyas identidades, profesiones, nacionalidades, cargos, motivaciones o interpretaciones a personas mencionadas si no están explícitas en el texto. Nunca redactes una cita o paráfrasis que suene a hecho verificado si no lo es.
6. Si el artículo es demasiado breve o carece de contexto para "mejorarlo" sin inventar información, NO generes una sugerencia "add" que rellene ese vacío con contenido inventado. En su lugar, usa "metadata" para señalar al editor humano qué información falta y debe verificar por su cuenta (ej: "Falta verificar quién es la persona citada y el contexto de la publicación").
7. Cuando sugieras "remove", el campo "proposed" debe ser exactamente la cadena vacía "" — nunca una explicación en prosa dentro de ese campo (usa "rationale" para eso).
8. Ante la duda entre inventar contenido o dejar el artículo sin cambios en ese punto, elige NO sugerir nada.${summaryRule}

ARTÍCULO:
${articleText}${urlSection}`;
}

/**
 * Strip a <think>...</think> reasoning block some models (e.g. Qwen3) emit
 * before the actual answer. If the whole response is an unclosed <think>
 * block, treat it as empty rather than returning the reasoning text.
 * @param {string} raw
 * @returns {string}
 */
function stripThinkBlock(raw) {
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (stripped.length === 0 && raw.includes('<think>') && !raw.includes('</think>')) {
    return '';
  }
  return stripped;
}

/**
 * Call Groq for editorial suggestions on a draft's HTML content.
 *
 * @param {object} params
 * @param {string} params.contentHtml
 * @param {string} params.apiKey - GROQ_API_KEY
 * @returns {Promise<{ suggestions: object[], model: string }>}
 * @throws {Error & { code: 'AI_PARSE_ERROR', raw: string }} when Groq's
 *   response isn't parseable JSON
 * @throws {Error & { code: 'AI_ERROR' }} when the Groq API call itself fails
 */
export async function generateSuggestions({ contentHtml, apiKey }) {
  const urls = extractUrls(contentHtml || '');
  const urlPreviews = await Promise.all(urls.map(async (url) => ({ url, text: await fetchUrlText(url) })));

  let completion;
  try {
    const groq = new Groq({ apiKey });
    completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: buildImprovePrompt(contentHtml || '', urlPreviews) }],
      temperature: 0.4,
      max_tokens: 1500,
      reasoning_effort: 'none', // disable <think> block on Qwen3 models
    });
  } catch (err) {
    const wrapped = new Error('Groq API call failed');
    wrapped.code = 'AI_ERROR';
    wrapped.cause = err;
    wrapped.internal = err.message;
    throw wrapped;
  }

  const raw = completion.choices?.[0]?.message?.content ?? '';
  const stripped = stripThinkBlock(raw);

  const match = stripped.match(/\[[\s\S]*\]/);
  if (!match) {
    const err = new Error('AI returned unparseable response');
    err.code = 'AI_PARSE_ERROR';
    err.raw = stripped.slice(0, 500);
    throw err;
  }

  let suggestions;
  try {
    suggestions = JSON.parse(match[0]);
  } catch {
    const err = new Error('AI response was not valid JSON');
    err.code = 'AI_PARSE_ERROR';
    err.raw = stripped.slice(0, 500);
    throw err;
  }

  return { suggestions, model: GROQ_MODEL };
}
