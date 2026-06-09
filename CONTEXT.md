# Veridoc IA — Contexto del Proyecto

## Stack técnico
- **Frontend**: React 18 + Vite + Tailwind CSS (colores críticos con `style={}` inline, no clases Tailwind)
- **Backend**: Node.js + Express — arranca en puerto 4000 (sin BD propia — auth delegada a Supabase)
- **Base de datos**: Supabase — auth activa, tablas `profiles` y `tenants` en uso
- **IA**: Claude API llamada directamente desde el browser (sin proxy backend)

## Diseño / Design system

### Colores
| Token | Hex | Uso |
|---|---|---|
| primary | `#1E3A2F` | Sidebar, barra identidad, botones primarios |
| surface | `#F4F4F8` | Fondo general |
| accent-green | `#4CAF8A` | Acento, validadas, foco |
| blue | `#6C8EF5` | Acento secundario |
| amber | `#E8A030` | Alertas pendientes |
| green | `#3DB88A` | Validadas badge |
| red | `#E57373` | Incidencias, errores, borrar |
| border | `#E8E8F0` | Bordes generales |

> CRÍTICO: Usar SIEMPRE `style={{ backgroundColor: '#1E3A2F' }}` inline para colores del sidebar/barra/botones primarios. Las clases Tailwind custom (`bg-vd-sidebar`, etc.) se purgan en JIT y no renderizan.

### Tipografía
- **Syne 700** — títulos, wordmark, números de alerta
- **DM Sans 300/400/500** — todo el resto
- `const T = { syne: 'Syne, sans-serif', dm: '"DM Sans", sans-serif' }` (en cada archivo que las usa)
- Cargadas via `<link>` en `frontend/index.html` (no @import CSS)

## Tenants demo (multi-tenant)

| Tenant key | Nombre completo | Logo | ERP | Credenciales demo |
|---|---|---|---|---|
| `gonzalezlara` | González Lara Alimentación | `public/logos/gonzalezlara/logo.svg` | `albaibs` | demo@gonzalezlara.com / demo2026 |
| `solvinco` | Solvinco | `public/logos/solvinco.png` | `mygestion` | demo@solvinco.com / demo2026 |
| `viavac` | Viavac | `public/logos/viavac/logo.svg` | `mygestion` | demo@viavac.com / demo2026 |

- Config en: `frontend/src/config/tenants.js`
- Cada tenant tiene `erp` (string) y `exportFormats` (array de claves de formato)
- Tenant detectado por email en login → guardado en sessionStorage → leído en Dashboard
- `getTenant()` lee SOLO de sessionStorage — el `?tenant=` en URL fue eliminado
- **CRÍTICO**: llamar `getTenant()` DENTRO del componente React, nunca a nivel de módulo (queda congelado)

## Exportación por tenant

| Tenant | Formato primario | Formato secundario |
|---|---|---|
| gonzalezlara | XML AlbaIBS (`exportFormats: ['xmlAlbaIbs', 'excel']`) | Excel genérico |
| solvinco | Excel myGESTIÓN (`exportFormats: ['excelMyGestion']`) | — |
| viavac | Excel myGESTIÓN (`exportFormats: ['excelMyGestion']`) | — |

- Exportadores: `frontend/src/services/exporters/`
  - `xmlAlbaIbs.js` → `exportXmlAlbaIbs()` — XML con RazonSocial, FechaFactura, NumeroFactura, BaseImponible, ImporteIVA, TotalFactura, FormaPago, Vencimiento
  - `excelMyGestion.js` → `exportExcelMyGestion()` / `exportExcelGenerico()` — CSV con BOM, columnas: Proveedor, Fecha Factura, Su Factura, Base Imponible, % IVA, Cuota IVA, Total Factura, Forma Pago, Vencimiento
- `% IVA` usa `porcentaje_iva` si disponible, si no calcula `Math.round((importe_iva / base_imponible) * 100) || 0`
- Facturas de abono: `signed()` (XML) y `signedNum()` (CSV) garantizan signo negativo en exportación aunque el dato no haya sido revisado manualmente
- Dashboard lee `tenant.exportFormats` y mapea a `EXPORT_BTNS` para renderizar los botones del footer
- El botón "Exportar validadas" del topbar usa `tenant.exportFormats[0]` (formato primario)

## Producción

- **URL**: `https://veridoc-ia.vercel.app`
- **Repositorio**: `https://github.com/Speedtriple991/veridoc-ia`
- **Variables Vercel**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ANTHROPIC_API_KEY`
- **Root Directory en Vercel**: `frontend`

## Supabase

- **Proyecto**: Veridoc ai
- **URL**: `https://bfyqjcfldnktvovvnxiz.supabase.co`
- **Cliente**: `frontend/src/lib/supabase.js` — `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` con fallback hardcodeado

### Tablas
```sql
-- tenants (3 registros)
id    uuid  PRIMARY KEY
slug  text  -- 'gonzalezlara' | 'solvinco' | 'viavac'
-- (otros campos de configuración del tenant)

-- profiles (3 registros, RLS activo)
id          uuid  PRIMARY KEY REFERENCES auth.users(id)
tenant_id   uuid  REFERENCES tenants(id)
```

## Flujo de autenticación (Supabase Auth) ✅ en producción

1. Usuario entra en `veridoc-ia.vercel.app` → pantalla de login genérica
2. `supabase.auth.signInWithPassword({ email, password })` valida contra Supabase Auth
3. Query `profiles` por `id = user.id` → obtiene `tenant_id`
4. Query `tenants` por `id = tenant_id` → obtiene `tenant.slug`
5. `saveSession(user.email, tenant.slug)` guarda `{ email, tenant, nombre }` en `sessionStorage`
6. `navigate('/dashboard')` — Dashboard lee `getSession()` + `getTenant()` → branding correcto
7. `PrivateRoute` en `App.jsx` verifica `supabase.auth.getSession()` en cada montaje
8. Logout: `supabase.auth.signOut()` + `clearSession()` → `/login`

## Layout de Dashboard

```
┌─────────────────────────────────────────────────────┐
│  BARRA IDENTIDAD — 46px, #1E3A2F, full width        │
│  [logo cliente centrado]  Nombre del cliente        │
├──────────────┬──────────────────────────────────────┤
│ SIDEBAR      │  TOPBAR (50px, blanco)                │
│ 160px        ├──────────────────────────────────────┤
│ #1E3A2F      │  CONTENT (scrollable)                 │
│ icono+label  │  - Alert cards (Pendientes/Incid/Val) │
│              │  - Tabs + búsqueda                    │
│ [Logout]     │  - Lista de facturas                  │
│ [Avatar]     │  - Footer (contadores + export btns)  │
└──────────────┴──────────────────────────────────────┘
```

## API Anthropic (extracción AI)
- Clave: `frontend/.env` → `VITE_ANTHROPIC_API_KEY=sk-ant-...`
- **Reiniciar Vite** después de editar `.env` (las variables se inyectan en build-time)
- Modelo: `claude-haiku-4-5-20251001`
- Header obligatorio: `anthropic-dangerous-direct-browser-access: true`
- Servicio: `frontend/src/services/extractInvoice.js`
- Campos extraídos: `razon_social, fecha_factura, numero_factura, base_imponible, porcentaje_iva, importe_iva, total_factura, forma_pago, vencimiento, es_abono`
- PDF enviado como base64 en `content[].source.type = 'base64'`

## Facturas de abono / notas de crédito

- Claude detecta automáticamente si la factura es un abono (`es_abono: true`) por palabras clave (ABONO, RECTIFICATIVA, NOTA DE CRÉDITO) o importes negativos en el PDF
- Campo `es_abono` en `extracted_data` (boolean) — no editable por el usuario, preservado siempre en el spread de `saveAndNavigate`
- **Vista de revisión** (`InvoiceReview.jsx`):
  - Banner amber ⚠️ "FACTURA DE ABONO" aparece al inicio del panel de campos
  - Campos `base_imponible`, `importe_iva`, `total_factura` se muestran con label, prefijo e input en rojo (`danger` prop del componente `Field`)
  - `setFields` carga los valores normalizados a positivos (`Math.abs`) para facilitar la edición
  - `saveAndNavigate` aplica `negIfAbono()` — guarda los tres importes como negativos en `extracted_data` de localStorage
- **Dashboard** (`InvoiceRow`):
  - Badge "ABONO" (uppercase, amber `#FFF8EC`/`#F5D99A`) aparece antes del badge de estado
  - Importe mostrado en rojo `#E57373`; si el valor almacenado es aún positivo (no revisado), se muestra negado en pantalla
- **Footer del dashboard**: `totalBase` reduce aplicando `negIfAbono` — los abonos restan del acumulado aunque no hayan sido revisados
- **Exportadores**: `signed(d, v)` en XML y `signedNum(d, v)` en CSV — invariante: `es_abono === true && v > 0 → -v`

## % IVA y cálculo client-side

- Campo `porcentaje_iva` extraído por Claude como entero (21, 10 o 4)
- **Fallback client-side** en `InvoiceReview.jsx` → `setFields`: si Claude devuelve `null` o `0`, se calcula `Math.round(Math.abs(iva) / Math.abs(base) * 100)` directamente en el browser
- **Visibilidad condicional**: el campo `% IVA` solo se renderiza en la vista de revisión si `tenant.erp === 'mygestion'` (solvinco y viavac). González Lara (`albaibs`) no lo muestra
- En el exportador CSV myGESTIÓN: `calcPctIva(d)` usa `porcentaje_iva` si `!= null && !== 0`, si no calcula desde `importe_iva / base_imponible`
- Al guardar: `parseInt(fields.porcentaje_iva, 10)` → `extracted_data.porcentaje_iva` (entero o null)

## Persistencia de datos (localStorage) — pendiente migración a Supabase

- Clave por tenant: `veridoc_invoices_[tenantKey]`
- Cada factura incluye `pdf_base64` para mostrar el PDF en la vista de revisión
- Sin datos de muestra — estado vacío hasta primera extracción real
- `deleteInvoice(id)` pide confirmación, filtra y persiste
- **Pendiente**: migrar facturas de localStorage a tabla `invoices` en Supabase
- **Pendiente**: subir PDFs a Supabase Storage en lugar de guardar base64 en localStorage

## Estado de módulos

| Módulo | Estado | Archivo |
|---|---|---|
| Login genérico (sin branding cliente) | ✅ | `frontend/src/pages/Login.jsx` |
| Detección de tenant por Supabase (profiles + tenants) | ✅ | `Login.jsx` → Supabase queries |
| 3 tenants configurados con logos | ✅ | `frontend/src/config/tenants.js` + `public/logos/` |
| Barra superior identidad cliente | ✅ | `Dashboard.jsx` (top identity bar) |
| Dashboard (sidebar + topbar + lista) | ✅ | `frontend/src/pages/Dashboard.jsx` |
| Borrar factura (con confirmación) | ✅ | `Dashboard.jsx` → `deleteInvoice()` |
| UploadModal (drag & drop, estado por archivo) | ✅ | `frontend/src/components/UploadModal.jsx` |
| Extracción AI con Claude | ✅ | `frontend/src/services/extractInvoice.js` |
| Persistencia localStorage por tenant | ✅ | `Dashboard.jsx` + `UploadModal.jsx` |
| Vista revisión dividida PDF + campos editables | ✅ | `frontend/src/pages/InvoiceReview.jsx` |
| Backend Express (arranca, sin BD) | ⚠️ parcial | `backend/src/index.js` (puerto 4000) |
| Supabase auth + base de datos | ✅ | `frontend/src/lib/supabase.js` + `Login.jsx` + `App.jsx` |
| Exportar XML AlbaIBS (gonzalezlara) | ✅ | `frontend/src/services/exporters/xmlAlbaIbs.js` |
| Exportar Excel myGESTIÓN (solvinco, viavac) | ✅ | `frontend/src/services/exporters/excelMyGestion.js` |
| Exportar Excel genérico (gonzalezlara secundario) | ✅ | `frontend/src/services/exporters/excelMyGestion.js` |
| Detección automática facturas de abono (`es_abono`) | ✅ | `extractInvoice.js` prompt + `InvoiceReview.jsx` |
| Badge + importes en rojo para abonos en revisión | ✅ | `InvoiceReview.jsx` → prop `danger` en `Field` |
| Importes negativos al guardar abonos en localStorage | ✅ | `InvoiceReview.jsx` → `saveAndNavigate` `negIfAbono()` |
| Dashboard: badge Abono + importe negativo en rojo | ✅ | `Dashboard.jsx` → `InvoiceRow` |
| Footer dashboard resta abonos del total acumulado | ✅ | `Dashboard.jsx` → `totalBase` reducer |
| Exportación con signo negativo para abonos | ✅ | `xmlAlbaIbs.js` `signed()` / `excelMyGestion.js` `signedNum()` |
| Campo % IVA condicional (solo tenants myGESTIÓN) | ✅ | `InvoiceReview.jsx` → `tenant.erp === 'mygestion'` |
| Fallback % IVA calculado client-side si Claude da 0/null | ✅ | `InvoiceReview.jsx` → `setFields` IIFE |
| Login Supabase Auth en producción (veridoc-ia.vercel.app) | ✅ | `Login.jsx` + `frontend/src/lib/supabase.js` |
| Logos tenant en repo y CDN Vercel | ✅ | `frontend/public/logos/` |
| Dashboard muestra nombre de empresa en saludo | ✅ | `Dashboard.jsx` → `tenant.nombre` |
| Migrar facturas localStorage → Supabase tabla `invoices` | ❌ pendiente | — |
| PDFs → Supabase Storage (en lugar de base64 en localStorage) | ❌ pendiente | — |

## Rutas de la app

| Ruta | Componente | Notas |
|---|---|---|
| `/login` | `Login.jsx` | Público, genérico |
| `/` | `Dashboard.jsx` | Privado |
| `/dashboard` | `Dashboard.jsx` | Privado |
| `/review/:id` | `InvoiceReview.jsx` | Privado, split PDF+campos |
| `/invoices/upload` | `InvoiceUpload.jsx` | Privado (stub) |

## Logos — archivos fuente y destino

| Tenant | Origen | Destino en public/ |
|---|---|---|
| gonzalezlara | `gonzalezlara/logo-gonzalez-lara.svg` | `public/logos/gonzalezlara/logo.svg` |
| solvinco | (ya estaba) | `public/logos/solvinco.png` |
| viavac | `viavac/viavac_logo_vacuum_lifting.svg.svg` | `public/logos/viavac/logo.svg` |

## Entorno local
- **Ruta proyecto**: `C:\Users\tester\Carpeta DIGI storage\CLAUDE PROYECTOS\Veridoc IA`
- **Frontend**: `cd frontend && npm run dev` → puerto 5173 (o siguiente libre)
- **Backend**: `cd backend && npm run dev` → puerto 4000
- **Arrancar ambos**: matar procesos previos con `taskkill /F /IM node.exe` si hay conflictos de puerto

## Notas de arquitectura críticas

1. `Dashboard.jsx` es self-contained — sidebar + barra identidad + topbar + contenido en un solo archivo. No hay AppLayout wrapper.
2. `App.jsx` es routing puro — sin AuthProvider ni context global.
3. `getTenant()` SIEMPRE dentro del componente, nunca a nivel de módulo.
4. `TenantLogo` se exporta desde `Login.jsx` — disponible para otros componentes.
5. Iconos: `@tabler/icons-react` outline, stroke 1.6. Verificar que el icono existe antes de importar (algunos nombres no existen en la versión instalada).
6. Sidebar: 160px ancho, icono + label en cada nav item.
7. Barra de identidad: 46px alto, full-width, `#1E3A2F`, logo centrado + nombre a la derecha.
8. `blobUrl` se almacena dentro del objeto `doc` (no en state separado) para evitar desincronización — patrón `docsRef` para cleanup en unmount sin closures obsoletos.