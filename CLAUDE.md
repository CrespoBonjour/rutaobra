# RutaObra

CRM interno de MGI Insumos Eléctricos para gestión de contactos/obras en Punta del Este. App de una sola página (`index.html`): login con Google vía Supabase Auth, datos en Supabase (tabla `visitas`, `zonas`, `agenda`, `negociaciones`), mapa con Leaflet, hosteada en GitHub Pages (`https://crespobonjour.github.io/rutaobra/`).

## Workflow de guardado en Git

Después de cada cambio funcional, hacer commit + push a GitHub automáticamente (salvo que el usuario pida explícitamente no subir algo o revertir). Antes de commitear, copiar `index.html` a `backups/` con timestamp.

## Workflow de documentación en Obsidian

El usuario tiene un vault de Obsidian en `D:\OBSIDIAN\BOVEDA LOYAL` (CLI ya instalado y registrado — comando `obsidian`, skills `obsidian-cli` / `obsidian-markdown` disponibles).

**Al final de cada sesión de trabajo** en la que se hicieron cambios reales al proyecto, crear una nota nueva en la carpeta `RutaObra/` del vault (una nota por sesión, con fecha), con este contenido:

- **Changelog**: qué se cambió/arregló, con el hash de commit si aplica.
- **Decisiones de diseño/arquitectura**: el porqué de decisiones no obvias (usar callouts `> [!note]`).
- **Documentación técnica**: cómo funciona lo que se tocó, para consulta futura.
- **Pendientes**: bugs conocidos o temas abiertos que quedaron sin resolver.

Nombre de archivo sugerido: `YYYY-MM-DD - descripción corta.md`. Ver notas anteriores en esa carpeta para el formato exacto.

No hace falta pedir permiso para crear estas notas — es un hábito ya acordado con el usuario. Sí avisar brevemente al usuario que se guardó la nota.

## Reglas de código específicas de este proyecto

- **Nunca mezclar estado de UI con los objetos que se guardan en Supabase.** Ya pasó una vez (`item.expanded` colándose en el guardado y rompiendo todo el upsert con `PGRST204` porque esa columna no existe en la tabla). Estado puramente visual va en variables/Sets separados, nunca como propiedad del objeto de datos.
- **Toda función que hable con Supabase debe pasar por `sbGet` / `sbUpsert` / `sbDelete`** (no hacer `fetch` directo a la API REST), porque esos helpers ya manejan el reintento automático cuando el token JWT expiró.
- Cualquier campo nuevo que se agregue a un contacto/entidad debe existir como columna real en Supabase antes de mandarlo en un upsert, o el guardado completo falla.
