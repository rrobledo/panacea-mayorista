# Panacea Mayorista

Frontend SPA para gestión de remitos de Panacea Mayorista (panadería sin gluten).

## Stack

- React 19, Vite 8, React Router v7
- TanStack Table, React Hook Form, Zod
- Lucide React, Recharts
- Axios (HTTP)
- Backend: [panacea-mayorista-backend.vercel.app](https://panacea-mayorista-backend.vercel.app)

## Requisitos previos

- **Node.js 20.19+ o 22.12+** — Vite 8 no soporta versiones anteriores.
  Verificar con `node --version`. Si usás nvm: `nvm use 22`.
- npm 9+

## Instalación

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto con el siguiente contenido:

```env
VITE_API_URL=https://panacea-mayorista-backend.vercel.app
VITE_GOOGLE_CLIENT_ID=<tu_google_client_id>
VITE_ALLOWED_EMAILS=email1@ejemplo.com,email2@ejemplo.com
```

| Variable | Descripción |
|---|---|
| `VITE_API_URL` | URL base del backend (FastAPI en Vercel) |
| `VITE_GOOGLE_CLIENT_ID` | Client ID de Google OAuth (Google Cloud Console) |
| `VITE_ALLOWED_EMAILS` | Emails habilitados para ingresar, separados por coma |

> El archivo `.env.local` no se versiona. Pedirle el archivo al equipo o configurar las variables manualmente.

## Ejecución en desarrollo

```bash
npm run dev
```

La app queda disponible en [http://localhost:5173](http://localhost:5173).

## Build de producción

```bash
npm run build
```

Los archivos estáticos se generan en `dist/`. Para previsualizarlos localmente:

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Autenticación

El login usa **Google Identity Services (GIS)**. Al ingresar a la app se muestra la pantalla de login con el botón "Iniciar sesión con Google". Solo pueden acceder los emails listados en `VITE_ALLOWED_EMAILS`.

No se requiere ningún token ni header adicional para consumir el backend — la autenticación es exclusivamente del lado del frontend.

## Funcionalidades principales

| Ruta | Descripción |
|---|---|
| `/remitos/nuevo` | Carga de nuevo remito |
| `/remitos/consulta` | Consulta y seguimiento de remitos con filtros |
| `/remitos/:id` | Detalle y edición de un remito |
| `/reports/pendientes` | Reporte de pendientes por día (vista semanal imprimible) |
