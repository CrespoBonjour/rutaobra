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

async function bxRaw(webhookUrl: string, method: string, payload: any) {
  const r = await fetch(webhookUrl + method + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  return { httpStatus: r.status, data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const debug: any[] = [];

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
      interacciones,
      actividades,
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
      const upd = await bxRaw(webhookUrl, "crm.contact.update", { id: contactId, fields: contactFields });
      debug.push({ step: "crm.contact.update", input: { id: contactId }, ...upd });
      if ("error" in upd.data || upd.data.result === false) contactId = null;
    }
    if (!contactId) {
      const add = await bxRaw(webhookUrl, "crm.contact.add", { fields: contactFields });
      debug.push({ step: "crm.contact.add", ...add });
      if ("error" in add.data) throw new Error("crm.contact.add: " + (add.data.error_description || add.data.error));
      contactId = add.data.result;
    }

    // 2) Negociacion (Deal), con el contacto asignado, en el pipeline "NEGOCIOS PUNTA"
    const pipelineNombre = Deno.env.get("BITRIX_PIPELINE_NAME") || "NEGOCIOS PUNTA";
    const catsResp = await bxRaw(webhookUrl, "crm.dealcategory.list", {});
    debug.push({ step: "crm.dealcategory.list", ...catsResp });
    const categorias = catsResp.data.result;
    const categoria = Array.isArray(categorias)
      ? categorias.find((c: any) => (c.NAME || "").trim().toUpperCase() === pipelineNombre.trim().toUpperCase())
      : null;
    debug.push({ step: "categoria_match", pipelineNombre, encontrada: categoria || null });

    let primerStageId: string | null = null;
    if (categoria) {
      const stagesResp = await bxRaw(webhookUrl, "crm.dealcategory.stage.list", { id: categoria.ID });
      debug.push({ step: "crm.dealcategory.stage.list", categoryId: categoria.ID, ...stagesResp });
      const stages = stagesResp.data.result;
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
    debug.push({ step: "dealFields_a_enviar", dealFields });

    let dealId = bitrixDealId;
    if (dealId) {
      const upd = await bxRaw(webhookUrl, "crm.deal.update", { id: dealId, fields: dealFields });
      debug.push({ step: "crm.deal.update", input: { id: dealId }, ...upd });
      if ("error" in upd.data || upd.data.result === false) dealId = null;
    }
    if (!dealId) {
      const add = await bxRaw(webhookUrl, "crm.deal.add", { fields: dealFields });
      debug.push({ step: "crm.deal.add", ...add });
      if ("error" in add.data) throw new Error("crm.deal.add: " + (add.data.error_description || add.data.error));
      dealId = add.data.result;
    }

    // 3) Notas/interacciones como comentarios de la negociacion
    if (Array.isArray(interacciones)) {
      for (const it of interacciones) {
        const c = await bxRaw(webhookUrl, "crm.timeline.comment.add", {
          fields: { ENTITY_ID: dealId, ENTITY_TYPE: "deal", COMMENT: "[" + (it.fecha || "") + "] " + (it.texto || "") },
        });
        debug.push({ step: "crm.timeline.comment.add", ...c });
      }
    }

    // 4) Actividades con fecha/hora, vinculadas a la negociacion
    const communications: any[] = [];
    if (telefono) communications.push({ VALUE: telefono, TYPE: "PHONE", ENTITY_ID: contactId, ENTITY_TYPE_ID: 3 });
    if (email) communications.push({ VALUE: email, TYPE: "EMAIL", ENTITY_ID: contactId, ENTITY_TYPE_ID: 3 });

    const syncedActivityIds: { rutaObraId: number; bitrixId: string }[] = [];
    const activityErrors: { rutaObraId: number; error: string }[] = [];
    if (Array.isArray(actividades)) {
      for (const act of actividades) {
        const deadline = act.fecha ? act.fecha + "T" + (act.hora || "10:00") + ":00" : undefined;
        const a = await bxRaw(webhookUrl, "crm.activity.add", {
          fields: {
            OWNER_TYPE_ID: 2,
            OWNER_ID: dealId,
            TYPE_ID: 2,
            SUBJECT: act.texto || "Actividad RutaObra",
            DESCRIPTION: act.texto || "",
            COMPLETED: "N",
            DIRECTION: 2,
            PRIORITY: 2,
            RESPONSIBLE_ID: 1,
            ...(communications.length ? { COMMUNICATIONS: communications } : {}),
            ...(deadline ? { DEADLINE: deadline, START_TIME: deadline, END_TIME: deadline } : {}),
          },
        });
        debug.push({ step: "crm.activity.add", rutaObraId: act.id, ...a });
        if ("error" in a.data || a.data.result === false) {
          activityErrors.push({ rutaObraId: act.id, error: a.data.error_description || a.data.error || "result:false" });
        } else {
          syncedActivityIds.push({ rutaObraId: act.id, bitrixId: String(a.data.result) });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, bitrixContactId: contactId, bitrixDealId: dealId, syncedActivityIds, activityErrors, debug }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err), debug }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
