// ESTO SE UTILIZA PARA GUARDAR TODO EL CODIGO EN TXT
// SE EJECUTA DESDE LA CONSOLA: node exportarCodigo.js
//
const fs = require('fs');
const path = require('path');

const directorioRaiz = __dirname;
const nombreDirectorioRaiz = path.basename(directorioRaiz);

// Se crea el nombre del archivo de salida dinámicamente
const nombreArchivoSalida = `z_${nombreDirectorioRaiz}_todo_el_codigo.txt`;
const output = fs.createWriteStream(nombreArchivoSalida);

// Se escribe el nombre del directorio raíz como cabecera en el archivo
output.write(`// Directorio Raíz: ${nombreDirectorioRaiz}\n\n`);

// Lista de carpetas a excluir
const carpetasExcluidas = ['node_modules', '.git', 'dist', 'build'];

// Lista de archivos a excluir (por nombre exacto, opcional)
const archivosExcluidos = ['config.local.js', 'package-lock.json', 'secrets.json', 'google-token.json', 'seed.js', 'financiero.sqlite', 'exportarCodigo.js', 'test-email.js'];

// Extensiones permitidas
const extensionesPermitidas = ['.js', '.html', '.css', '.json', '.ejs', '.ts'];

function recorrerDirectorio(dir) {
  fs.readdirSync(dir).forEach(archivo => {
    const rutaCompleta = path.join(dir, archivo);
    const stat = fs.statSync(rutaCompleta);

    if (stat.isDirectory()) {
      if (!carpetasExcluidas.includes(archivo)) {
        recorrerDirectorio(rutaCompleta);
      }
    } else {
      const extension = path.extname(archivo);
      const nombreArchivo = path.basename(archivo);

      if (
        extensionesPermitidas.includes(extension) &&
        !archivosExcluidos.includes(nombreArchivo)
      ) {
        const contenido = fs.readFileSync(rutaCompleta, 'utf-8');
        output.write(`\n----- ${rutaCompleta} -----\n`);
        output.write(contenido + '\n');
      }
    }
  });
}

recorrerDirectorio(directorioRaiz);
// Se actualiza el mensaje de la consola para mostrar el nuevo nombre de archivo
console.log(`✅ Código exportado a ${nombreArchivoSalida} (excluyendo archivos y carpetas definidas)`);