// se ejecuta mediante: npm run seed  
const sqlite3 = require('sqlite3').verbose();
const { faker } = require('@faker-js/faker');

// =============================================================================
// ======================== ZONA DE CONFIGURACIÓN ========================
// Modifica los valores en esta sección para personalizar los datos de prueba.
// =============================================================================

const CANTIDAD_CLIENTES = 7;       // Define cuántos clientes de prueba se crearán.
const CANTIDAD_PROVEEDORES = 7;     // Define cuántos proveedores de prueba se crearán.
const CANTIDAD_MOVIMIENTOS = 4000;   // Define cuántos movimientos (ingresos/egresos) se crearán.

// Define el rango de fechas para los movimientos.
// FORMATO REQUERIDO: 'YYYY-MM-DD'
const FECHA_INICIO_MOVIMIENTOS = '2021-01-01';
const FECHA_FIN_MOVIMIENTOS = new Date().toISOString().slice(0, 10); // Usa la fecha actual como fecha final.

// Define el rango de importes para los movimientos.
const IMPORTE_MIN = 7500;
const IMPORTE_MAX = 100000;

// =============================================================================
// ================== FIN DE LA ZONA DE CONFIGURACIÓN ==================
// =============================================================================


// Conexión a la base de datos
const db = new sqlite3.Database('./db/financiero.sqlite', (err) => {
    if (err) return console.error(err.message);
    console.log('Conectado a la base de datos para sembrar datos.');
});

// --- LISTAS DE DATOS PARA PERSONALIZAR ---
const nombresArg = ['Juan', 'Lucía', 'Martín', 'Sofía', 'Federico', 'Mariana', 'Carlos', 'Valentina', 'Lautaro', 'Camila', 'Agustín', 'Julieta', 'Tomás', 'Paula', 'Ramiro', 'Josefina', 'Matías', 'Milagros', 'Emiliano', 'Rocío'];
const apellidosArg = ['González', 'Rodríguez', 'Fernández', 'Pérez', 'Gómez', 'Díaz', 'Sánchez', 'Romero', 'López', 'Martínez', 'Acosta', 'Silva', 'Ruiz', 'Álvarez', 'Torres', 'Navarro', 'Domínguez', 'Moreno', 'Molina', 'Castro'];
const empresasArg = [
    'Logística Sur SA', 'Insumos del Norte SRL', 'Distribuidora El Sol SAS', 'Agroquímica Río SAS', 'Servicios Industriales SRL', 'Consultora Patagonia SA', 'Transporte La Unión SRL', 'Fábrica del Este SA', 'Construcciones Andinas SRL', 'Soluciones Técnicas SAS',
    'Impresiones Tucumán SRL', 'Alimentos Santa Fe SA', 'Automotores Norte SAS', 'Exportadora Cuyo SRL', 'Comercial Andina SA', 'Telecomunicaciones del Sur SAS', 'Gráfica Centro SRL', 'Electromecánica del Litoral SA', 'Cosecha Fértil SRL', 'Servicios Integrales del NOA SAS'
];
const descripcionesVenta = ["Venta de mercadería", "Servicio de consultoría", "Adelanto por proyecto", "Factura A-001", "Servicio de mantenimiento"];
const descripcionesPago = ["Pago factura servicios", "Compra de insumos", "Adelanto a proveedor", "Pago alquiler oficina", "Factura 1234"];
const modalidades = ['Efectivo', 'Transferencia', 'Billetera/Qr', 'Tarjeta'];

// --- FUNCIONES AUXILIARES PARA GENERAR DATOS ---
const generarCUIT = () => `20${faker.string.numeric(8)}${faker.string.numeric(1)}`;
const generarTelefono = () => `11-${faker.string.numeric(4)}-${faker.string.numeric(4)}`;
const generarEmail = (nombre) => `${nombre.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${faker.internet.domainName()}`;


// --- PROCESO PRINCIPAL DE SIEMBRA DE DATOS ---
db.serialize(async () => {
    console.log('Limpiando datos antiguos de clientes, proveedores y movimientos...');
    
    db.run("PRAGMA foreign_keys = ON;");

    db.run(`DELETE FROM movimientos`);
    db.run(`DELETE FROM clientes`);
    db.run(`DELETE FROM proveedores`);
    db.run(`DELETE FROM sqlite_sequence WHERE name IN ('movimientos')`);

    console.log('Creando nuevos datos de prueba...');

    // --- 1. OBTENER IDs DE CATEGORÍAS EXISTENTES ---
    const clienteCategoriaIds = await new Promise((resolve, reject) => {
        db.all("SELECT id FROM categorias WHERE tipo = 'cliente' AND es_editable = 1", (err, rows) => err ? reject(err) : resolve(rows.map(r => r.id)));
    });
    const proveedorCategoriaIds = await new Promise((resolve, reject) => {
        db.all("SELECT id FROM categorias WHERE tipo = 'proveedor' AND es_editable = 1", (err, rows) => err ? reject(err) : resolve(rows.map(r => r.id)));
    });

    if (clienteCategoriaIds.length === 0 || proveedorCategoriaIds.length === 0) {
        console.error("Error: No se encontraron las categorías por defecto en la base de datos.");
        console.error("Asegúrese de ejecutar la aplicación principal al menos una vez para que se creen.");
        db.close();
        return;
    }

    const clientesCreados = [];
    const proveedoresCreados = [];

    // --- 2. CREACIÓN DE CLIENTES (CON NOMBRES ÚNICOS) ---
    const nombresClientesUsados = new Set();
    const insertCliente = db.prepare(`INSERT INTO clientes (id, nombre, cuit, telefono, email, observaciones, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (let i = 0; i < CANTIDAD_CLIENTES; i++) {
        let nombreCompleto;
        do {
            nombreCompleto = `${faker.helpers.arrayElement(nombresArg)} ${faker.helpers.arrayElement(apellidosArg)}`;
        } while (nombresClientesUsados.has(nombreCompleto));
        
        nombresClientesUsados.add(nombreCompleto);
        const clienteId = 10001 + i;
        const categoriaId = faker.helpers.arrayElement(clienteCategoriaIds);
        insertCliente.run(clienteId, nombreCompleto, generarCUIT(), generarTelefono(), generarEmail(nombreCompleto), `Cliente registrado el ${faker.date.past({years: 2}).toLocaleDateString('es-AR')}`, categoriaId);
        clientesCreados.push({ id: clienteId, categoria_id: categoriaId });
    }
    insertCliente.finalize();
    console.log(`-> ${CANTIDAD_CLIENTES} clientes únicos creados.`);

    // --- 3. CREACIÓN DE PROVEEDORES (CON NOMBRES ÚNICOS) ---
    const nombresProveedoresUsados = new Set();
    const insertProveedor = db.prepare(`INSERT INTO proveedores (id, nombre, cuit, telefono, email, observaciones, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (let i = 0; i < CANTIDAD_PROVEEDORES; i++) {
        let nombreEmpresa;
        do {
            nombreEmpresa = faker.helpers.arrayElement(empresasArg);
        } while (nombresProveedoresUsados.has(nombreEmpresa));

        nombresProveedoresUsados.add(nombreEmpresa);
        const proveedorId = 20001 + i;
        const categoriaId = faker.helpers.arrayElement(proveedorCategoriaIds);
        insertProveedor.run(proveedorId, nombreEmpresa, generarCUIT(), generarTelefono(), generarEmail(nombreEmpresa), `Proveedor de ${faker.commerce.department()}`, categoriaId);
        proveedoresCreados.push({ id: proveedorId, categoria_id: categoriaId });
    }
    insertProveedor.finalize();
    console.log(`-> ${CANTIDAD_PROVEEDORES} proveedores únicos creados.`);

    // --- 4. CREACIÓN DE MOVIMIENTOS ---
    const insertMovimiento = db.prepare(`INSERT INTO movimientos (descripcion, monto, tipo, fecha, modalidad, entidad_id, entidad_tipo, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    
    for (let i = 0; i < CANTIDAD_MOVIMIENTOS; i++) {
        const tipo = faker.helpers.arrayElement(['ingreso', 'egreso']);
        const entidad_tipo = tipo === 'ingreso' ? 'cliente' : 'proveedor';
        
        const entidad = tipo === 'ingreso' 
            ? faker.helpers.arrayElement(clientesCreados)
            : faker.helpers.arrayElement(proveedoresCreados);
        
        const descripcion = tipo === 'ingreso'
            ? faker.helpers.arrayElement(descripcionesVenta)
            : faker.helpers.arrayElement(descripcionesPago);
        
        const fechaMovimiento = faker.date.between({ from: FECHA_INICIO_MOVIMIENTOS, to: FECHA_FIN_MOVIMIENTOS }).toISOString().slice(0, 10);

        insertMovimiento.run(
            `${descripcion} #${faker.string.numeric(4)}`,
            faker.finance.amount({ min: IMPORTE_MIN, max: IMPORTE_MAX, dec: 2 }), 
            tipo, 
            fechaMovimiento, 
            faker.helpers.arrayElement(modalidades), 
            entidad.id, 
            entidad_tipo,
            entidad.categoria_id
        );
    }
    
    insertMovimiento.finalize(() => {
        db.close((err) => {
            if (err) return console.error(err.message);
            console.log('\nConexión a la base de datos cerrada. ¡Siembra completada!');
        });
    });
    console.log(`-> ${CANTIDAD_MOVIMIENTOS} movimientos creados entre ${FECHA_INICIO_MOVIMIENTOS} y ${FECHA_FIN_MOVIMIENTOS}.`);
});
