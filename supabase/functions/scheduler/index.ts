// ============================================================================
// SCHEDULER: Sincronização Automática
// ============================================================================
// Cria cron jobs para sincronizações periódicas
// Use Supabase Database -> Webhooks ou pg_cron
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase config missing");
    }

    console.log("⏰ Iniciando sincronizações agendadas...");

    // 1. Sincronizar Booking.com a cada 6 horas
    console.log("📅 Sincronizando Booking.com...");
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const endDate = nextMonth.toISOString().split("T")[0];

    const bookingSyncRes = await fetch(
      `${supabaseUrl}/functions/v1/sync-booking-com`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          propertyId: Deno.env.get("BOOKING_PROPERTY_ID"),
          startDate: today,
          endDate: endDate,
        }),
      }
    );

    const bookingSyncData = await bookingSyncRes.json();
    console.log("✅ Booking.com sync:", bookingSyncData);

    // 2. Verificar notificações pendentes
    console.log("📨 Verificando notificações pendentes...");
    const notificationsRes = await fetch(
      `${supabaseUrl}/rest/v1/notifications?status=eq.pendente&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const notifications = await notificationsRes.json();
    console.log(`📩 ${notifications.length} notificações pendentes`);

    // 3. Processar notificações
    for (const notification of notifications) {
      try {
        if (notification.tipo === "email") {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              to: notification.destino,
              subject: notification.assunto,
              html: notification.conteudo,
            }),
          });
        } else if (notification.tipo === "whatsapp") {
          await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              to: notification.destino,
              body: notification.conteudo,
            }),
          });
        }

        // Marcar como enviado
        await fetch(
          `${supabaseUrl}/rest/v1/notifications?id=eq.${notification.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              status: "enviado",
              enviada_em: new Date().toISOString(),
            }),
          }
        );
      } catch (err) {
        console.error(`Erro processando notificação ${notification.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sincronizações completadas",
        booking_sync: bookingSyncData,
        notifications_processed: notifications.length,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Scheduler error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro no scheduler",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
