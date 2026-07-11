// ============================================================================
// SUPABASE EDGE FUNCTION: sync-booking-com
// ============================================================================
// Deploy: supabase functions deploy sync-booking-com
// Endpoint: https://seu-projeto.supabase.co/functions/v1/sync-booking-com
// Puxa reservas do Booking.com e sincroniza
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SyncPayload {
  propertyId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
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
    if (!payload.propertyId || !payload.startDate || !payload.endDate) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: propertyId, startDate, endDate",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Recuperar credenciais Booking.com
    const bookingApiKey = Deno.env.get("BOOKING_COM_API_KEY");
    const bookingApiUrl =
      Deno.env.get("BOOKING_COM_API_URL") ||
      "https://secure-supply-connect.booking.com/hotels/ota";

    if (!bookingApiKey) {
      console.error("Booking.com credentials not configured");
      return new Response(
        JSON.stringify({ error: "Booking.com service not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Chamar API Booking.com
    const params = new URLSearchParams({
      property_id: payload.propertyId,
      start_date: payload.startDate,
      end_date: payload.endDate,
      fields:
        "id,guest_name,guest_email,guest_phone,room_id,checkin,checkout,status,total_price,currency",
    });

    const response = await fetch(
      `${bookingApiUrl}/reservations?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${bookingApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Booking.com error:", responseData);
      return new Response(
        JSON.stringify({
          error: responseData.message || "Erro ao sincronizar Booking.com",
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    // Processar reservas
    const reservations = responseData.reservations || [];
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let syncedCount = 0;
    let errors = 0;

    for (const booking of reservations) {
      try {
        // Verificar se já existe
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/booking_com_sync?booking_com_id=eq.${booking.id}`,
          {
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        const existing = await checkRes.json();

        if (existing.length === 0) {
          // Criar nova reserva
          const resRes = await fetch(
            `${supabaseUrl}/rest/v1/reservations`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                quarto: parseInt(booking.room_id, 10),
                hospede_nome: booking.guest_name,
                hospede_email: booking.guest_email,
                hospede_telefone: booking.guest_phone,
                checkin: booking.checkin,
                checkout: booking.checkout,
                valor_total: booking.total_price,
                valor_pago:
                  booking.status === "confirmed" ? booking.total_price : 0,
                status: booking.status === "confirmed" ? "ocupado" : "reservado",
                origem: "booking.com",
                observacoes: `Sincronizado do Booking.com em ${new Date().toISOString()}`,
              }),
            }
          );

          if (resRes.ok) {
            const newRes = await resRes.json();
            syncedCount++;

            // Registrar sync
            await fetch(`${supabaseUrl}/rest/v1/booking_com_sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({
                booking_com_id: booking.id,
                reserva_id: newRes[0]?.id,
                dados_originais: booking,
              }),
            });
          }
        }
      } catch (err) {
        console.error(`Erro sincronizando booking ${booking.id}:`, err);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronizadas ${syncedCount} reservas do Booking.com`,
        synced: syncedCount,
        errors,
        total: reservations.length,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Booking.com sync error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao sincronizar Booking.com",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
