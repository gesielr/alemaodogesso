const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfFolder = 'src/Arquivos_anterios';
const files = fs.readdirSync(pdfFolder).filter(f => f.endsWith('.pdf'));

async function extract() {
    for (const file of files) {
        console.log(`--- Lendo arquivo: ${file} ---`);
        const dataBuffer = fs.readFileSync(path.join(pdfFolder, file));
        try {
            const data = await pdf(dataBuffer);
            console.log(data.text);
            console.log('\n--- Fim do arquivo ---\n');
        } catch (err) {
            console.error(`Erro ao ler ${file}:`, err.message);
        }
    }
}

extract();
