# Panacea Mayorista

Frontend SPA para gestión de remitos de Panacea Bakery Gluten Free (panadería sin gluten).

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

## Funcionalidades

### Remitos

| Ruta | Descripción |
|---|---|
| `/remitos/nuevo` | Carga de nuevo remito: selección de cliente, productos, fecha de entrega y vendedor |
| `/remitos/consulta` | Consulta de remitos con filtros por fecha, cliente y estado; permite eliminar remitos |
| `/remitos/:id` | Detalle y edición de un remito: datos del cliente, productos con cantidad y entregado, cambio de estado, impresión |

**Detalle de remito — impresión:** el botón "Imprimir" genera una hoja con dos copias (ORIGINAL y DUPLICADO) apiladas verticalmente, listas para imprimir en A4 y recortar.

### Reportes

| Ruta | Descripción |
|---|---|
| `/reports/pendientes` | Pendientes por día: tabla semanal de remitos pendientes por cliente y fecha de entrega; imprimible |
| `/reports/productos-pendientes` | Productos pendientes por día: tabla semanal de unidades a producir por producto; clic en un día muestra el detalle agrupado por responsable, con opción de impresión |

Ambos reportes cargan automáticamente la semana actual (lunes a domingo) y permiten cambiar el período.

### Entidades

| Ruta | Descripción |
|---|---|
| `/products` | Catálogo de productos con filtro "Solo habilitados" y búsqueda integrada |
| `/customers` | Listado de clientes con filtro "Solo activos" y búsqueda integrada |
