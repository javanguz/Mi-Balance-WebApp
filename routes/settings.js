// routes/settings.js

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('../db/database');
const localBackupHelper = require('../utils/localBackupHelper');
const crypto = require('crypto');
const multer = require('multer');

// Configurar multer para guardar el archivo en el directorio temporal del sistema
const upload = multer({ dest: os.tmpdir() });

const LICENSE_FILE_PATH = path.resolve(__dirname, '../license.json');
const SECRET_KEY = 'tu-clave-secreta-para-generar-licencias'; 

const restartPageHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Reiniciando Aplicación</title>
        <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; text-align: center; padding: 50px; background-color: #f4f7f9; color: #333; }
            .container { max-width: 600px; margin: auto; padding: 2rem; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #0056b3; }
            .loader { border: 5px solid #f3f3f3; border-radius: 50%; border-top: 5px solid #3498db; width: 50px; height: 50px; -webkit-animation: spin 2s linear infinite; animation: spin 2s linear infinite; margin: 20px auto; }
            @-webkit-keyframes spin { 0% { -webkit-transform: rotate(0deg); } 100% { -webkit-transform: rotate(360deg); } }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Operación completada.</h1>
            <p>La aplicación se está reiniciando. Serás redirigido a la página de inicio de sesión en unos segundos.</p>
            <div class="loader"></div>
            <p>Si la redirección no funciona, <a href="/login">haz clic aquí</a>.</p>
        </div>
        <script>
            setTimeout(() => {
                window.location.href = '/login';
            }, 5000);
        </script>
    </body>
    </html>
`;

module.exports = function(requireLicense) {

    function getConfig() {
        const configPath = path.resolve(__dirname, '../config.json');
        const rawdata = fs.readFileSync(configPath);
        return JSON.parse(rawdata);
    }
    function saveConfig(config) {
        const configPath = path.resolve(__dirname, '../config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    function generateCorrectLicenseKey(username, cuit) {
        if (!username || !cuit) return null;
        return crypto.createHash('sha256').update(username + cuit + SECRET_KEY).digest('hex').substring(0, 32);
    }
    
    function gracefulRestart(req) {
        const server = req.app.get('server');
        const connections = req.app.get('connections');
    
        if (!server) {
            console.warn('No se pudo obtener la instancia del servidor. Usando process.exit() como fallback.');
            setTimeout(() => process.exit(1), 500);
            return;
        }
    
        console.log('Iniciando cierre programado del servidor...');
    
        if (connections) {
            console.log(`Destruyendo ${connections.size} conexiones abiertas.`);
            for (const connection of connections) {
                connection.destroy();
            }
        }
    
        server.close((err) => {
            if (err) {
                console.error('Error durante el cierre del servidor HTTP:', err);
                process.exit(1);
                return;
            }
            console.log('Servidor HTTP cerrado.');
            
            db.close((dbErr) => {
                if (dbErr) {
                    console.error('Error al cerrar la base de datos:', dbErr.message);
                } else {
                    console.log('Base de datos cerrada.');
                }
                
                console.log('Proceso finalizado. El gestor de procesos se encargará del reinicio.');
                process.exit(1);
            });
        });
    
        setTimeout(() => {
            console.error('El cierre del servidor tardó demasiado. Forzando salida.');
            process.exit(1);
        }, 5000).unref();
    }
    
    router.get('/database', (req, res, next) => {
        try {
            const localSettings = localBackupHelper.getSettings();
            const localBackups = localBackupHelper.listBackups(localSettings.path);
            res.render('database_management', {
                title: 'Gestionar Base de Datos',
                active_link: 'settings',
                status: req.query.status || null,
                localSettings: localSettings,
                localBackups: localBackups,
            });
        } catch (error) {
            next(error);
        }
    });
    
    router.post('/database/local/update-settings', requireLicense, (req, res, next) => {
        try {
            const { backupPath, mode, scheduleTime, retentionCount } = req.body;
            if (!backupPath) {
                return res.status(400).json({ success: false, message: 'La ruta de respaldo no puede estar vacía.' });
            }
            if (!fs.existsSync(backupPath)) {
                try {
                    fs.mkdirSync(backupPath, { recursive: true });
                } catch (mkdirError) {
                     return res.status(400).json({ success: false, message: 'No se pudo crear la carpeta. Verifique los permisos.' });
                }
            }
            
            localBackupHelper.saveSettings({
                path: backupPath,
                mode: mode || 'manual',
                scheduleTime: scheduleTime || '04:00',
                retentionCount: parseInt(retentionCount, 10) || 5,
            });

            res.json({ success: true, message: 'Configuración guardada. Reinicie la aplicación para aplicar los cambios en la programación de respaldos.' });
        } catch (error) {
            console.error("Error al guardar la configuración local:", error);
            res.status(500).json({ success: false, message: 'Error interno al guardar la configuración.' });
        }
    });
    
    router.post('/database/local/test-path', requireLicense, (req, res) => {
        try {
            const { backupPath } = req.body;
            if (!backupPath) {
                 return res.status(400).json({ success: false, message: 'La ruta no puede estar vacía.' });
            }
            fs.accessSync(backupPath, fs.constants.W_OK);
            res.json({ success: true, message: 'La ruta es válida y accesible.' });
        } catch (error) {
            res.status(400).json({ success: false, message: 'La ruta no existe o no tiene permisos de escritura.' });
        }
    });
    
    
    router.post('/database/local/backup', requireLicense, (req, res, next) => {
        try {
            localBackupHelper.createBackup();
            res.redirect('/settings/database?status=local_backup_success');
        } catch (error) {
            console.error('Error al crear respaldo local:', error);
            res.redirect('/settings/database?status=local_backup_error');
        }
    });
    
    router.post('/database/local/restore', requireLicense, (req, res, next) => {
        const { backupFilePath } = req.body;
        try {
            if (!fs.existsSync(backupFilePath)) throw new Error('El archivo de respaldo no existe.');
    
            req.app.locals.maintenanceMode = true;
            console.log("MODO MANTENIMIENTO ACTIVADO. La base de datos se cerrará para la restauración.");
    
            fs.copyFileSync(backupFilePath, path.resolve(__dirname, '../db/financiero.sqlite'));
            
            res.status(200).send(restartPageHtml);
            
            setTimeout(() => gracefulRestart(req), 500);

        } catch (error) {
            req.app.locals.maintenanceMode = false;
            console.error('Error al restaurar localmente:', error);
            res.redirect('/settings/database?status=local_restore_error');
        }
    });

    // ===============================================================
    // INICIO DE LA CORRECCIÓN: Ruta para restaurar desde archivo subido
    // ===============================================================
    router.post('/database/local/upload-restore', requireLicense, upload.single('backupFile'), (req, res, next) => {
        const uploadedFile = req.file;

        if (!uploadedFile) {
            return res.redirect('/settings/database?status=local_restore_error_no_file');
        }

        const tempPath = uploadedFile.path;
        const originalName = uploadedFile.originalname;
        const fileExtension = path.extname(originalName).toLowerCase();
        
        if (fileExtension !== '.sqlite') {
            fs.unlink(tempPath, (err) => {
                if (err) console.error("Error al eliminar archivo temporal inválido:", err);
            });
            return res.redirect('/settings/database?status=local_restore_error_invalid_file');
        }

        req.app.locals.maintenanceMode = true;
        console.log("MODO MANTENIMIENTO ACTIVADO. La base de datos se cerrará para la restauración desde archivo.");
        const dbPath = path.resolve(__dirname, '../db/financiero.sqlite');

        db.close((err) => {
            if (err) {
                console.error('Error al cerrar la base de datos antes de restaurar:', err.message);
                req.app.locals.maintenanceMode = false;
                fs.unlink(tempPath, () => {});
                return res.redirect('/settings/database?status=local_restore_error_db_close');
            }
            
            console.log('Base de datos cerrada para la restauración.');

            try {
                // Se reemplaza renameSync por copyFileSync y unlinkSync para evitar el error EPERM
                fs.copyFileSync(tempPath, dbPath);
                fs.unlinkSync(tempPath);
                
                res.status(200).send(restartPageHtml);
                
                console.log('Restauración desde archivo subido completa. Reiniciando el proceso...');
                setTimeout(() => process.exit(1), 500);

            } catch (copyError) {
                console.error('Error al copiar/eliminar el archivo de respaldo:', copyError);
                req.app.locals.maintenanceMode = false;
                res.status(500).send("<h1>Error Crítico</h1><p>No se pudo restaurar la base de datos debido a un error de archivo. Por favor, reinicie la aplicación manualmente.</p>");
                setTimeout(() => process.exit(1), 500);
            }
        });
    });
    // ===============================================================
    // FIN DE LA CORRECCIÓN
    // ===============================================================
    
    router.post('/database/local/delete-backup', requireLicense, (req, res, next) => {
        try {
            const { backupFilePath } = req.body;
            const settings = localBackupHelper.getSettings();
            const backupDir = path.resolve(settings.path);
            const resolvedBackupPath = path.resolve(backupFilePath);
            
            if (!resolvedBackupPath.startsWith(backupDir)) {
                 return res.status(403).json({ success: false, message: 'Acción no permitida. Intento de acceso fuera del directorio de respaldos.' });
            }
            
            if (fs.existsSync(resolvedBackupPath)) {
                fs.unlinkSync(resolvedBackupPath);
                res.json({ success: true, message: 'Respaldo eliminado con éxito.' });
            } else {
                res.status(404).json({ success: false, message: 'El archivo de respaldo no fue encontrado.' });
            }
        } catch (error) {
            console.error("Error al eliminar el respaldo:", error);
            res.status(500).json({ success: false, message: 'Error del servidor al intentar eliminar el respaldo.' });
        }
    });
    
    router.post('/restart-app', requireLicense, (req, res) => {
        res.status(200).json({ message: 'Comando de reinicio recibido.' });
        setTimeout(() => gracefulRestart(req), 100);
    });
    
    router.get('/database/verify', requireLicense, (req, res) => {
        res.render('database_verify_pin', {
            title: 'Confirmar Eliminación',
            error: null,
            active_link: ''
        });
    });
    
    router.post('/database/delete', requireLicense, (req, res, next) => {
        const { pin } = req.body;
        if (pin !== getConfig().APP_PIN) {
            return res.render('database_verify_pin', {
                title: 'Confirmar Eliminación',
                error: 'PIN incorrecto. La operación ha sido cancelada.',
                active_link: ''
            });
        }
        const dbPath = path.resolve(__dirname, '../db/financiero.sqlite');
    
        req.app.locals.maintenanceMode = true;
        console.log("MODO MANTENIMIENTO ACTIVADO. La base de datos se cerrará para el reseteo.");
    
        fs.unlink(dbPath, (unlinkErr) => {
            if (unlinkErr && unlinkErr.code !== 'ENOENT') {
                console.error("Error al eliminar el archivo de la BD:", unlinkErr);
                req.app.locals.maintenanceMode = false;
                return res.status(500).send('No se pudo eliminar el archivo de la base de datos.');
            }
            try {
                saveConfig({ APP_PIN: "1234", PIN_HINT: "" });
                res.status(200).send(restartPageHtml);
                gracefulRestart(req);
            } catch (saveErr) {
                req.app.locals.maintenanceMode = false;
                next(saveErr);
            }
        });
    });
    
    router.get('/api/license-status', (req, res) => {
        res.json({ 
            activated: res.locals.isLicensed,
            username: res.locals.username,
            cuit: res.locals.cuit
        });
    });
    
    router.post('/api/activate-license', (req, res) => {
        const { licenseKey, username, cuit } = req.body;
    
        if (!username || username.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre de usuario es obligatorio.' });
        }
        if (!cuit || cuit.trim() === '') {
            return res.status(400).json({ success: false, message: 'El CUIT es obligatorio.' });
        }
    
        const correctKey = generateCorrectLicenseKey(username.trim(), cuit.trim());
    
        if (licenseKey && licenseKey === correctKey) {
            const newLicense = { activated: true, key: licenseKey, username: username.trim(), cuit: cuit.trim() };
            fs.writeFileSync(LICENSE_FILE_PATH, JSON.stringify(newLicense, null, 2));
            
            res.json({ success: true, message: '¡Licencia activada con éxito!' });
        } else {
            res.status(400).json({ success: false, message: 'La clave de licencia es inválida para el usuario y CUIT ingresados.' });
        }
    });
    
    router.post('/api/delete-license', (req, res) => {
        if (!req.session.loggedin) {
            return res.status(401).json({ success: false, message: 'No autorizado.' });
        }
        try {
            if (fs.existsSync(LICENSE_FILE_PATH)) {
                fs.unlinkSync(LICENSE_FILE_PATH);
            }
            
            const config = getConfig();
            config.APP_PIN = "1234";
            config.PIN_HINT = "";
            saveConfig(config);
            console.log("PIN reseteado a 1234 por eliminación de licencia.");

            res.json({ success: true, message: 'Licencia eliminada con éxito.' });
        } catch (error) {
            console.error("Error al eliminar la licencia:", error);
            res.status(500).json({ success: false, message: 'No se pudo eliminar la licencia.' });
        }
    });

    return router;
};

