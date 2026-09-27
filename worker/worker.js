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

    const system = (body.system || "").toString().slice(0, 4000);
    const message = (body.message || "").toString().slice(0, 12000);
    const tools = Array.isArray(body.tools) ? body.tools : null;
    if (!message) {
      return json({ error: "message fehlt" }, 400, corsHeaders);
    }

    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: "Server nicht konfiguriert (kein GEMINI_API_KEY Secret gesetzt)" }, 500, corsHeaders);
    }

    const payload = {
      contents: [{ role: "user", parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.6, maxOutputTokens: 700 }
    };
    if (tools && tools.length) {
      payload.tools = [{
        functionDeclarations: tools.map(function (t) {
          return { name: t.name, description: t.description, parameters: t.parameters };
        })
      }];
    }

    // Gratis-Kontingent von Gemini ist oft kurz überlastet (503 "high demand") oder
    // stößt an Rate-Limits (429). Statt sofort aufzugeben, probieren wir bis zu
    // zwei zusätzliche Modelle als Fallback und wiederholen jede Anfrage einmal
    // kurz nach kleiner Pause, bevor wir wirklich aufgeben.
    const models = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-flash-latest"];
    let resp = null, data = null, lastErr = "Unbekannter Fehler";

    outer:
    for (const model of models) {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await new Promise(function(r){ setTimeout(r, 600); });
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          lastErr = "Gemini nicht erreichbar";
          continue;
        }
        data = await resp.json().catch(function(){ return null; });
        if (resp.ok) break outer;
        lastErr = (data && data.error && data.error.message) || ("HTTP " + resp.status);
        // 429 (Rate-Limit) und 503 (überlastet) sind die Fälle, für die sich ein
        // erneuter Versuch lohnt; alles andere (z.B. 400 falsche Anfrage) sofort
        // beim nächsten Modell probieren statt sinnlos zu wiederholen.
        if (resp.status !== 429 && resp.status !== 503) break;
      }
      if (resp && resp.ok) break;
    }

    if (!resp || !resp.ok) {
      return json({ error: lastErr }, 502, corsHeaders);
    }

    const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
    if (parts) {
      const callPart = parts.filter(function(p){ return p.functionCall; })[0];
      if (callPart) {
        return json({ functionCall: { name: callPart.functionCall.name, args: callPart.functionCall.args || {} } }, 200, corsHeaders);
      }
    }
    const text = parts ? parts.map(function(p){ return p.text || ""; }).join("") : "";
    return json({ text: text || "…" }, 200, corsHeaders);
  }
};

function json(obj, status, corsHeaders) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: Object.assign({ "Content-Type": "application/json" }, corsHeaders)
  });
}
