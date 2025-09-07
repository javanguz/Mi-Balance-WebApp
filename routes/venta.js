// routes/venta.js

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const Consultas = require('../db/consultas');

module.exports = function(requireLicense) {
    router.get('/', async (req, res, next) => {
        try {
            const { cliente_id } = req.query;
            let clienteSeleccionado = null;
            if (cliente_id) {
                clienteSeleccionado = await Consultas.dbGetAsync(`SELECT id, nombre, categoria_id FROM clientes WHERE id = ?`, [cliente_id]);
            }
            const [categorias, modalidades] = await Promise.all([
                Consultas.getCategoriasPorTipo('cliente'),
                Consultas.getModalidades()
            ]);
            res.render('venta', {
                title: 'Carga de Ingresos',
                active_link: 'venta',
                categorias,
                modalidades,
                movimiento: null,
                clienteSeleccionado: clienteSeleccionado,
                returnToReport: false,
                returnToRegistro: false,
                returnQuery: ''
            });
        } catch (err) {
            next(err);
        }
    });

    router.get('/editar/:id', async (req, res, next) => {
        try {
            const movimiento = await Consultas.getMovimientoPorId(req.params.id);
            if (!movimiento) return res.status(404).send("Movimiento no encontrado");
            const [cliente, categorias, modalidades] = await Promise.all([
                Consultas.getClientePorId(movimiento.entidad_id),
                Consultas.getCategoriasPorTipo('cliente'),
                Consultas.getModalidades()
            ]);
            const returnToRegistro = req.query.from === 'registro';
            const queryParams = { ...req.query };
            delete queryParams.from;
            const returnQuery = new URLSearchParams(queryParams).toString();
            res.render('venta', {
                title: 'Editar Ingreso',
                active_link: 'venta',
                movimiento,
                clienteSeleccionado: cliente,
                categorias,
                modalidades,
                returnToReport: req.query.from === 'report',
                returnToRegistro,
                returnQuery
            });
        } catch (err) {
            next(err);
        }
    });

    router.post('/editar/:id', requireLicense, async (req, res, next) => {
        try {
            const { fecha, importe, cliente_id, modalidad, categoria_id, comentarios, returnToReport, returnToRegistro, returnQuery, es_ajuste } = req.body;
            if (!categoria_id) return res.status(400).json({ success: false, message: 'El campo Categoría es obligatorio.' });
            
            const tipo = 'ingreso';
            const monto = es_ajuste ? -Math.abs(parseFloat(importe)) : Math.abs(parseFloat(importe));

            const sql = `UPDATE movimientos SET fecha = ?, monto = ?, entidad_id = ?, modalidad = ?, descripcion = ?, tipo = ?, categoria_id = ? WHERE id = ?`;
            await Consultas.dbRunAsync(sql, [fecha, monto, cliente_id, modalidad, comentarios, tipo, categoria_id, req.params.id]);
            
            if (returnToRegistro === 'true') return res.json({ success: true, redirectTo: `/registro?${returnQuery}&update=success` });
            if (returnToReport === 'true') return res.json({ success: true, redirectTo: `/reportes/generar?${returnQuery}&update=success` });
            res.json({ success: true, message: 'Venta actualizada con éxito' });
        } catch (err) {
            next(err);
        }
    });

    router.post('/', requireLicense, async (req, res, next) => {
        try {
            const { fecha, importe, cliente_id, modalidad, categoria_id, comentarios, es_ajuste } = req.body;
            if (!fecha || !importe || !cliente_id || !modalidad || !categoria_id) return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
            
            const tipo = 'ingreso';
            const monto = es_ajuste ? -Math.abs(parseFloat(importe)) : Math.abs(parseFloat(importe));
            
            const sql = `INSERT INTO movimientos (fecha, monto, tipo, entidad_id, entidad_tipo, modalidad, categoria_id, descripcion) VALUES (?, ?, ?, ?, 'cliente', ?, ?, ?)`;
            await Consultas.dbRunAsync(sql, [fecha, monto, tipo, cliente_id, modalidad, categoria_id, comentarios]);
            res.status(201).json({ success: true, message: 'Venta guardada con éxito.' });
        } catch (err) {
            next(err);
        }
    });

    router.get('/api/clientes', async (req, res, next) => {
        try {
            const query = req.query.q;
            if (!query) return res.json([]);
            const sql = `SELECT id, nombre, cuit, categoria_id FROM clientes WHERE nombre LIKE ? OR id LIKE ? OR cuit LIKE ? LIMIT 10`;
            const rows = await Consultas.dbAllAsync(sql, [`%${query}%`, `%${query}%`, `%${query}%`]);
            res.json(rows);
        } catch (err) {
            next(err);
        }
    });

    router.get('/api/clientes/recientes', async (req, res, next) => {
        try {
            const sql = `SELECT c.id, c.nombre, c.categoria_id FROM clientes c JOIN (SELECT entidad_id, MAX(fecha) as last_mov_date FROM movimientos WHERE entidad_tipo = 'cliente' GROUP BY entidad_id) m ON c.id = m.entidad_id ORDER BY m.last_mov_date DESC LIMIT 3`;
            const rows = await Consultas.dbAllAsync(sql);
            res.json(rows);
        } catch (err) {
            next(err);
        }
    });

    router.get('/api/clientes/todos', async (req, res, next) => {
        try {
            const sql = `SELECT id, nombre, categoria_id FROM clientes ORDER BY nombre ASC`;
            const rows = await Consultas.dbAllAsync(sql);
            res.json(rows);
        } catch (err) {
            next(err);
        }
    });

    router.get('/api/clientes/:id', async (req, res, next) => {
        try {
            const row = await Consultas.getClientePorId(req.params.id);
            res.json(row);
        } catch (err) {
            next(err);
        }
    });

    router.post('/api/clientes', requireLicense, async (req, res, next) => {
        try {
            const { nombre, cuit, telefono, email, comentarios, categoria_id } = req.body;
            if (!nombre || !cuit) return res.status(400).json({ success: false, message: 'Nombre y CUIT son obligatorios.' });
            if (!/^\d+$/.test(cuit)) return res.status(400).json({ success: false, message: 'El CUIT/DNI solo debe contener números.' });
            const row = await Consultas.dbGetAsync(`SELECT MAX(id) as maxId FROM clientes`);
            const newId = (row.maxId || 10000) + 1;
            const sql = `INSERT INTO clientes (id, nombre, cuit, telefono, email, observaciones, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
            await Consultas.dbRunAsync(sql, [newId, nombre, cuit, telefono, email, comentarios, categoria_id]);
            res.status(201).json({ success: true, newCliente: { id: newId, nombre, categoria_id } });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ success: false, message: 'Ya existe un cliente con ese CUIT/DNI.' });
            next(err);
        }
    });

    router.put('/api/clientes/:id', requireLicense, async (req, res, next) => {
        try {
            const { nombre, cuit, telefono, email, comentarios, categoria_id } = req.body;
            if (!nombre || !cuit) return res.status(400).json({ success: false, message: 'Nombre y CUIT son obligatorios.' });
            if (!/^\d+$/.test(cuit)) return res.status(400).json({ success: false, message: 'El CUIT/DNI solo debe contener números.' });
            const sql = `UPDATE clientes SET nombre = ?, cuit = ?, telefono = ?, email = ?, observaciones = ?, categoria_id = ? WHERE id = ?`;
            await Consultas.dbRunAsync(sql, [nombre, cuit, telefono, email, comentarios, categoria_id, req.params.id]);
            res.json({ success: true, updatedCliente: { id: parseInt(req.params.id), nombre } });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ success: false, message: 'Ya existe un cliente con ese CUIT/DNI.' });
            next(err);
        }
    });

    router.delete('/api/clientes/:id', requireLicense, (req, res, next) => {
        db.serialize(async () => {
            try {
                await Consultas.dbRunAsync('BEGIN TRANSACTION');
                await Consultas.dbRunAsync(`DELETE FROM movimientos WHERE entidad_id = ? AND entidad_tipo = 'cliente'`, [req.params.id]);
                await Consultas.dbRunAsync(`DELETE FROM clientes WHERE id = ?`, [req.params.id]);
                await Consultas.dbRunAsync('COMMIT');
                res.json({ success: true, message: 'Cliente y sus movimientos han sido eliminados.' });
            } catch (err) {
                await Consultas.dbRunAsync('ROLLBACK');
                next(err);
            }
        });
    });

    router.get('/api/clientes/:id/movimientos', async (req, res, next) => {
        try {
            const [cliente, movimientos] = await Promise.all([
                Consultas.dbGetAsync(`SELECT id, nombre FROM clientes WHERE id = ?`, [req.params.id]),
                Consultas.dbAllAsync(`SELECT m.id, m.fecha, m.modalidad, m.tipo, m.monto, m.descripcion as comentarios, c.nombre as categoria_nombre FROM movimientos m LEFT JOIN categorias c ON m.categoria_id = c.id WHERE m.entidad_id = ? AND m.entidad_tipo = 'cliente' ORDER BY m.fecha DESC, m.id DESC LIMIT 7`, [req.params.id])
            ]);
            if (!cliente) return res.status(404).json({ message: 'Cliente no encontrado' });
            res.render('partials/_historial_reciente_ingresos', { movimientos, clienteSeleccionado: cliente }, (err, html) => {
                if (err) return next(err);
                res.json({ html });
            });
        } catch (err) {
            next(err);
        }
    });

    router.delete('/api/movimientos/:id', requireLicense, async (req, res, next) => {
        try {
            await Consultas.eliminarMovimientoPorId(req.params.id);
            res.json({ success: true, message: 'Movimiento eliminado' });
        } catch (err) {
            next(err);
        }
    });

    router.get('/api/categorias/all', async (req, res, next) => {
        try {
            const rows = await Consultas.dbAllAsync("SELECT id, nombre, tipo, es_editable FROM categorias ORDER BY nombre");
            res.json(rows);
        } catch (err) {
            next(err);
        }
    });

    router.get('/api/categorias', async (req, res, next) => {
        try {
            const { tipo } = req.query;
            if (!tipo) return res.status(400).json({ error: 'El tipo es requerido' });
            const rows = await Consultas.getCategoriasPorTipo(tipo);
            res.json(rows);
        } catch (err) {
            next(err);
        }
    });

    router.post('/api/categorias', requireLicense, async (req, res, next) => {
        try {
            const { nombre, tipo } = req.body;
            if (!nombre || !tipo) return res.status(400).json({ success: false, message: 'Nombre y tipo son requeridos' });
            const existing = await Consultas.dbGetAsync("SELECT id FROM categorias WHERE lower(nombre) = lower(?)", [nombre]);
            if (existing) {
                return res.status(409).json({ success: false, message: 'Ya existe una categoría con ese nombre.' });
            }
            const result = await Consultas.dbRunAsync("INSERT INTO categorias (nombre, tipo) VALUES (?, ?)", [nombre, tipo]);
            res.status(201).json({ success: true, newCategoria: { id: result.lastID, nombre, tipo } });
        } catch (err) {
            next(err);
        }
    });

    router.put('/api/categorias/:id', requireLicense, async (req, res, next) => {
        try {
            const { nombre } = req.body;
            if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
            const existing = await Consultas.dbGetAsync("SELECT id FROM categorias WHERE lower(nombre) = lower(?) AND id != ?", [nombre, req.params.id]);
            if (existing) {
                return res.status(409).json({ success: false, message: 'Ya existe otra categoría con ese nombre.' });
            }
            const result = await Consultas.dbRunAsync("UPDATE categorias SET nombre = ? WHERE id = ? AND es_editable = 1", [nombre, req.params.id]);
            if (result.changes === 0) return res.status(404).json({ success: false, message: 'Categoría no encontrada o no es editable.' });
            res.json({ success: true, message: 'Categoría actualizada.' });
        } catch (err) {
            next(err);
        }
    });

    router.delete('/api/categorias/:id', requireLicense, async (req, res, next) => {
        db.serialize(async () => {
            try {
                await Consultas.dbRunAsync('BEGIN TRANSACTION');
                const categoria = await Consultas.dbGetAsync("SELECT tipo FROM categorias WHERE id = ?", [req.params.id]);
                if (!categoria) {
                    throw new Error('Categoría no encontrada.');
                }
                const defaultCategoryName = 'Ingresos sin categoría';
                const defaultCategory = await Consultas.dbGetAsync("SELECT id FROM categorias WHERE nombre = ? AND tipo = ?", [defaultCategoryName, categoria.tipo]);
                if (!defaultCategory) {
                    throw new Error(`La categoría por defecto "${defaultCategoryName}" no fue encontrada.`);
                }
                await Consultas.dbRunAsync("UPDATE movimientos SET categoria_id = ? WHERE categoria_id = ?", [defaultCategory.id, req.params.id]);
                const result = await Consultas.dbRunAsync("DELETE FROM categorias WHERE id = ? AND es_editable = 1", [req.params.id]);
                if (result.changes === 0) {
                    await Consultas.dbRunAsync('ROLLBACK');
                    return res.status(404).json({ success: false, message: 'Categoría no encontrada o no se puede eliminar.' });
                }
                await Consultas.dbRunAsync('COMMIT');
                res.json({ success: true, message: 'Categoría eliminada. Los movimientos asociados fueron reasignados.' });
            } catch (err) {
                await Consultas.dbRunAsync('ROLLBACK');
                next(err);
            }
        });
    });

    router.get('/api/modalidades', async (req, res, next) => {
        try {
            const rows = await Consultas.getModalidades();
            res.json(rows);
        } catch (err) {
            next(err);
        }
    });

    router.post('/api/modalidades', requireLicense, async (req, res, next) => {
        try {
            const { nombre } = req.body;
            if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
            const result = await Consultas.dbRunAsync("INSERT INTO modalidades (nombre, es_editable) VALUES (?, 1)", [nombre]);
            res.status(201).json({ success: true, newModalidad: { id: result.lastID, nombre, es_editable: 1 } });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ success: false, message: 'Esa modalidad ya existe.' });
            next(err);
        }
    });

    router.put('/api/modalidades/:id', requireLicense, async (req, res, next) => {
        try {
            const { nombre } = req.body;
            if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
            const original = await Consultas.dbGetAsync("SELECT nombre FROM modalidades WHERE id = ? AND es_editable = 1", [req.params.id]);
            if (!original) return res.status(404).json({ success: false, message: 'Modalidad no encontrada o no es editable.' });
            await Consultas.dbRunAsync('BEGIN TRANSACTION');
            await Consultas.dbRunAsync("UPDATE movimientos SET modalidad = ? WHERE modalidad = ?", [nombre, original.nombre]);
            await Consultas.dbRunAsync("UPDATE modalidades SET nombre = ? WHERE id = ?", [nombre, req.params.id]);
            await Consultas.dbRunAsync('COMMIT');
            res.json({ success: true, message: 'Modalidad actualizada.' });
        } catch (err) {
            await Consultas.dbRunAsync('ROLLBACK');
            if (err.code === 'SQLITE_CONSTRAINT') return res.status(409).json({ success: false, message: 'Ese nombre de modalidad ya existe.' });
            next(err);
        }
    });

    router.delete('/api/modalidades/:id', requireLicense, async (req, res, next) => {
        try {
            const modality = await Consultas.dbGetAsync("SELECT nombre, es_editable FROM modalidades WHERE id = ?", [req.params.id]);
            if (!modality) return res.status(404).json({ success: false, message: 'Modalidad no encontrada.' });
            if (modality.es_editable === 0) return res.status(400).json({ success: false, message: 'Esta modalidad no se puede eliminar.' });
            await Consultas.dbRunAsync('BEGIN TRANSACTION');
            await Consultas.dbRunAsync("UPDATE movimientos SET modalidad = 'Efectivo' WHERE modalidad = ?", [modality.nombre]);
            await Consultas.dbRunAsync("DELETE FROM modalidades WHERE id = ?", [req.params.id]);
            await Consultas.dbRunAsync('COMMIT');
            res.json({ success: true, message: 'Modalidad eliminada.' });
        } catch (err) {
            await Consultas.dbRunAsync('ROLLBACK');
            next(err);
        }
    });

    return router;
};
