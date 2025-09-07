// routes/index.js
const express = require('express');
const router = express.Router();

// Importar todas las rutas
const authRoutes = require('./auth');
const inicioRoutes = require('./inicio');
const registroRoutes = require('./registro');

// Las rutas que dependen de `requireLicense` necesitan ser inicializadas con esa función
const ventaRoutes = require('./venta');
const pagoRoutes = require('./pago');
const reportesRoutes = require('./reportes');
const settingsRoutes = require('./settings');

/**
 * Centraliza el registro de todas las rutas de la aplicación.
 * @param {object} app - La instancia de la aplicación Express.
 * @param {Function} requireLogin - Middleware para verificar que el usuario ha iniciado sesión.
 * @param {Function} requireLicense - Middleware para verificar que hay una licencia activa.
 */
module.exports = function(app, requireLogin, requireLicense) {
    // Rutas públicas o con su propia lógica de autenticación
    app.use('/', authRoutes);

    // Rutas que requieren que el usuario esté logueado
    app.use('/inicio', requireLogin, inicioRoutes);
    app.use('/registro', requireLogin, registroRoutes);

    // Rutas que requieren login y licencia activa
    app.use('/venta', requireLogin, ventaRoutes(requireLicense));
    app.use('/pago', requireLogin, pagoRoutes(requireLicense));
    app.use('/reportes', requireLogin, reportesRoutes(requireLicense));
    app.use('/settings', requireLogin, settingsRoutes(requireLicense));

    // Ruta raíz para redirigir según el estado de la sesión
    app.get('/', (req, res) => {
        if (req.session.loggedin) {
            res.redirect('/inicio');
        } else {
            res.redirect('/login');
        }
    });
};
