# 🚀 Sistema de Respaldos y GitHub Sync

## ¿Qué hace?

Cada vez que hagas cambios en la aplicación **RutaObra**, el sistema:

1. ✅ **Crea un respaldo local** con timestamp en la carpeta `backups/`
2. 📱 **Sube los cambios a GitHub** automáticamente  
3. 🔍 Puedes ver los cambios desde **cualquier dispositivo** (teléfono, tablet, etc.)

---

## 📋 Cómo usar

### Opción 1: Usando el script de PowerShell (RECOMENDADO)

Después de hacer cambios en `index.html`, ejecuta en PowerShell:

```powershell
cd "D:\CLAUDE CODE"
.\sync-backup.ps1 -message "Descripción de los cambios"
```

**Ejemplo:**
```powershell
.\sync-backup.ps1 -message "Ajustar colores del formulario"
```

### Opción 2: Sin mensaje personalizado (por defecto)

```powershell
.\sync-backup.ps1
```

Usará el mensaje predeterminado: "Actualización de RutaObra"

---

## 📁 Estructura de carpetas

```
D:\CLAUDE CODE\
├── index.html                    ← Archivo principal
├── manifest.json
├── backups/                      ← Respaldos locales
│   ├── index_2026-07-05_234934.html
│   ├── index_2026-07-05_235012.html
│   └── index_2026-07-05_235100.html
├── sync-backup.ps1              ← Script de automatización
└── .gitignore                    ← Excluye backups de GitHub
```

---

## 🔄 Flujo de cambios

```
1. Cambias algo en index.html (en VS Code)
   ↓
2. Ejecutas: .\sync-backup.ps1 -message "Mi cambio"
   ↓
3. El script:
   • Crea respaldo: backups/index_timestamp.html
   • Hace commit en Git
   • Hace push a GitHub
   ↓
4. Abres desde tu teléfono: https://crespobonjour.github.io/rutaobra/
   ↓
5. ¡Ves el cambio actualizado en el teléfono! 📱
```

---

## 💾 Recuperar una versión anterior

Si te arrepientes de un cambio:

1. Abre la carpeta `backups/`
2. Busca el respaldo con la fecha que deseas (ej: `index_2026-07-05_234934.html`)
3. Copia su contenido
4. Pega en `index.html`
5. Ejecuta nuevamente: `.\sync-backup.ps1 -message "Revertir a versión anterior"`

---

## 📱 Ver cambios desde el teléfono

**Directo sin VS Code:**
1. Abre: **https://crespobonjour.github.io/rutaobra/**
2. ¡Ya verás los cambios reflejados! (pueden tardar algunos segundos en actualizar)

---

## 📝 Notas

- Los respaldos **NO suben a GitHub** (quedan solo en tu PC para seguridad)
- El script automáticamente hace commit con timestamp
- Si hay conflictos de Git, el script hace `pull` primero
- Cada cambio es rastreable en: https://github.com/CrespoBonjour/rutaobra/commits/main

---

## 🎯 Resumen de cambios hechos hoy

- ✅ **2026-07-05**: Optimizar layout Kanban en negociaciones para mobile
  - Grid responsive en teléfono
  - Todas las 5 columnas visibles sin scroll horizontal
  - Mejor experiencia en tablet y desktop

---

¡Listo para testear desde tu teléfono! 🚀
