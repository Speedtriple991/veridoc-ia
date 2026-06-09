# Veridoc IA

Plataforma multicliente (SaaS) de automatización de procesos documentales con Inteligencia Artificial.

## Descripción

Veridoc permite a empresas de cualquier tamaño automatizar la extracción, validación y procesamiento de datos desde documentos (facturas, contratos, formularios) usando modelos de IA de última generación (Anthropic Claude).

### Módulo 1 — Extracción de Facturas PDF

- Carga de facturas en PDF vía interfaz web
- Extracción automática de campos: proveedor, RUC/NIT, fecha, monto, líneas de detalle
- Revisión y corrección manual antes de exportar
- Exportación a JSON / CSV / integración con ERP

## Arquitectura

```
Veridoc IA/
├── frontend/          # React + Tailwind (Vite) → Vercel
├── backend/           # Node.js + Express → Railway
└── README.md
```

### Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18, Tailwind CSS, React Router v6, Axios |
| Backend | Node.js, Express, Multer |
| IA | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Base de datos | PostgreSQL via Supabase |
| Auth | JWT + bcryptjs |
| Hosting frontend | Vercel |
| Hosting backend | Railway |

## Multitenancy

Cada cliente (tenant) tiene su propio espacio aislado de datos. Los usuarios pertenecen a un tenant y solo acceden a los documentos de su organización. Los roles disponibles son `admin` y `user`.

## Variables de entorno

Copia `.env.example` a `.env` en la raíz del backend y completa los valores:

```bash
cp .env.example .env
```

## Inicio rápido

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Roadmap

- [x] Módulo 1: Extracción de facturas PDF
- [ ] Módulo 2: Validación de contratos
- [ ] Módulo 3: Formularios inteligentes
- [ ] Módulo 4: Reportes y analytics
