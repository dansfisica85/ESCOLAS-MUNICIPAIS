import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importarTodosCsv() {
    console.log('🚀 Iniciando importação completa dos dados do CSV...');
    
    // Conectar ao banco Turso
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
        console.log('📊 Conectando ao banco de dados...');
        
        // Verificar se a tabela existe e criar se necessário
        await client.execute(`
            CREATE TABLE IF NOT EXISTS celulas (
                id INTEGER PRIMARY KEY,
                municipio TEXT NOT NULL,
                linha INTEGER NOT NULL,
                coluna INTEGER NOT NULL,
                valor TEXT,
                tipo TEXT DEFAULT 'text'
            )
        `);

        // Limpar dados existentes
        console.log('🧹 Limpando dados existentes...');
        await client.execute('DELETE FROM celulas');

        // Ler o arquivo CSV
        const csvPath = path.join(__dirname, '..', 'celulas.csv');
        console.log('📁 Lendo arquivo CSV:', csvPath);
        
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        console.log(`📋 Total de linhas no CSV: ${lines.length}`);
        
        // Processar header
        const header = lines[0].split(',').map(col => col.trim().replace(/"/g, ''));
        console.log('📝 Cabeçalho:', header);
        
        let processedCount = 0;
        let errorCount = 0;
        
        // Processar cada linha do CSV
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const values = line.split(',').map(val => val.trim().replace(/"/g, ''));
                
                if (values.length >= 6) {
                    const [id, municipio, linha, coluna, valor, tipo] = values;
                    
                    // Validar dados
                    if (id && municipio && linha && coluna) {
                        await client.execute({
                            sql: 'INSERT INTO celulas (id, municipio, linha, coluna, valor, tipo) VALUES (?, ?, ?, ?, ?, ?)',
                            args: [
                                parseInt(id) || i,
                                municipio || '',
                                parseInt(linha) || 0,
                                parseInt(coluna) || 0,
                                valor || '',
                                tipo || 'text'
                            ]
                        });
                        
                        processedCount++;
                        
                        if (processedCount % 100 === 0) {
                            console.log(`📈 Processadas ${processedCount} linhas...`);
                        }
                    }
                }
            } catch (error) {
                errorCount++;
                if (errorCount <= 5) {
                    console.error(`❌ Erro na linha ${i}:`, error.message);
                }
            }
        }
        
        // Verificar dados inseridos
        const result = await client.execute('SELECT COUNT(*) as total FROM celulas');
        const total = result.rows[0].total;
        
        console.log(`✅ Importação concluída!`);
        console.log(`📊 Total de registros inseridos: ${total}`);
        console.log(`✅ Linhas processadas com sucesso: ${processedCount}`);
        console.log(`❌ Erros encontrados: ${errorCount}`);
        
        // Mostrar alguns dados importados
        const sample = await client.execute('SELECT municipio, COUNT(*) as count FROM celulas GROUP BY municipio LIMIT 10');
        console.log('🏢 Municípios importados:');
        sample.rows.forEach(row => {
            console.log(`  - ${row.municipio}: ${row.count} registros`);
        });
        
        console.log('🌐 Dados agora disponíveis em: https://escolas-municipais.vercel.app/');
        
    } catch (error) {
        console.error('❌ Erro durante a importação:', error);
    } finally {
        client.close();
    }
}

importarTodosCsv();