export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, corsHeaders);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid JSON" }, 400, corsHeaders);
    }

    const system = String(body.system || "").slice(0, 12000);
    const message = String(body.message || "").slice(0, 12000);
    const userText = String(body.userText || "").slice(0, 4000);
    const context = String(body.context || "").slice(0, 6000);
    const v2 = body.v === 2;
    const toolFollowup = body.toolFollowup && typeof body.toolFollowup === "object" ? body.toolFollowup : null;
    const tools = Array.isArray(body.tools) ? body.tools.slice(0, 8) : null;

    if (!message && !userText && !toolFollowup) {
      return json({ error: "message fehlt" }, 400, corsHeaders);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: "Server nicht konfiguriert (kein GEMINI_API_KEY Secret gesetzt)" }, 500, corsHeaders);
    }

    // Persönlichkeit kommt unverändert aus der App (System-Prompt). Hier nur
    // die aktuellen Zahlen anhängen, damit er sie nicht rät.
    let systemText = system;
    if (v2 && context) {
      systemText += "\n\nAKTUELLE APP-DATEN (verbindlich, nichts davon erfinden oder widersprechen):\n" + context;
    }

    const contents = buildContents(body, v2, message, userText, toolFollowup);
    const toolDecls = toolFollowup ? null : normalizeTools(tools);

    const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
    let lastErr = "Unbekannter Fehler";
    let data = null;

    for (const model of models) {
      let result = await generate(model, contents, systemText, toolDecls, apiKey);
      // Retry the complete generation once; no tools from a partial answer
      // have been sent to the client or executed at this point.
      if (result.ok && readModelParts(result.data).finishReason === "MAX_TOKENS") {
        const retry = await generate(model, contents, systemText, toolDecls, apiKey, 8192);
        if (retry.ok) result = retry;
      }
      if (result.ok) {
        data = result.data;
        break;
      }
      lastErr = result.error || lastErr;
      // 400 ist ein kaputter Request, kein Aussetzer — nächstes Modell bringt da nichts,
      // außer der Fehler kam vom Modell selbst (unbekanntes Modell = 404).
      if (result.status === 400) break;
    }

    if (!data) {
      return json({ error: lastErr }, 502, corsHeaders);
    }

    const parsed = readModelParts(data);
    if (parsed.finishReason === "MAX_TOKENS") {
      return json({
        v: 2,
        text: (parsed.text ? parsed.text + "\n\n" : "") + "Die Antwort wurde wegen des Ausgabelimits abgebrochen. Bitte grenze deine Frage ein oder bitte mich, fortzufahren.",
        truncated: true,
        finishReason: parsed.finishReason
      }, 200, corsHeaders);
    }
    if (parsed.calls.length) {
      return json({
        v: 2,
        functionCall: parsed.calls[0],
        functionCalls: parsed.calls,
        text: parsed.text || ""
      }, 200, corsHeaders);
    }
    return json({ v: 2, text: parsed.text || "…" }, 200, corsHeaders);
  }
};

function buildContents(body, v2, message, userText, toolFollowup) {
  const contents = [];
  if (v2 && Array.isArray(body.history)) {
    const turns = body.history.slice(-8);
    for (const turn of turns) {
      const role = turn && (turn.role === "model" || turn.role === "assistant") ? "model" : "user";
      const text = String((turn && turn.text) || "").slice(0, 700).trim();
      if (!text) continue;
      const last = contents[contents.length - 1];
      if (last && last.role === role) last.parts[0].text += "\n" + text;
      else contents.push({ role: role, parts: [{ text: text }] });
    }
  }

  const latest = (v2 ? (userText || message) : message).trim();
  if (latest) {
    const last = contents[contents.length - 1];
    if (last && last.role === "user") last.parts[0].text += "\n" + latest;
    else contents.push({ role: "user", parts: [{ text: latest.slice(0, 12000) }] });
  }

  const followUps = [];
  if (toolFollowup) {
    if (Array.isArray(toolFollowup.calls)) {
      for (const item of toolFollowup.calls) followUps.push(item);
    } else if (toolFollowup.call) {
      followUps.push({ call: toolFollowup.call, response: toolFollowup.response });
    }
  }
  if (followUps.length) {
    const callParts = [];
    const responseParts = [];
    followUps.forEach(function (item, i) {
      const call = item && item.call;
      if (!call || !call.name) return;
      const id = String(call.id || ("call-" + (i + 1))).slice(0, 80);
      callParts.push({ functionCall: { name: String(call.name), args: call.args || {}, id: id } });
      const response = item.response && typeof item.response === "object"
        ? item.response
        : { result: String(item && item.response || "") };
      responseParts.push({ functionResponse: { name: String(call.name), id: id, response: response } });
    });
    if (callParts.length) {
      contents.push({ role: "model", parts: callParts });
      responseParts.push({
        text: "Die Werkzeuge sind ausgeführt. Sag dem Nutzer das Ergebnis in deinem bisherigen Ton aus der Systemanweisung. Persönlichkeit nicht ändern, Fakten aus dem Ergebnis nicht umdeuten."
      });
      contents.push({ role: "user", parts: responseParts });
    }
  }

  if (!contents.length) contents.push({ role: "user", parts: [{ text: "…" }] });
  if (contents[0].role === "model") contents.unshift({ role: "user", parts: [{ text: "Weiter im Gespräch." }] });
  return contents;
}

function normalizeTools(tools) {
  if (!tools || !tools.length) return null;
  return tools.map(function (t) {
    if (!t || !t.name) return null;
    return {
      name: String(t.name).slice(0, 64),
      description: String(t.description || "").slice(0, 500),
      parameters: normalizeSchema(t.parameters) || { type: "object", properties: {} }
    };
  }).filter(Boolean);
}

function normalizeSchema(schema) {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(normalizeSchema);
  const typeMap = {
    OBJECT: "object", STRING: "string", NUMBER: "number",
    INTEGER: "integer", BOOLEAN: "boolean", ARRAY: "array"
  };
  const out = {};
  for (const key of Object.keys(schema)) {
    const value = schema[key];
    if (key === "type" && typeof value === "string") out[key] = typeMap[value] || value.toLowerCase();
    else out[key] = normalizeSchema(value);
  }
  return out;
}

async function generate(model, contents, systemText, toolDecls, apiKey, maxOutputTokens = 4096) {
  const modern = model.indexOf("gemini-3") === 0;
  const modes = modern ? ["low", "plain"] : ["budget", "plain"];
  let last = { ok: false, status: 0, error: "Unbekannter Fehler" };

  for (const mode of modes) {
    const payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemText }] }
    };
    if (toolDecls) payload.tools = [{ functionDeclarations: toolDecls }];
    if (mode === "low") {
      payload.generationConfig = { maxOutputTokens: maxOutputTokens, thinkingConfig: { thinkingLevel: "low" } };
    } else if (mode === "budget") {
      payload.generationConfig = { maxOutputTokens: maxOutputTokens, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } };
    } else {
      payload.generationConfig = { maxOutputTokens: maxOutputTokens };
    }

    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
    let resp;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000)
      });
    } catch (e) {
      return { ok: false, status: 0, error: "Gemini nicht erreichbar" };
    }
    const data = await resp.json().catch(function () { return null; });
    if (resp.ok && data) return { ok: true, data: data };

    const errMsg = (data && data.error && data.error.message) || ("HTTP " + resp.status);
    last = { ok: false, status: resp.status, error: errMsg };
    const malformed = /malformed.?function/i.test(errMsg);
    if (malformed && payload.tools) {
      delete payload.tools;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
      } catch (e) {
        return { ok: false, status: 0, error: "Gemini nicht erreichbar" };
      }
      const retryData = await resp.json().catch(function () { return null; });
      if (resp.ok && retryData) return { ok: true, data: retryData };
      last = { ok: false, status: resp.status, error: (retryData && retryData.error && retryData.error.message) || ("HTTP " + resp.status) };
    }
    if (resp.status !== 400) break;
  }
  return last;
}

function readModelParts(data) {
  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  const calls = [];
  let text = "";
  if (parts) {
    for (const part of parts) {
      if (!part || part.thought) continue;
      if (part.text) text += part.text;
      if (part.functionCall && part.functionCall.name) {
        calls.push({
          name: part.functionCall.name,
          args: part.functionCall.args || {},
          id: part.functionCall.id || ("call-" + (calls.length + 1))
        });
      }
    }
  }
  const candidate = data && data.candidates && data.candidates[0];
  return { text: text.trim(), calls: calls, finishReason: candidate && candidate.finishReason || null };
}

function json(obj, status, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders)
  });
}
