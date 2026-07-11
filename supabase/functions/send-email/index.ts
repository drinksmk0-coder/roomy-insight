// ============================================================================
// SUPABASE EDGE FUNCTION: send-email
// ============================================================================
// Deploy: supabase functions deploy send-email
// Endpoint: https://seu-projeto.supabase.co/functions/v1/send-email
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS
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

    const payload: EmailPayload = await req.json();

    // Validar payload
    if (!payload.to || !payload.subject || !payload.html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Recuperar credenciais de variáveis de ambiente
    const gmailEmail = Deno.env.get("GMAIL_EMAIL");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailEmail || !gmailAppPassword) {
      console.error("Gmail credentials not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Conectar ao SMTP do Gmail
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: gmailEmail,
      password: gmailAppPassword,
    });

    // Enviar email
    await client.send({
      from: gmailEmail,
      to: payload.to,
      subject: payload.subject,
      content: payload.html,
      html: true,
      replyTo: payload.replyTo || gmailEmail,
    });

    await client.close();

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
        console.error("Failed to log email send:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email enviado para ${payload.to}`,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Email service error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao enviar email",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
