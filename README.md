<!-- README.md - Instrucciones del proyecto -->
# Gestión Financiera Simple

Esta es una aplicación web base construida con Node.js, Express, EJS y SQLite para una gestión financiera personal o de un pequeño negocio.

## Funcionalidades

* **Login Seguro:** Acceso mediante un PIN de 4 dígitos.
* **Gestión de Clientes:** CRUD completo (Crear, Leer, Actualizar, Borrar).
* **Gestión de Proveedores:** CRUD completo.
* **Registro de Movimientos:** Carga de ingresos y egresos, asociándolos opcionalmente a un cliente o proveedor.
* **Filtros:** Búsqueda de movimientos por fecha y tipo.
* **Reportes Avanzados:** Generación de reportes por período con exportación a **PDF** y **Excel**.
* **Gráficos Dinámicos:** Visualización de totales mensuales en reportes de más de 60 días.

## Estructura del Proyecto

```
/finanzas-app
│
├── /views          ← Páginas HTML dinámicas (EJS) con layouts
├── /public         ← CSS y JS estáticos
├── /routes         ← Rutas organizadas por módulo (clientes, auth, etc.)
├── /db             ← Archivo de la base de datos SQLite
│
├── app.js          ← Punto de entrada de la app y configuración principal
├── package.json    ← Dependencias y scripts
└── README.md       ← Este archivo
```

## Cómo Empezar

### Prerrequisitos

* Tener instalado [Node.js](https://nodejs.org/) (versión 16 o superior).

### Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO_EN_GITHUB>
    cd finanzas-app
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura el PIN (Opcional):**
    Por defecto, el PIN es `1234`. Puedes cambiarlo en el archivo `routes/auth.js`. Para producción, se recomienda usar una variable de entorno `APP_PIN`.

### Ejecutar la Aplicación

* **Para desarrollo (con recarga automática):**
    ```bash
    npm run dev
    ```
* **Para producción:**
    ```bash
    npm start
    ```

La aplicación estará disponible en `http://localhost:3000`.

## Despliegue en Render.com

Esta aplicación está lista para ser desplegada en Render.

1.  **Sube tu código a un repositorio de GitHub.**
2.  En tu dashboard de Render, crea un **"New Web Service"**.
3.  Conecta tu repositorio de GitHub.
4.  Render detectará automáticamente que es una aplicación de Node.js. Asegúrate de que la configuración sea:
    * **Build Command:** `npm install`
    * **Start Command:** `npm start`
5.  ¡Haz clic en "Create Web Service" y listo! Render desplegará tu aplicación y te dará una URL pública. La base de datos SQLite se creará en el sistema de archivos de Render.