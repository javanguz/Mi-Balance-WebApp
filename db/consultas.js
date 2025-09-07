// db/consultas.js
const db = require('./database');

// Helper para ejecutar db.all como una promesa
const dbAllAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

// Helper para ejecutar db.get como una promesa
const dbGetAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

// Helper para ejecutar db.run como una promesa
const dbRunAsync = (sql, params = []) => new Promise(function (resolve, reject) {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
    });
});

// =============================================
// CONSULTAS PARA PANTALLA DE REGISTRO
// =============================================

// ===============================================================
// INICIO DE LA MEJORA: Consulta de movimientos refactorizada
// Se utiliza una Expresión de Tabla Común (CTE) para mejorar la
// legibilidad y eficiencia, evitando la repetición de código y
// optimizando las condiciones de búsqueda.
// ===============================================================
const getMovimientosPaginados = async (filtros) => {
    const { pagina = 1, porPagina = 10, tipo, busqueda, fechaDesde, fechaHasta } = filtros;
    const offset = (pagina - 1) * porPagina;

    // CTE para unificar los joins y la selección de datos base.
    const baseSql = `
        WITH movimientos_base AS (
            SELECT
                m.id, m.tipo, m.fecha, m.monto, m.descripcion, m.modalidad, m.entidad_id, m.entidad_tipo,
                COALESCE(c.nombre, p.nombre, 'General') as entidad_nombre,
                cat.nombre as categoria_nombre
            FROM movimientos m
            LEFT JOIN clientes c ON m.entidad_id = c.id AND m.entidad_tipo = 'cliente'
            LEFT JOIN proveedores p ON m.entidad_id = p.id AND m.entidad_tipo = 'proveedor'
            LEFT JOIN categorias cat ON m.categoria_id = cat.id
        )
    `;

    let whereClauses = [];
    const params = [];

    if (tipo && tipo !== 'todos') {
        whereClauses.push('tipo = ?');
        params.push(tipo);
    }

    if (busqueda) {
        const busquedaLike = `%${busqueda}%`;
        // Búsqueda más eficiente, evitando conversiones de tipo innecesarias.
        whereClauses.push(`(
            entidad_nombre LIKE ? OR
            descripcion LIKE ? OR
            modalidad LIKE ? OR
            categoria_nombre LIKE ?
        )`);
        params.push(busquedaLike, busquedaLike, busquedaLike, busquedaLike);
    }

    if (fechaDesde && fechaHasta) {
        whereClauses.push('fecha BETWEEN ? AND ?');
        params.push(fechaDesde, fechaHasta);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Consulta principal que utiliza el CTE para obtener los datos paginados.
    const sqlMovimientos = `
        ${baseSql}
        SELECT * FROM movimientos_base
        ${whereSql}
        ORDER BY fecha DESC, id DESC
        LIMIT ? OFFSET ?
    `;

    // Consulta de conteo que reutiliza el mismo CTE y filtros para máxima eficiencia.
    const sqlConteo = `
        ${baseSql}
        SELECT COUNT(id) as total FROM movimientos_base
        ${whereSql}
    `;

    const [movimientos, conteo] = await Promise.all([
        dbAllAsync(sqlMovimientos, [...params, porPagina, offset]),
        dbGetAsync(sqlConteo, params)
    ]);

    return {
        movimientos,
        total: conteo.total,
        pagina: parseInt(pagina, 10),
        totalPaginas: Math.ceil(conteo.total / porPagina)
    };
};
// ===============================================================
// FIN DE LA MEJORA
// ===============================================================


// ===============================================================
// INICIO DE LA CORRECCIÓN
// Se añade una columna 'tipo_display' para controlar el texto
// que se muestra en la interfaz, sin alterar el 'tipo' lógico
// que se usa para los cálculos.
// ===============================================================
const searchEntities = async (query) => {
    const likeQuery = `%${query}%`;
    const sql = `
        SELECT id, nombre, 'cliente' as tipo, 'Cliente' as tipo_display FROM clientes WHERE nombre LIKE ? OR id LIKE ?
        UNION ALL
        SELECT id, nombre, 'proveedor' as tipo, 'Proveedor' as tipo_display FROM proveedores WHERE nombre LIKE ? OR id LIKE ?
        UNION ALL
        SELECT id, nombre, 'categoria_' || tipo as tipo, 'Categoría' as tipo_display FROM categorias WHERE nombre LIKE ?
    `;
    const params = [likeQuery, likeQuery, likeQuery, likeQuery, likeQuery];
    const results = await dbAllAsync(sql, params);
    return results.sort((a, b) => a.nombre.localeCompare(b.nombre));
};
const getAllEntitiesForSearch = async () => {
    const sql = `
        SELECT id, nombre, 'cliente' as tipo, 'Cliente' as tipo_display FROM clientes
        UNION ALL
        SELECT id, nombre, 'proveedor' as tipo, 'Proveedor' as tipo_display FROM proveedores
        UNION ALL
        SELECT id, nombre, 'categoria_' || tipo as tipo, 'Categoría' as tipo_display FROM categorias
    `;
    const results = await dbAllAsync(sql);
    return results.sort((a, b) => a.nombre.localeCompare(b.nombre));
};
// ===============================================================
// FIN DE LA CORRECCIÓN
// ===============================================================


// ===============================================================
// INICIO DE LA MEJORA: Función de totales refactorizada
// Se reemplaza el bucle que ejecutaba múltiples consultas por una
// única consulta SQL. Esto mejora drásticamente el rendimiento al
// reducir la carga sobre la base de datos.
// ===============================================================
const getTotalsForEntities = async (startDate, endDate, entities) => {
    if (!entities || entities.length === 0) {
        return { total: 0 };
    }

    // Separa las entidades por tipo para construir la consulta dinámica
    const entityIds = {
        cliente: [],
        proveedor: [],
        categoria_cliente: [],
        categoria_proveedor: []
    };

    for (const entity of entities) {
        if (entityIds[entity.type]) {
            entityIds[entity.type].push(entity.id);
        }
    }

    const conditions = [];
    const params = [startDate, endDate];

    if (entityIds.cliente.length > 0) {
        conditions.push(`(m.entidad_tipo = 'cliente' AND m.entidad_id IN (${entityIds.cliente.map(() => '?').join(',')}))`);
        params.push(...entityIds.cliente);
    }

    if (entityIds.proveedor.length > 0) {
        conditions.push(`(m.entidad_tipo = 'proveedor' AND m.entidad_id IN (${entityIds.proveedor.map(() => '?').join(',')}))`);
        params.push(...entityIds.proveedor);
    }

    if (entityIds.categoria_cliente.length > 0) {
        conditions.push(`(m.categoria_id IN (${entityIds.categoria_cliente.map(() => '?').join(',')}) AND m.tipo = 'ingreso')`);
        params.push(...entityIds.categoria_cliente);
    }
    
    if (entityIds.categoria_proveedor.length > 0) {
        conditions.push(`(m.categoria_id IN (${entityIds.categoria_proveedor.map(() => '?').join(',')}) AND m.tipo = 'egreso')`);
        params.push(...entityIds.categoria_proveedor);
    }

    if (conditions.length === 0) {
        return { total: 0 };
    }

    // Consulta única que calcula el balance total (ingresos - egresos) para todas las entidades seleccionadas.
    const sql = `
        SELECT SUM(CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE -m.monto END) as total
        FROM movimientos m
        WHERE m.fecha BETWEEN ? AND ?
        AND (${conditions.join(' OR ')})
    `;

    const result = await dbGetAsync(sql, params);

    return { total: result?.total || 0 };
};
// ===============================================================
// FIN DE LA MEJORA
// ===============================================================


// =============================================
// CONSULTAS GENERALES (Refactorizadas)
// =============================================
const getCategoriasPorTipo = (tipo) => dbAllAsync("SELECT * FROM categorias WHERE tipo = ? ORDER BY id", [tipo]);
const getModalidades = () => dbAllAsync("SELECT id, nombre, es_editable FROM modalidades ORDER BY id");
const getClientePorId = (id) => dbGetAsync("SELECT * FROM clientes WHERE id = ?", [id]);
const getProveedorPorId = (id) => dbGetAsync("SELECT * FROM proveedores WHERE id = ?", [id]);
const getMovimientoPorId = (id) => dbGetAsync("SELECT * FROM movimientos WHERE id = ?", [id]);
const eliminarMovimientoPorId = (id) => dbRunAsync('DELETE FROM movimientos WHERE id = ?', [id]);
const getCategorias = () => dbAllAsync("SELECT id, nombre, tipo FROM categorias ORDER BY tipo, nombre");
const getModalidadesUnicas = () => dbAllAsync("SELECT DISTINCT modalidad FROM movimientos ORDER BY modalidad");
const getClientes = () => dbAllAsync("SELECT id, nombre FROM clientes ORDER BY nombre ASC");
const getProveedores = () => dbAllAsync("SELECT id, nombre FROM proveedores ORDER BY nombre ASC");

module.exports = {
    dbAllAsync,
    dbGetAsync,
    dbRunAsync,
    getMovimientosPaginados,
    searchEntities,
    getAllEntitiesForSearch,
    getTotalsForEntities,
    getCategoriasPorTipo,
    getModalidades,
    getClientePorId,
    getProveedorPorId,
    getMovimientoPorId,
    eliminarMovimientoPorId,
    getCategorias,
    getModalidadesUnicas,
    getClientes,
    getProveedores
};