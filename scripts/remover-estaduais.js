import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function removerEscolasEstaduais() {
  console.log('🔍 Buscando escolas estaduais para remoção...');
  
  try {
    // Buscar todas as células que contêm "ESTADUAL" ou variações
    const result = await client.execute(`
      SELECT DISTINCT municipio, linha 
      FROM celulas 
      WHERE UPPER(valor) LIKE '%ESTADUAL%' 
         OR UPPER(valor) LIKE '%E.E.%'
         OR UPPER(valor) LIKE '%ESCOLA ESTADUAL%'
      ORDER BY municipio, linha
    `);
    
    console.log(`📋 Encontradas ${result.rows.length} linhas com escolas estaduais`);
    
    if (result.rows.length === 0) {
      console.log('✅ Nenhuma escola estadual encontrada');
      return;
    }
    
    // Mostrar preview das linhas que serão removidas
    console.log('\n📄 Linhas que serão removidas:');
    for (const row of result.rows.slice(0, 10)) { // Mostrar apenas as primeiras 10
      console.log(`- ${row.municipio}: Linha ${parseInt(row.linha) + 1}`);
    }
    
    if (result.rows.length > 10) {
      console.log(`... e mais ${result.rows.length - 10} linhas`);
    }
    
    // Remover todas as células das linhas identificadas
    let totalRemovidas = 0;
    
    for (const row of result.rows) {
      const deleteResult = await client.execute(`
        DELETE FROM celulas 
        WHERE municipio = ? AND linha = ?
      `, [row.municipio, row.linha]);
      
      totalRemovidas += deleteResult.rowsAffected || 0;
    }
    
    console.log(`\n✅ Removidas ${totalRemovidas} células de escolas estaduais`);
    console.log('🎯 Mantidas apenas escolas municipais e privadas');
    
  } catch (error) {
    console.error('❌ Erro ao remover escolas estaduais:', error);
    process.exit(1);
  }
}

// Executar o script
removerEscolasEstaduais()
  .then(() => {
    console.log('\n✨ Script finalizado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
