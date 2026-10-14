const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const distBrowserDir = path.join(__dirname, '..', 'dist', 'ProcrastinaComoUnPro', 'browser');

if (!fs.existsSync(distBrowserDir)) {
  console.error(`[Obfuscator] Error: El directorio de salida no existe: ${distBrowserDir}`);
  process.exit(1);
}

const files = fs.readdirSync(distBrowserDir);
const jsFiles = files.filter(f => f.endsWith('.js'));

console.log(`[Obfuscator] Encontrados ${jsFiles.length} archivos JavaScript para ofuscar en ${distBrowserDir}`);

const obfuscatorOptions = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,
  shuffleStringArray: true,
  splitStrings: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  target: 'browser'
};

let successCount = 0;

for (const file of jsFiles) {
  const filePath = path.join(distBrowserDir, file);
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, obfuscatorOptions);
    fs.writeFileSync(filePath, obfuscationResult.getObfuscatedCode(), 'utf8');
    successCount++;
    console.log(`  ✓ Ofuscado: ${file}`);
  } catch (err) {
    console.error(`  ✗ Error al ofuscar ${file}:`, err.message);
  }
}

// Eliminar cualquier archivo .map residual para garantizar cero exposición de código fuente original
const mapFiles = files.filter(f => f.endsWith('.map'));
for (const mapFile of mapFiles) {
  try {
    fs.unlinkSync(path.join(distBrowserDir, mapFile));
    console.log(`  🗑️ Eliminado mapa de origen: ${mapFile}`);
  } catch {}
}

console.log(`[Obfuscator] ¡Proceso completado exitosamente! ${successCount} archivos ofuscados.`);
