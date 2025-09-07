const crypto = require('crypto');

// IMPORTANTE: Esta clave debe ser EXACTAMENTE la misma que está en su archivo routes/settings.js
const SECRET_KEY = 'tu-clave-secreta-para-generar-licencias';

/**
 * Genera una clave de licencia basada en el nombre de usuario y CUIT.
 * @param {string} username - El nombre de usuario para la licencia.
 * @param {string} cuit - El CUIT del usuario para la licencia.
 * @returns {string|null} La clave de licencia generada o null si faltan datos.
 */
function generateCorrectLicenseKey(username, cuit) {
    if (!username || !cuit) return null;
    // La lógica de hashing es idéntica a la de su aplicación para garantizar la compatibilidad.
    return crypto.createHash('sha256').update(username + cuit + SECRET_KEY).digest('hex').substring(0, 32);
}

// --- INSTRUCCIONES DE USO ---
// 1. Guarde este archivo como 'generate-license.js' en la raíz de su proyecto.
// 2. Abra una terminal en la carpeta del proyecto.
// 3. Ejecute el script con el siguiente comando:
//    node generate-license.js "<Nombre de Usuario>" "<CUIT>"
//
// --- EJEMPLOS ---
// node generate-license.js "Javier Guzman" "20123456789"
// node generate-license.js "Usuario de Prueba" "30987654321"
//
// Nota: Si el nombre de usuario contiene espacios, asegúrese de ponerlo entre comillas.

// Obtener los argumentos de la línea de comandos
const username = process.argv[2];
const cuit = process.argv[3];

// Validar que se hayan proporcionado los argumentos necesarios
if (!username || !cuit) {
    console.error("\n\x1b[31mError: Faltan argumentos.\x1b[0m"); // Rojo
    console.log("\nUso: \x1b[36mnode generate-license.js \"<Nombre de Usuario>\" \"<CUIT>\"\x1b[0m"); // Cyan
    console.log("Ejemplo: \x1b[32mnode generate-license.js \"Javier Guzman\" \"20123456789\"\x1b[0m\n"); // Verde
    process.exit(1); // Salir con un código de error
}

// Generar y mostrar la licencia
const licenseKey = generateCorrectLicenseKey(username, cuit);

if (licenseKey) {
    console.log("\n\x1b[1m\x1b[32m-----------------------------------------\x1b[0m");
    console.log("\x1b[1m\x1b[32m  Clave de Licencia Generada con Éxito \x1b[0m");
    console.log("\x1b[1m\x1b[32m-----------------------------------------\x1b[0m");
    console.log(`\x1b[1m${licenseKey}\x1b[0m`);
    console.log("-----------------------------------------");
    console.log(`\x1b[34mPara el usuario:\x1b[0m      ${username}`);
    console.log(`\x1b[34mPara el CUIT:\x1b[0m         ${cuit}\n`);
} else {
    console.error("No se pudo generar la clave de licencia.");
}
