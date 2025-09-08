// routes/auth.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const configPath = path.resolve(__dirname, '../config.json');

// --- INICIO DE MODIFICACIÓN ---
// Se añade la clave secreta y la función para generar la clave de licencia,
// asegurando que sea idéntica a la utilizada en otras partes de la aplicación.
const SECRET_KEY = 'tu-clave-secreta-para-generar-licencias'; 

function generateCorrectLicenseKey(username, cuit) {
    if (!username || !cuit) return null;
    return crypto.createHash('sha256').update(username + cuit + SECRET_KEY).digest('hex').substring(0, 32);
}
// --- FIN DE MODIFICACIÓN ---

function getConfig() {
  if (process.env.APP_PIN) {
    return {
      APP_PIN: process.env.APP_PIN,
      PIN_HINT: process.env.PIN_HINT || ""
    };
  }
  try {
    const rawdata = fs.readFileSync(configPath);
    return JSON.parse(rawdata);
  } catch (error) {
    console.warn("WARN: config.json not found. Using default PIN 1234 for local dev.");
    if (process.env.NODE_ENV !== 'production') {
        fs.writeFileSync(configPath, JSON.stringify({ APP_PIN: "1234", PIN_HINT: "" }, null, 2));
    }
    return { APP_PIN: "1234", PIN_HINT: "" };
  }
}

function saveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getLocalIpAddress() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

router.get('/login', (req, res) => {
    const successMessage = req.query.success;
    const ip = getLocalIpAddress();
    const port = process.env.PORT || 3000;
    const config = getConfig();
    res.render('login', {
        error: null,
        success: successMessage,
        ip: ip,
        port: port,
        pinHint: res.locals.isLicensed ? config.PIN_HINT : null
    });
});

router.post('/login', (req, res) => {
    const { pin } = req.body;
    const config = getConfig();
    const pendingChange = req.session.pendingChange;
    const APP_PIN = config.APP_PIN;

    if (pendingChange && pendingChange.type === 'pin_recovery') {
        delete req.session.pendingChange;
        req.session.loggedin = true;
        return res.redirect('/inicio?forcePinChange=true');
    }
    
    if (pin === APP_PIN) {
        req.session.loggedin = true;
        req.session.forcePinChange = false;
        res.redirect('/inicio');
    } else {
        const ip = getLocalIpAddress();
        const port = process.env.PORT || 3000;
        res.render('login', {
            error: 'PIN incorrecto. Intente de nuevo.',
            success: null,
            ip: ip,
            port: port,
            pinHint: res.locals.isLicensed ? config.PIN_HINT : null
        });
    }
});

// --- INICIO DE MODIFICACIÓN ---
// Nueva ruta para gestionar la recuperación del PIN mediante la validación de la licencia.
router.post('/recover-by-license', (req, res) => {
    // Primero, se verifica si la aplicación tiene una licencia activa.
    if (!res.locals.isLicensed) {
        return res.status(403).json({ success: false, message: 'Esta función requiere una licencia activa en la aplicación.' });
    }

    const { username, cuit, licenseKey } = req.body;
    if (!username || !cuit || !licenseKey) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    const correctKey = generateCorrectLicenseKey(username.trim(), cuit.trim());

    if (licenseKey.trim() === correctKey) {
        // Si la clave es correcta, se realiza el mismo proceso que en la recuperación de emergencia.
        console.log("Acceso de emergencia por licencia activado. Restableciendo PIN a '1234'.");
        const config = getConfig();
        config.APP_PIN = "1234";
        config.PIN_HINT = "PIN restablecido por emergencia";
        saveConfig(config);
        
        req.session.loggedin = true;
        req.session.pinReset = true;
        res.json({ success: true });
    } else {
        // Si los datos no coinciden, se devuelve un error.
        res.status(400).json({ success: false, message: 'Los datos de la licencia son incorrectos.' });
    }
});
// --- FIN DE MODIFICACIÓN ---


router.get('/emergency-recovery', (req, res, next) => {
    try {
        console.log("Acceso de emergencia activado. Restableciendo PIN a '1234'.");
        const config = getConfig();
        config.APP_PIN = "1234";
        config.PIN_HINT = "PIN restablecido por emergencia";
        saveConfig(config);
        
        req.session.loggedin = true;
        req.session.pinReset = true;
        res.redirect('/inicio');
    } catch (error) {
        console.error("Error durante la recuperación de emergencia:", error);
        next(error);
    }
});

router.get('/reset-pin-1234', (req, res, next) => {
    if (!res.locals.isLicensed) {
        return res.status(403).send('<h1>Acción no permitida</h1><p>Se requiere una licencia activa para realizar esta operación.</p><a href="/login">Volver</a>');
    }
    try {
        const config = getConfig();
        config.APP_PIN = "1234";
        saveConfig(config);
        res.status(200).send('<h1>El PIN ha sido restablecido con éxito.</h1><a href="/login">Volver al Login</a>');
    } catch (error) {
        next(error);
    }
});

router.post('/settings/cambiar-pin', (req, res) => {
    if (!req.session.loggedin) {
        return res.status(401).json({ success: false, message: 'No ha iniciado sesión.' });
    }
    if (!res.locals.isLicensed) {
        return res.status(403).json({ success: false, message: 'Se requiere una licencia activa para cambiar el PIN.' });
    }
    const { current_pin, new_pin, confirm_new_pin, pin_hint } = req.body;
    const config = getConfig();
    const APP_PIN = config.APP_PIN;
    const fromRecovery = req.body.forcePinChange === 'true';

    if (!fromRecovery && current_pin !== APP_PIN) {
        return res.status(400).json({ success: false, message: 'El PIN actual ingresado es incorrecto.' });
    }
    if (!/^\d{4}$/.test(new_pin)) {
        return res.status(400).json({ success: false, message: 'El nuevo PIN debe tener 4 dígitos numéricos.' });
    }
    if (new_pin !== confirm_new_pin) {
        return res.status(400).json({ success: false, message: 'Los nuevos PINs no coinciden.' });
    }

    config.APP_PIN = new_pin;
    config.PIN_HINT = pin_hint || "";
    saveConfig(config);
    
    res.json({ success: true, message: 'PIN actualizado correctamente. Se cerrará la sesión.' });
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error al cerrar sesión:", err);
            return res.redirect('/inicio');
        }
        res.redirect('/login');
    });
});

module.exports = router;

