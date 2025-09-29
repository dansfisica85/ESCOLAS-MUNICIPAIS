import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importarComHTTP() {
    console.log('🚀 Iniciando importação via HTTP API...');
    
    const url = 'https://turso-db-create-escolas-municipais-dansfisica85.aws-us-east-2.turso.io';
    const token = process.env.TURSO_AUTH_TOKEN;

    try {
        // Primeiro, criar a tabela se não existir
        console.log('📊 Criando tabela...');
        const createTableResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                statements: [{
                    q: `CREATE TABLE IF NOT EXISTS celulas (
                        id INTEGER PRIMARY KEY,
                        municipio TEXT NOT NULL,
                        linha INTEGER NOT NULL,
                        coluna INTEGER NOT NULL,
                        valor TEXT,
                        tipo TEXT DEFAULT 'text'
                    )`
                }]
            })
        });

        if (!createTableResponse.ok) {
            throw new Error(`Erro ao criar tabela: ${createTableResponse.status}`);
        }

        console.log('✅ Tabela criada/verificada');

        // Limpar dados existentes
        console.log('🧹 Limpando dados existentes...');
        await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                statements: [{ q: 'DELETE FROM celulas' }]
            })
        });

        // Ler CSV
        const csvPath = path.join(__dirname, '..', 'celulas.csv');
        console.log('📁 Lendo arquivo CSV:', csvPath);
        
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        console.log(`📋 Total de linhas no CSV: ${lines.length}`);
        
        // Processar em lotes
        const batchSize = 50;
        let processedCount = 0;
        
        for (let i = 1; i < lines.length; i += batchSize) {
            const batch = lines.slice(i, i + batchSize);
            const statements = [];
            
            for (const line of batch) {
                if (!line.trim()) continue;
                
                try {
                    const values = line.split(',').map(val => val.trim().replace(/"/g, ''));
                    
                    if (values.length >= 6) {
                        const [id, municipio, linha, coluna, valor, tipo] = values;
                        
                        if (id && municipio && linha && coluna) {
                            statements.push({
                                q: 'INSERT INTO celulas (id, municipio, linha, coluna, valor, tipo) VALUES (?, ?, ?, ?, ?, ?)',
                                params: [
                                    parseInt(id) || i,
                                    municipio || '',
                                    parseInt(linha) || 0,
                                    parseInt(coluna) || 0,
                                    valor || '',
                                    tipo || 'text'
                                ]
                            });
                        }
                    }
                } catch (error) {
                    console.error(`❌ Erro na linha ${i}:`, error.message);
                }
            }
            
            if (statements.length > 0) {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ statements })
                });
                
                if (!response.ok) {
                    console.error(`❌ Erro no lote ${Math.floor(i/batchSize)}: ${response.status}`);
                } else {
                    processedCount += statements.length;
                    console.log(`📈 Processados ${processedCount} registros...`);
                }
            }
        }
        
        // Verificar dados inseridos
        const countResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                statements: [{ q: 'SELECT COUNT(*) as total FROM celulas' }]
            })
        });
        
        const countData = await countResponse.json();
        const total = countData[0]?.results?.rows?.[0]?.[0] || 0;
        
        console.log(`✅ Importação concluída!`);
        console.log(`📊 Total de registros inseridos: ${total}`);
        console.log('🌐 Dados agora disponíveis em: https://escolas-municipais.vercel.app/');
        
    } catch (error) {
        console.error('❌ Erro durante a importação:', error);
    }
}

importarComHTTP();