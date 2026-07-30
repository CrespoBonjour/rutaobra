-- Libera la memoria de las fotos base64 guardadas en la tabla visitas.
-- Las fotos se sacaron de la app (Martín ya tiene la info al cargarla); estos
-- ~72 MB no aportan y encarecen Supabase. Aditivo/seguro: NO borra contactos,
-- solo vacía las dos columnas de fotos. Correr una vez en el SQL Editor.

-- 1) Vaciar las fotos de todas las visitas.
update public.visitas
   set fotos = '[]'::jsonb,
       photo = null
 where photo is not null
    or fotos is distinct from '[]'::jsonb;

-- 2) (Opcional) Recuperar el espacio en disco de inmediato.
--    Si el editor de Supabase da error "cannot run inside a transaction block",
--    corré SOLO esta linea, sola, en una consulta aparte:
-- vacuum full public.visitas;
