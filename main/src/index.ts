type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE: string;
  API_TOKEN_IPAD1: string;
  API_TOKEN_IPAD2: string;

};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};


function normState(s: any): "charging" | "full" | "not_charging" {
  const t = (s ?? "").toString().trim().toLowerCase();
  if (["charging","có","yes","true","1","plugged","ac"].includes(t)) return "charging";
  if (["full","charged","đầy","100%"].includes(t)) return "full";
  return "not_charging";
}

async function upsert(env: Env, row: any) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/battery`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    const { pathname } = new URL(req.url);

    if ((req.method === "GET" || req.method === "HEAD") && pathname === "/")
      return new Response("ok", { headers: CORS });

    if (req.method === "POST" && pathname === "/battery") {
      const auth = req.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      const allow = [
        env.API_TOKEN_IPAD1,
        env.API_TOKEN_IPAD2,
      ].filter(Boolean).includes(token);
      if (!allow) return new Response("unauthorized", { status: 401, headers: CORS });

      const body = await req.json();
      const device = String(body.device || "unknown");
      const level = Number(body.level ?? 0);
      const state = normState(body.state);
  
      const tsISO = body.ts ? new Date(body.ts).toISOString() : new Date().toISOString();

      await upsert(env, { device, level, state, ts: tsISO });
      return new Response("ok", { headers: CORS });
    }

    return new Response("not found", { status: 404, headers: CORS });
  },
};