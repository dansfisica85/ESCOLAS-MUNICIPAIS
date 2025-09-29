import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function verificarDados() {
  console.log('🔍 Verificando dados no banco...');
  
  try {
    // Verificar se a tabela existe
    const tabelasResult = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='celulas';
    `);
    
    console.log('📊 Tabelas encontradas:', tabelasResult.rows);
    
    if (tabelasResult.rows.length === 0) {
      console.log('❌ Tabela "celulas" não existe! Criando...');
      
      // Criar tabela
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
      console.log('✅ Tabela criada!');
    }
    
    // Contar total de registros
    const countResult = await client.execute('SELECT COUNT(*) as total FROM celulas');
    console.log('📈 Total de registros:', countResult.rows[0].total);
    
    // Verificar registros de DUMONT
    const dumontResult = await client.execute(`
      SELECT COUNT(*) as total FROM celulas WHERE municipio = 'DUMONT'
    `);
    console.log('🏫 Registros de DUMONT:', dumontResult.rows[0].total);
    
    // Mostrar algumas linhas de DUMONT
    const sampleResult = await client.execute(`
      SELECT * FROM celulas WHERE municipio = 'DUMONT' LIMIT 10
    `);
    console.log('📝 Amostra dos dados de DUMONT:');
    sampleResult.rows.forEach(row => {
      console.log(`  L${row.linha} C${row.coluna}: "${row.valor}" (${row.tipo})`);
    });
    
    // Verificar se as linhas 13-16 existem
    const linhasNovas = await client.execute(`
      SELECT DISTINCT linha FROM celulas WHERE municipio = 'DUMONT' AND linha >= 13 ORDER BY linha
    `);
    console.log('🆕 Linhas 13+ de DUMONT:', linhasNovas.rows.map(r => `L${r.linha}`).join(', '));
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  }
}

verificarDados();