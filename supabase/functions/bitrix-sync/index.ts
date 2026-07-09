// Edge Function: bitrix-sync
// Recibe datos de un contacto de RutaObra y los manda a Bitrix24: crea/actualiza
// el Contacto, crea/actualiza una Negociacion (Deal) con ese contacto asignado,
// pasa las notas como comentarios de la negociacion, y crea actividades con
// fecha/hora en Bitrix por cada actividad pendiente de RutaObra.
//
// La clave del webhook vive en la variable de entorno BITRIX_WEBHOOK_URL
// (Edge Functions -> Secrets), nunca en el codigo ni en la base de datos.

// deno-lint-ignore-file no-explicit-any

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function bx(webhookUrl: string, method: string, payload: any) {
  const r = await fetch(webhookUrl + method + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (data.error) throw new Error(method + ": " + (data.error_description || data.error));
  if (data.result === false) throw new Error(method + ": la operación no tuvo efecto (¿el ID ya no existe en Bitrix?)");
  return data.result;
}

Deno.serve(async (req: Request) => {
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
      bitrixDealId,
      empresa,
      estudio,
      nombre,
      cargo,
      telefono,
      email,
      direccion,
      notas,
      interacciones, // [{fecha, texto}] historial, solo lo nuevo
      actividades, // [{id, fecha, hora, texto}] actividades de agenda pendientes de sincronizar
    } = body;

    // 1) Contacto
    const contactFields: Record<string, any> = {
      NAME: nombre || empresa || "Contacto RutaObra",
      POST: cargo || "",
      COMMENTS: [empresa ? "Empresa: " + empresa : "", estudio ? "Estudio: " + estudio : "", direccion ? "Dirección: " + direccion : ""]
        .filter(Boolean)
        .join("\n"),
      OPENED: "Y",
    };
    if (telefono) contactFields.PHONE = [{ VALUE: telefono, VALUE_TYPE: "WORK" }];
    if (email) contactFields.EMAIL = [{ VALUE: email, VALUE_TYPE: "WORK" }];

    let contactId = bitrixContactId;
    if (contactId) {
      try {
        await bx(webhookUrl, "crm.contact.update", { id: contactId, fields: contactFields });
      } catch (_e) {
        contactId = null; // el contacto ya no existe en Bitrix, crear uno nuevo
      }
    }
    if (!contactId) {
      contactId = await bx(webhookUrl, "crm.contact.add", { fields: contactFields });
    }

    // 2) Negociacion (Deal), con el contacto asignado, en el pipeline "NEGOCIOS PUNTA"
    const pipelineNombre = Deno.env.get("BITRIX_PIPELINE_NAME") || "NEGOCIOS PUNTA";
    const categorias = await bx(webhookUrl, "crm.dealcategory.list", {});
    const categoria = Array.isArray(categorias)
      ? categorias.find((c: any) => (c.NAME || "").trim().toUpperCase() === pipelineNombre.trim().toUpperCase())
      : null;

    let primerStageId: string | null = null;
    if (categoria) {
      const stages = await bx(webhookUrl, "crm.dealcategory.stage.list", { id: categoria.ID });
      if (Array.isArray(stages) && stages.length) primerStageId = stages[0].STATUS_ID;
    }

    const dealFields: Record<string, any> = {
      TITLE: empresa || estudio || "Negociación RutaObra",
      CONTACT_ID: contactId,
      COMMENTS: notas || "",
      OPENED: "Y",
      ...(categoria ? { CATEGORY_ID: categoria.ID } : {}),
      ...(primerStageId ? { STAGE_ID: primerStageId } : {}),
    };
    let dealId = bitrixDealId;
    if (dealId) {
      try {
        await bx(webhookUrl, "crm.deal.update", { id: dealId, fields: dealFields });
      } catch (_e) {
        dealId = null; // la negociacion ya no existe en Bitrix, crear una nueva
      }
    }
    if (!dealId) {
      dealId = await bx(webhookUrl, "crm.deal.add", { fields: dealFields });
    }

    // 3) Notas/interacciones como comentarios de la negociacion
    if (Array.isArray(interacciones)) {
      for (const it of interacciones) {
        await bx(webhookUrl, "crm.timeline.comment.add", {
          fields: { ENTITY_ID: dealId, ENTITY_TYPE: "deal", COMMENT: "[" + (it.fecha || "") + "] " + (it.texto || "") },
        });
      }
    }

    // 4) Actividades con fecha/hora, vinculadas a la negociacion
    const syncedActivityIds: { rutaObraId: number; bitrixId: string }[] = [];
    const activityErrors: { rutaObraId: number; error: string }[] = [];
    if (Array.isArray(actividades)) {
      for (const act of actividades) {
        const deadline = act.fecha ? act.fecha + "T" + (act.hora || "10:00") + ":00" : undefined;
        try {
          const activityId = await bx(webhookUrl, "crm.activity.add", {
            fields: {
              OWNER_TYPE_ID: 2, // Deal
              OWNER_ID: dealId,
              TYPE_ID: 3, // Tarea
              PROVIDER_ID: "TASK",
              PROVIDER_TYPE_ID: "TASK",
              SUBJECT: act.texto || "Actividad RutaObra",
              DESCRIPTION: act.texto || "",
              COMPLETED: "N",
              DIRECTION: 2,
              PRIORITY: 2,
              RESPONSIBLE_ID: 1,
              ...(deadline ? { DEADLINE: deadline, START_TIME: deadline, END_TIME: deadline } : {}),
            },
          });
          syncedActivityIds.push({ rutaObraId: act.id, bitrixId: String(activityId) });
        } catch (actErr) {
          activityErrors.push({ rutaObraId: act.id, error: String(actErr) });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, bitrixContactId: contactId, bitrixDealId: dealId, syncedActivityIds, activityErrors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
