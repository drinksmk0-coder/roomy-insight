// ============================================================================
// SUPABASE EDGE FUNCTION: send-whatsapp
// ============================================================================
// Deploy: supabase functions deploy send-whatsapp
// Endpoint: https://seu-projeto.supabase.co/functions/v1/send-whatsapp
// Usa: Twilio WhatsApp API
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface WhatsAppPayload {
  to: string; // +5511999999999
  body: string;
  mediaUrl?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    const payload: WhatsAppPayload = await req.json();

    // Validar
    if (!payload.to || !payload.body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Recuperar credenciais Twilio
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "whatsapp:+1234567890";

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp service not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Formatar número (garantir prefixo +55 para Brasil)
    let toNumber = payload.to.trim();
    if (!toNumber.startsWith("+")) {
      toNumber = "+55" + toNumber.replace(/\D/g, "");
    }
    const toWhatsApp = `whatsapp:${toNumber}`;

    // Montar request para Twilio
    const formData = new URLSearchParams();
    formData.append("To", toWhatsApp);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", payload.body);

    if (payload.mediaUrl) {
      formData.append("MediaUrl", payload.mediaUrl);
    }

    // Chamar API Twilio
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Twilio error:", responseData);
      return new Response(
        JSON.stringify({
          error: responseData.message || "Erro ao enviar WhatsApp",
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    // Log no Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/notifications`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            status: "enviado",
            enviada_em: new Date().toISOString(),
          }),
        });
      } catch (err) {
        console.error("Failed to log WhatsApp send:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `WhatsApp enviado para ${toNumber}`,
        messageId: responseData.sid,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("WhatsApp service error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao enviar WhatsApp",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
