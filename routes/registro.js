// routes/registro.js

const express = require('express');
const router = express.Router();
const Consultas = require('../db/consultas');

router.get('/', async (req, res, next) => {
    try {
        const pagina = req.query.pagina || 1;
        const { tipo, busqueda, fecha_desde, fecha_hasta } = req.query;

        const resultados = await Consultas.getMovimientosPaginados({
            pagina,
            porPagina: 10,
            tipo,
            busqueda,
            fechaDesde: fecha_desde,
            fechaHasta: fecha_hasta
        });
        // Se crea una copia de los filtros y se elimina el parámetro 'update'
        // para que no se incluya en los enlaces de paginación.
        const filtrosParaPlantilla = { ...req.query };
        delete filtrosParaPlantilla.update;

        res.render('registro', {
            title: 'Registro de movimientos',
            active_link: 'registro',
            movimientos: resultados.movimientos,
            paginaActual: resultados.pagina,
            totalPaginas: resultados.totalPaginas,
            filtros: filtrosParaPlantilla // Se usan los filtros limpios
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;