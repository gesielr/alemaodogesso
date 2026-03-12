const fs = require('fs');
const path = require('path');
// Note: We need to install pdf-parse or use an alternative if not available.
// Since I can't guarantee npm install, I'll try to find if there's any pre-existing tool.
// Actually, I can try to use 'powershell' to extract text if it's a searchable PDF.

const pdfFolder = 'c:\\Users\\carlo\\Desktop\\Sistema - Alemão do Gesso\\src\\Arquivos_anterios';
const files = fs.readdirSync(pdfFolder).filter(f => f.endsWith('.pdf'));

console.log(`Encontrados ${files.length} arquivos PDF.`);

// Since I cannot run pdf-parse without installing it, I will try a different approach.
// I will use powershell to see if it can extract anything.
