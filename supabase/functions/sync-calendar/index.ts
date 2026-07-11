// ============================================================================
// SUPABASE EDGE FUNCTION: sync-calendar
// ============================================================================
// Deploy: supabase functions deploy sync-calendar
// Endpoint: https://seu-projeto.supabase.co/functions/v1/sync-calendar
// Sincroniza reservas com Google Calendar
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location: string;
  attendees?: Array<{ email: string }>;
}

interface SyncPayload {
  event: CalendarEvent;
  calendarId?: string;
  accessToken: string; // Google OAuth token
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

    const payload: SyncPayload = await req.json();

    // Validar
    if (!payload.event || !payload.accessToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event, accessToken" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const calendarId = payload.calendarId || "primary";

    // Chamar Google Calendar API
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${payload.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload.event),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Google Calendar error:", responseData);
      return new Response(
        JSON.stringify({
          error: responseData.error?.message || "Erro ao sincronizar calendar",
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    // Log no Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/sync_log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            tipo: "calendar_sync",
            status: "sucesso",
            dados: {
              eventId: responseData.id,
              calendarId,
              summary: payload.event.summary,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to log sync:", err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Evento criado no Google Calendar",
        eventId: responseData.id,
        htmlLink: responseData.htmlLink,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Calendar sync error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao sincronizar calendar",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
