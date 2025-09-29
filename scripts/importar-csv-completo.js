import { createClient } from '@libsql/client';
import fs from 'fs';
import csv from 'csv-parser';
import 'dotenv/config';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function importarDadosCSV() {
  console.log('🚀 Importando dados do arquivo celulas.csv...');
  
  try {
    // Verificar se a tabela existe e criar se necessário
    await client.execute(`
      CREATE TABLE IF NOT EXISTS celulas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        municipio TEXT,
        linha INTEGER,
        coluna INTEGER,
        valor TEXT,
        tipo TEXT
      )
    `);
    
    // Limpar dados existentes (opcional - comente se quiser manter)
    await client.execute('DELETE FROM celulas');
    console.log('🧹 Dados anteriores removidos');
    
    // Ler e processar o CSV
    const dados = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream('/workspaces/ESCOLAS-MUNICIPAIS/celulas.csv')
        .pipe(csv())
        .on('data', (row) => {
          dados.push({
            municipio: row.municipio,
            linha: parseInt(row.linha),
            coluna: parseInt(row.coluna),
            valor: row.valor || '',
            tipo: row.tipo || 'text'
          });
          
          // Log a cada 1000 registros
          if (dados.length % 1000 === 0) {
            console.log(`📊 Processados ${dados.length} registros...`);
          }
        })
        .on('end', async () => {
          console.log(`✅ CSV processado: ${dados.length} registros encontrados`);
          
          try {
            // Inserir dados em lotes
            const batchSize = 100;
            let inserted = 0;
            
            for (let i = 0; i < dados.length; i += batchSize) {
              const batch = dados.slice(i, i + batchSize);
              
              // Preparar query de inserção em lote
              const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
              const values = [];
              
              batch.forEach(item => {
                values.push(item.municipio, item.linha, item.coluna, item.valor, item.tipo);
              });
              
              await client.execute({
                sql: `INSERT INTO celulas (municipio, linha, coluna, valor, tipo) VALUES ${placeholders}`,
                args: values
              });
              
              inserted += batch.length;
              console.log(`💾 Inseridos ${inserted}/${dados.length} registros...`);
            }
            
            console.log('🎉 Todos os dados foram importados com sucesso!');
            
            // Verificar o resultado
            const countResult = await client.execute('SELECT COUNT(*) as total FROM celulas');
            console.log(`📈 Total de registros no banco: ${countResult.rows[0].total}`);
            
            // Verificar municípios
            const municipiosResult = await client.execute('SELECT DISTINCT municipio FROM celulas ORDER BY municipio');
            console.log('🏘️ Municípios importados:', municipiosResult.rows.map(r => r.municipio).join(', '));
            
            // Verificar DUMONT especificamente
            const dumontResult = await client.execute('SELECT COUNT(*) as total FROM celulas WHERE municipio = "DUMONT"');
            console.log(`🏫 Registros de DUMONT: ${dumontResult.rows[0].total}`);
            
            resolve();
          } catch (error) {
            console.error('❌ Erro ao inserir dados:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Erro ao ler CSV:', error);
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

importarDadosCSV();