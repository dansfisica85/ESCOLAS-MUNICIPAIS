import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Mapeamento das linhas a serem removidas por município
const linhasParaRemover = {
  'BARRINHA': [2, 3, 4, 5, 6, 7, 8, 9, 10],
  'DUMOMT': [2, 3, 4],
  'JARDINÓPOLIS': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  'PITANGUEIRAS': [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37],
  'PONTAL': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  'SERTÃOZINHO': [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 83, 84, 85, 86, 87, 88, 89, 90],
  'TERRA ROXA': [2, 3, 4],
  'VIRADOURO': [2, 3, 4, 5, 6]
};

async function removerLinhasEspecificasERenumerar() {
  console.log('🔍 Iniciando remoção de linhas específicas e renumeração...');
  
  try {
    for (const [municipio, linhasRemover] of Object.entries(linhasParaRemover)) {
      console.log(`\n📊 Processando ${municipio}...`);
      console.log(`🗑️ Removendo linhas: ${linhasRemover.join(', ')}`);
      
      // Converter para índices baseados em 0 (banco usa 0-based)
      const linhasRemoverZeroBased = linhasRemover.map(l => l - 1);
      
      // 1. Remover as linhas especificadas
      let totalRemovidas = 0;
      for (const linha of linhasRemoverZeroBased) {
        const deleteResult = await client.execute(`
          DELETE FROM celulas 
          WHERE municipio = ? AND linha = ?
        `, [municipio, linha]);
        
        totalRemovidas += deleteResult.rowsAffected || 0;
      }
      
      console.log(`✅ ${municipio}: ${totalRemovidas} células removidas`);
      
      // 2. Buscar todas as linhas restantes ordenadas
      const linhasRestantes = await client.execute(`
        SELECT DISTINCT linha 
        FROM celulas 
        WHERE municipio = ?
        ORDER BY linha
      `, [municipio]);
      
      console.log(`📋 ${municipio}: ${linhasRestantes.rows.length} linhas restantes para renumerar`);
      
      // 3. Renumerar as linhas em sequência
      const linhasParaRenumerar = linhasRestantes.rows.map(r => parseInt(r.linha));
      
      for (let i = 0; i < linhasParaRenumerar.length; i++) {
        const linhaAtual = linhasParaRenumerar[i];
        const novaLinha = i; // Nova numeração sequencial começando de 0
        
        if (linhaAtual !== novaLinha) {
          await client.execute(`
            UPDATE celulas 
            SET linha = ? 
            WHERE municipio = ? AND linha = ?
          `, [novaLinha, municipio, linhaAtual]);
        }
      }
      
      // 4. Verificar resultado final
      const linhasFinais = await client.execute(`
        SELECT COUNT(DISTINCT linha) as total 
        FROM celulas 
        WHERE municipio = ?
      `, [municipio]);
      
      console.log(`🎯 ${municipio}: Renumeração concluída - ${linhasFinais.rows[0].total} linhas em sequência`);
    }
    
    // Estatísticas finais
    console.log('\n📈 Estatísticas finais após reorganização:');
    for (const municipio of Object.keys(linhasParaRemover)) {
      const stats = await client.execute(`
        SELECT 
          COUNT(DISTINCT linha) as linhas_total,
          MIN(linha) as primeira_linha,
          MAX(linha) as ultima_linha,
          COUNT(*) as total_celulas,
          COUNT(CASE WHEN valor IS NOT NULL AND TRIM(valor) != '' THEN 1 END) as celulas_preenchidas
        FROM celulas 
        WHERE municipio = ?
      `, [municipio]);
      
      const stat = stats.rows[0];
      console.log(`📋 ${municipio}: L${parseInt(stat.primeira_linha)+1}-L${parseInt(stat.ultima_linha)+1} (${stat.linhas_total} linhas) | ${stat.celulas_preenchidas}/${stat.total_celulas} células preenchidas`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante a reorganização:', error);
    process.exit(1);
  }
}

// Executar o script
removerLinhasEspecificasERenumerar()
  .then(() => {
    console.log('\n✨ Reorganização concluída com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
