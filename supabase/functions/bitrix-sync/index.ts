// Edge Function: bitrix-sync
// Recibe datos de un contacto de RutaObra y los manda a Bitrix24 usando el
// webhook secreto (guardado como variable de entorno BITRIX_WEBHOOK_URL,
// nunca en el codigo ni en la base de datos).
//
// Deploy: pegar este codigo en Supabase Dashboard -> Edge Functions ->
// "bitrix-sync" -> Deploy. Configurar el secreto en Edge Functions -> Secrets:
//   BITRIX_WEBHOOK_URL = https://mgi.bitrix24.es/rest/140/xxxxxxxxx/
//
// Requiere que el usuario este autenticado (Supabase ya valida el JWT antes
// de llegar aca si la funcion se deja con "Verify JWT" activado).

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("BITRIX_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(JSON.stringify({ ok: false, error: "Falta configurar BITRIX_WEBHOOK_URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      bitrixContactId,
      empresa,
      estudio,
      nombre,
      cargo,
      telefono,
      email,
      direccion,
      notas,
      interacciones, // array de {fecha, texto} SOLO las nuevas a sincronizar
    } = body;

    const fields: Record<string, any> = {
      NAME: nombre || empresa || "Contacto RutaObra",
      POST: cargo || "",
      COMMENTS: [empresa ? "Empresa: " + empresa : "", estudio ? "Estudio: " + estudio : "", direccion ? "Dirección: " + direccion : "", notas || ""]
        .filter(Boolean)
        .join("\n"),
      OPENED: "Y",
    };
    if (telefono) fields.PHONE = [{ VALUE: telefono, VALUE_TYPE: "WORK" }];
    if (email) fields.EMAIL = [{ VALUE: email, VALUE_TYPE: "WORK" }];

    let contactId = bitrixContactId;

    if (contactId) {
      const upd = await fetch(webhookUrl + "crm.contact.update.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contactId, fields }),
      });
      const updData = await upd.json();
      if (updData.error) throw new Error(updData.error_description || updData.error);
    } else {
      const add = await fetch(webhookUrl + "crm.contact.add.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      });
      const addData = await add.json();
      if (addData.error) throw new Error(addData.error_description || addData.error);
      contactId = addData.result;
    }

    if (Array.isArray(interacciones)) {
      for (const it of interacciones) {
        await fetch(webhookUrl + "crm.timeline.comment.add.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              ENTITY_ID: contactId,
              ENTITY_TYPE: "contact",
              COMMENT: "[" + (it.fecha || "") + "] " + (it.texto || ""),
            },
          }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, bitrixContactId: contactId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
