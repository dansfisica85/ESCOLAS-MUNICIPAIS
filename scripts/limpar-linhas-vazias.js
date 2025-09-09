import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function removerLinhasCompletamenteVazias() {
  console.log('🔍 Buscando linhas completamente vazias...');
  
  try {
    const municipios = ['BARRINHA', 'DUMOMT', 'JARDINÓPOLIS', 'PITANGUEIRAS', 'PONTAL', 'SERTÃOZINHO', 'TERRA ROXA', 'VIRADOURO'];
    let totalCelulasRemovidas = 0;
    
    for (const municipio of municipios) {
      console.log(`\n📊 Analisando ${municipio}...`);
      
      // Encontrar todas as linhas que existem no banco
      const todasLinhasResult = await client.execute(`
        SELECT DISTINCT linha 
        FROM celulas 
        WHERE municipio = ?
        ORDER BY linha
      `, [municipio]);
      
      console.log(`📋 ${municipio}: ${todasLinhasResult.rows.length} linhas no banco`);
      
      // Para cada linha, verificar se tem pelo menos uma célula com conteúdo não vazio
      const linhasVazias = [];
      
      for (const linhaRow of todasLinhasResult.rows) {
        const linha = parseInt(linhaRow.linha);
        
        // Verificar se a linha tem pelo menos uma célula com conteúdo
        const celulasComConteudo = await client.execute(`
          SELECT COUNT(*) as count 
          FROM celulas 
          WHERE municipio = ? 
            AND linha = ? 
            AND valor IS NOT NULL 
            AND TRIM(valor) != ''
        `, [municipio, linha]);
        
        const temConteudo = parseInt(celulasComConteudo.rows[0].count) > 0;
        
        if (!temConteudo) {
          linhasVazias.push(linha);
        }
      }
      
      if (linhasVazias.length > 0) {
        console.log(`🗑️ ${municipio}: Encontradas ${linhasVazias.length} linhas vazias: ${linhasVazias.join(', ')}`);
        
        // Remover todas as células das linhas vazias
        for (const linha of linhasVazias) {
          const deleteResult = await client.execute(`
            DELETE FROM celulas 
            WHERE municipio = ? AND linha = ?
          `, [municipio, linha]);
          
          const removidas = deleteResult.rowsAffected || 0;
          totalCelulasRemovidas += removidas;
          console.log(`   ✅ Linha ${linha}: ${removidas} células removidas`);
        }
      } else {
        console.log(`✨ ${municipio}: Nenhuma linha completamente vazia encontrada`);
      }
      
      // Verificar quantas linhas restaram com conteúdo
      const linhasComConteudo = await client.execute(`
        SELECT COUNT(DISTINCT linha) as count 
        FROM celulas 
        WHERE municipio = ? 
          AND valor IS NOT NULL 
          AND TRIM(valor) != ''
      `, [municipio]);
      
      console.log(`📈 ${municipio}: ${linhasComConteudo.rows[0].count} linhas restantes com dados`);
    }
    
    console.log(`\n🎯 Total de células removidas: ${totalCelulasRemovidas}`);
    
    // Mostrar estatísticas finais detalhadas
    console.log('\n📊 Estatísticas finais por município:');
    for (const municipio of municipios) {
      const stats = await client.execute(`
        SELECT 
          COUNT(DISTINCT linha) as linhas_com_dados,
          COUNT(*) as total_celulas,
          COUNT(CASE WHEN valor IS NOT NULL AND TRIM(valor) != '' THEN 1 END) as celulas_preenchidas
        FROM celulas 
        WHERE municipio = ?
      `, [municipio]);
      
      const stat = stats.rows[0];
      console.log(`📋 ${municipio}: ${stat.linhas_com_dados} linhas | ${stat.celulas_preenchidas}/${stat.total_celulas} células preenchidas`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao remover linhas vazias:', error);
    process.exit(1);
  }
}

// Executar o script
removerLinhasCompletamenteVazias()
  .then(() => {
    console.log('\n✨ Limpeza de linhas vazias finalizada com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
