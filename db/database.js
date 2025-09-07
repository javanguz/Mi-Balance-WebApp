// =================================================================
// db/database.js - Configuración e inicialización de la base de datos SQLite
// =================================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'financiero.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error al abrir la base de datos", err.message);
    } else {
        console.log("Conectado a la base de datos SQLite.");
        db.serialize(() => {
            // Habilitar claves foráneas
            db.run("PRAGMA foreign_keys = ON;");

   
             // --- Creación de Tablas (si no existen) ---
            db.run(`CREATE TABLE IF NOT EXISTS categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                tipo TEXT NOT NULL CHECK(tipo IN ('cliente', 'proveedor')),
   
                 es_editable INTEGER DEFAULT 1 NOT NULL,
                UNIQUE(nombre, tipo)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS modalidades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
               
                 nombre TEXT NOT NULL UNIQUE,
                es_editable INTEGER DEFAULT 1 NOT NULL
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY,
                nombre TEXT NOT NULL,
      
                  cuit TEXT,
                telefono TEXT,
                email TEXT,
                observaciones TEXT,
                categoria_id INTEGER,
                FOREIGN KEY (categoria_id) REFERENCES categorias(id) 
 ON DELETE SET NULL
            )`);
 db.run(`CREATE TABLE IF NOT EXISTS proveedores (
                id INTEGER PRIMARY KEY,
                nombre TEXT NOT NULL,
                cuit TEXT,
                telefono TEXT,
                email TEXT,
     
                 observaciones TEXT,
                categoria_id INTEGER,
                FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
            )`);
 db.run(`CREATE TABLE IF NOT EXISTS movimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                descripcion TEXT,
                monto REAL NOT NULL,
                tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
               
                 fecha TEXT NOT NULL,
                modalidad TEXT NOT NULL,
                entidad_id INTEGER,
                entidad_tipo TEXT CHECK(entidad_tipo IN ('cliente', 'proveedor')),
                categoria_id INTEGER,
                FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON 
 DELETE SET NULL
            )`);
 // Se crean índices únicos para la columna 'cuit' en ambas tablas.
 // Esto fuerza a la base de datos a no permitir valores duplicados.
 // El comando "IF NOT EXISTS" asegura que esto solo se ejecute una vez.
 // Si ya existen duplicados en tus datos, esto fallará y verás un
            // error en la consola al iniciar la app, lo cual es esperado.
 console.log("Verificando restricciones de unicidad en CUIT/DNI...");
            db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cuit ON clientes(cuit)`, (err) => {
                if (err) {
                    console.error("Error al crear índice único para clientes. Posiblemente existen CUITs duplicados que debe corregir manualmente.", err.message);
                } else {
            
                     console.log("Restricción de CUIT único para clientes asegurada.");
                }
            });
 db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_cuit ON proveedores(cuit)`, (err) => {
                if (err) {
                    console.error("Error al crear índice único para proveedores. Posiblemente existen CUITs duplicados que debe corregir manualmente.", err.message);
                } else {
                  
                   console.log("Restricción de CUIT único para proveedores asegurada.");
                }
            });

            // --- CORRECCIÓN: Se actualizan los nombres de las categorías por defecto si existen ---
            console.log("Actualizando nombres de categorías por defecto...");
            db.run("UPDATE categorias SET nombre = 'Ingresos sin categoría' WHERE nombre = 'Sin categorizar' AND tipo = 'cliente'");
            db.run("UPDATE categorias SET nombre = 'Egresos sin categoría' WHERE nombre = 'Sin categorizar' AND tipo = 'proveedor'");

             // --- Sembrado de datos por defecto ---
            const seedCategories = () => {
                const stmt = db.prepare("INSERT OR IGNORE INTO categorias (nombre, tipo, es_editable) VALUES (?, ?, ?)");
                stmt.run('Ingresos sin categoría', 'cliente', 0);
                stmt.run('Egresos sin categoría', 'proveedor', 0);
                const clienteCats = ["Ventas web", "Ventas mostrador", "Servicios"];
 clienteCats.forEach(cat => stmt.run(cat, 'cliente', 1));
                const proveedorCats = ["Agua, luz y gas", "Sueldos y cs. soc.", "Comestibles", "Gastos varios", "Impuestos", "Alquileres"];
 proveedorCats.forEach(cat => stmt.run(cat, 'proveedor', 1));
                stmt.finalize((err) => {
                    if (!err) console.log("Categorías por defecto verificadas/sembradas.");
                });
 };

            const seedModalidades = () => {
                const stmt = db.prepare("INSERT OR IGNORE INTO modalidades (nombre, es_editable) VALUES (?, ?)");
 stmt.run('Efectivo', 0);
                const editableModalidades = ['Transferencia', 'Billetera/Qr', 'Tarjeta'];
                editableModalidades.forEach(mod => stmt.run(mod, 1));
 stmt.finalize((err) => {
                    if (!err) {
                        console.log("Modalidades por defecto verificadas/sembradas.");
                        db.run("UPDATE modalidades SET es_editable = 1 WHERE nombre IN ('Transferencia', 'Billetera/Qr', 'Tarjeta')");
              
           }
                });
 };
            
            seedCategories();
            seedModalidades();
        });
    }
});

module.exports = db;