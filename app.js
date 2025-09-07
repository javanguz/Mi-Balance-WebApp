// app.js

require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const db = require('./db/database');
const cron = require('node-cron');
const fs = require('fs');
const localBackupHelper = require('./utils/localBackupHelper');

// ===============================================================
// INICIO DE LA MEJORA: Centralización de formateadores y rutas
// ===============================================================
const formatters = require('./utils/formatters');
const initializeRoutes = require('./routes');
// ===============================================================
// FIN DE LA MEJORA
// ===============================================================

const app = express();
const PORT = process.env.PORT || 3000;

app.locals.maintenanceMode = false;

// ===============================================================
// INICIO DE LA MEJORA: Lógica de formato de moneda unificada
// ===============================================================
// Todas las funciones de formato ahora están disponibles en `app.locals`
Object.assign(app.locals, formatters);
// ===============================================================
// FIN DE LA MEJORA
// ===============================================================


// ===============================================================
// LÓGICA Y MIDDLEWARE DE LICENCIA (REFACTORIZADO)
// ===============================================================
const SECRET_KEY = 'tu-clave-secreta-para-generar-licencias'; 

// Helper para generar la clave
function generateCorrectLicenseKey(username, cuit) {
    if (!username || !cuit) return null;
    return crypto.createHash('sha256').update(username + cuit + SECRET_KEY).digest('hex').substring(0, 32);
}

// Función que lee y valida la licencia. Devuelve un objeto con el estado.
function getLicenseState() {
    const LICENSE_FILE_PATH = path.resolve(__dirname, 'license.json');
    const defaultState = {
        username: 'Usuario sin licencia',
        cuit: 'N/A',
        isLicensed: false
    };

    if (!fs.existsSync(LICENSE_FILE_PATH)) {
        return defaultState;
    }
    try {
        const licenseData = JSON.parse(fs.readFileSync(LICENSE_FILE_PATH, 'utf-8'));
        const correctKey = generateCorrectLicenseKey(licenseData.username, licenseData.cuit);
        if (licenseData.activated && licenseData.key === correctKey && licenseData.cuit) {
            return {
                username: licenseData.username,
                cuit: licenseData.cuit,
                isLicensed: true
            };
        }
        return defaultState;
    } catch (error) {
        console.error("Error al leer o validar el archivo de licencia:", error);
        return defaultState;
    }
}

// Middleware para verificar el estado de la licencia en CADA petición
const checkLicenseStatus = (req, res, next) => {
    const licenseState = getLicenseState();
    // Inyecta el estado de la licencia en res.locals para que esté
    // disponible automáticamente en todas las plantillas EJS de esta petición.
    res.locals.isLicensed = licenseState.isLicensed;
    res.locals.username = licenseState.username;
    res.locals.cuit = licenseState.cuit;
    next();
};

// Middleware para proteger rutas que requieren una licencia activa
const requireLicense = (req, res, next) => {
    if (!res.locals.isLicensed) { // Usamos res.locals que es actualizado en cada request
        if (req.get('Content-Type') === 'application/json' || req.path.startsWith('/api/')) {
            return res.status(403).json({ success: false, message: 'Acción no permitida. Se requiere una licencia activa.' });
        }
        return res.status(403).send('<h1>Acción no permitida</h1><p>Se requiere una licencia activa para realizar esta operación.</p>');
    }
    next();
};

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
    app.set('trust proxy', 1);
}

// ===============================================================
// CONFIGURACIÓN DE SESIÓN
// ===============================================================
app.use(session({
    secret: 'un-secreto-muy-secreto-para-la-sesion',
    resave: false,
    saveUninitialized: false,
    rolling: true, 
    cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// APLICAR EL MIDDLEWARE DE LICENCIA GLOBALMENTE
// Se ejecuta después de la sesión y antes de las rutas para que esté disponible en todos lados.
app.use(checkLicenseStatus);

// ===============================================================
// LÓGICA DE RESPALDOS AUTOMÁTICOS MEJORADA
// ===============================================================

const cronTasks = new Map();

function scheduleBackup(cronExpression) {
    if (cronTasks.has('localBackup')) {
        cronTasks.get('localBackup').stop();
        console.log('Tarea de respaldo anterior detenida.');
    }
    
    console.log(`Programando respaldo local con la expresión cron: "${cronExpression}"`);
    const task = cron.schedule(cronExpression, () => {
        console.log('Ejecutando respaldo local programado...');
        try {
            localBackupHelper.createBackup();
        } catch (error) {
            console.error('Falló el respaldo local programado:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Argentina/Buenos_Aires"
    });

    cronTasks.set('localBackup', task);
}

function setupAutomaticBackups() {
    const settings = localBackupHelper.getSettings();
    if (!settings.path) {
        console.log('No hay ruta de respaldos configurada. Se omiten los respaldos automáticos.');
        return;
    }
    
    if (settings.mode === 'manual' || settings.mode === 'startup') {
        if (cronTasks.has('localBackup')) {
            cronTasks.get('localBackup').stop();
            cronTasks.delete('localBackup');
            console.log('Tareas de respaldo cron detenidas por configuración manual/startup.');
        }
        console.log(`Modo de respaldo actual: "${settings.mode}". No se programan tareas cron.`);
        return;
    }

    const [hour, minute] = (settings.scheduleTime || '04:00').split(':');
    let cronExpression = '';

    switch (settings.mode) {
        case 'daily':
            cronExpression = `${minute} ${hour} * * *`;
            break;
        case 'weekdays':
            cronExpression = `${minute} ${hour} * * 1-5`;
            break;
        default:
            console.log(`Modo de respaldo "${settings.mode}" no reconocido. No se programan tareas.`);
            return;
    }
    
    scheduleBackup(cronExpression);
}

function runBackupOnStartup() {
    const settings = localBackupHelper.getSettings();
    if (settings.mode === 'startup' && settings.path) {
        console.log('Modo de respaldo "al iniciar". Ejecutando respaldo en 10 segundos...');
        setTimeout(() => {
            try {
                localBackupHelper.createBackup();
            } catch (error) {
                console.error('Falló el respaldo "al iniciar":', error);
            }
        }, 10000); 
    }
}

// ===============================================================
// CONFIGURACIÓN DE EXPRESS
// ===============================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===============================================================
// MIDDLEWARE DE MODO DE MANTENIMIENTO
// ===============================================================
app.use((req, res, next) => {
    if (app.locals.maintenanceMode) {
        return res.status(503).send(`
            <html lang="es">
                <head><title>Mantenimiento</title></head>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                    <h1>Servidor en Mantenimiento</h1>
                    <p>La aplicación se está reiniciando debido a una operación de base de datos. Por favor, espere un momento y vuelva a intentarlo.</p>
                </body>
            </html>
        `);
    }
    next();
});

// ===============================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ===============================================================
function requireLogin(req, res, next) {
    if (req.session.loggedin) {
        return next();
    }
    
    const isApiCall = req.get('Content-Type') === 'application/json';

    if (isApiCall) {
        return res.status(401).json({ success: false, message: 'Sesión expirada. Por favor, inicie sesión de nuevo.' });
    } else {
        return res.redirect('/login');
    }
}

// ===============================================================
// INICIO DE LA MEJORA: INICIALIZACIÓN DE RUTAS CENTRALIZADA
// ===============================================================
initializeRoutes(app, requireLogin, requireLicense);
// ===============================================================
// FIN DE LA MEJORA
// ===============================================================


// ===============================================================
// MANEJO DE ERRORES
// ===============================================================
function errorHandler(err, req, res, next) {
    console.error("ERROR DETECTADO:", err.stack);
    const statusCode = err.statusCode || 500;
    const errorResponse = {
        success: false,
        message: err.message || 'Ocurrió un error inesperado en el servidor.'
    };
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = err.stack;
    }
    res.status(statusCode).json(errorResponse);
}
app.use(errorHandler);

// ===============================================================
// INICIO DEL SERVIDOR
// ===============================================================
const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    setupAutomaticBackups();
    runBackupOnStartup();
});

// ===============================================================
// GESTIÓN DE CIERRE GRÁCIL
// ===============================================================
const connections = new Set();
server.on('connection', (connection) => {
    connections.add(connection);
    connection.on('close', () => {
        connections.delete(connection);
    });
});

app.set('server', server);
app.set('connections', connections);
