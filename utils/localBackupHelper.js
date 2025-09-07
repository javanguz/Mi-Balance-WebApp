// utils/localBackupHelper.js

const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS_PATH = path.resolve(__dirname, '../local_backup_settings.json');
const DB_PATH = path.resolve(__dirname, '../db/financiero.sqlite');

function getSettings() {
    if (fs.existsSync(SETTINGS_PATH)) {
        const data = fs.readFileSync(SETTINGS_PATH);
        return JSON.parse(data);
    }
    const defaultPath = path.join(os.homedir(), 'Documents', 'GestionSimpleBackups');
    const defaults = { path: defaultPath, mode: 'manual', retentionCount: 5, scheduleTime: '04:00' };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function listBackups(backupPath) {
    if (!backupPath || !fs.existsSync(backupPath)) {
        return [];
    }
    const files = fs.readdirSync(backupPath);
    return files
        .filter(file => file.startsWith('backup-local-') && file.endsWith('.sqlite'))
        .map(file => {
            const filePath = path.join(backupPath, file);
            return {
                name: file,
                path: filePath,
                createdTime: fs.statSync(filePath).mtime
            };
        })
        .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
}

function cleanupOldBackups(settings) {
    const backups = listBackups(settings.path);
    const maxBackups = parseInt(settings.retentionCount, 10);

    if (isNaN(maxBackups) || maxBackups < 1) {
        console.log('Retención de respaldos no configurada o inválida. No se eliminarán respaldos antiguos.');
        return;
    }

    if (backups.length > maxBackups) {
        const backupsToDelete = backups.slice(maxBackups);
        console.log(`Limpiando respaldos locales. Se eliminarán ${backupsToDelete.length}.`);
        for (const file of backupsToDelete) {
            try {
                fs.unlinkSync(file.path);
                console.log(`Respaldo local antiguo eliminado: ${file.name}`);
            } catch (error) {
                console.error(`Error al eliminar el respaldo local ${file.name}:`, error);
            }
        }
    }
}

function createBackup() {
    const settings = getSettings();
    if (!settings.path) {
        throw new Error('La ruta para los respaldos locales no está configurada.');
    }
    if (!fs.existsSync(settings.path)) {
        fs.mkdirSync(settings.path, { recursive: true });
        console.log(`Carpeta de respaldo local creada en: ${settings.path}`);
    }

    // ===============================================================
    // INICIO DE LA CORRECCIÓN: Se genera el timestamp usando la hora local
    // en lugar de la hora universal (UTC) para que coincida con la hora del usuario.
    // ===============================================================
    const pad = (num) => num.toString().padStart(2, '0');
    const now = new Date();
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const fileName = `backup-local-${timestamp}.sqlite`;
    // ===============================================================
    // FIN DE LA CORRECCIÓN
    // ===============================================================

    const backupFilePath = path.join(settings.path, fileName);
    
    fs.copyFileSync(DB_PATH, backupFilePath);
    console.log(`Respaldo local creado con éxito: ${fileName}`);
    cleanupOldBackups(settings);
    return true;
}

module.exports = {
    getSettings,
    saveSettings,
    listBackups,
    createBackup
};
