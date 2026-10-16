import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, username, method, event_type, details } = await req.json();

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      return new Response(JSON.stringify({ error: "Missing Telegram credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toLocaleString("es-MX", { 
      timeZone: "America/Mexico_City",
      dateStyle: "medium",
      timeStyle: "short"
    });

    let headerTitle = "🎉 <b>¡Nuevo Registro en la App!</b>";
    let extraLine = "";

    if (event_type === "START_TRIAL" || (method && method.toLowerCase().includes("7 d"))) {
      headerTitle = "💎 <b>¡Clic en Probar 7 Días Gratis!</b>";
      if (details) {
        extraLine = `\n📦 <b>Plan:</b> ${details}\n🎁 <b>Bono:</b> 30 Pro Coins de Bienvenida`;
      }
    } else if (event_type === "VIEW_PLANS" || (method && method.toLowerCase().includes("mi plan"))) {
      headerTitle = "👀 <b>Usuario viendo la página \"Mi Plan\"</b>";
      if (details) {
        extraLine = `\n📊 <b>Estado actual:</b> ${details}`;
      }
    } else if (details) {
      extraLine = `\nℹ️ <b>Detalle:</b> ${details}`;
    }

    const message = `
${headerTitle}
━━━━━━━━━━━━━━━━━━━━
👤 <b>Usuario:</b> ${username || "Guerrero"}
📧 <b>Correo:</b> <code>${email || "Sin correo"}</code>
🎯 <b>Acción:</b> ${method || "Evento"}${extraLine}
🕒 <b>Hora:</b> ${now}
━━━━━━━━━━━━━━━━━━━━
🚀 <i>Procrastina Como Un Pro</i>
    `.trim();

    // Enviar a la API de Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
