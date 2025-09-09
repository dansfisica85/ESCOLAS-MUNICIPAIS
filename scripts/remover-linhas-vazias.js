import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function removerLinhasVazias() {
  console.log('🔍 Identificando linhas completamente vazias...');
  
  try {
    // Buscar todas as linhas com dados por município
    const municipios = ['BARRINHA', 'DUMOMT', 'JARDINÓPOLIS', 'PITANGUEIRAS', 'PONTAL', 'SERTÃOZINHO', 'TERRA ROXA', 'VIRADOURO'];
    
    let totalLinhasRemovidas = 0;
    
    for (const municipio of municipios) {
      console.log(`\n📊 Analisando ${municipio}...`);
      
      // Buscar todas as linhas que têm pelo menos uma célula com conteúdo
      const linhasComConteudo = await client.execute(`
        SELECT DISTINCT linha 
        FROM celulas 
        WHERE municipio = ? 
          AND (valor IS NOT NULL AND TRIM(valor) != '')
        ORDER BY linha
      `, [municipio]);
      
      console.log(`✅ ${municipio}: ${linhasComConteudo.rows.length} linhas com conteúdo`);
      
      // Buscar todas as linhas existentes
      const todasLinhas = await client.execute(`
        SELECT DISTINCT linha 
        FROM celulas 
        WHERE municipio = ?
        ORDER BY linha
      `, [municipio]);
      
      // Identificar linhas vazias (que existem mas não têm conteúdo)
      const linhasComConteudoSet = new Set(linhasComConteudo.rows.map(r => parseInt(r.linha)));
      const linhasVazias = todasLinhas.rows
        .map(r => parseInt(r.linha))
        .filter(linha => !linhasComConteudoSet.has(linha));
      
      if (linhasVazias.length > 0) {
        console.log(`🗑️ ${municipio}: Removendo ${linhasVazias.length} linhas vazias: ${linhasVazias.join(', ')}`);
        
        // Remover linhas vazias
        for (const linha of linhasVazias) {
          const deleteResult = await client.execute(`
            DELETE FROM celulas 
            WHERE municipio = ? AND linha = ?
          `, [municipio, linha]);
          
          totalLinhasRemovidas += deleteResult.rowsAffected || 0;
        }
      } else {
        console.log(`✨ ${municipio}: Nenhuma linha vazia encontrada`);
      }
    }
    
    console.log(`\n🎯 Total de células removidas de linhas vazias: ${totalLinhasRemovidas}`);
    
    // Mostrar estatísticas finais
    console.log('\n📈 Estatísticas finais por município:');
    for (const municipio of municipios) {
      const count = await client.execute(`
        SELECT COUNT(DISTINCT linha) as linhas 
        FROM celulas 
        WHERE municipio = ? 
          AND (valor IS NOT NULL AND TRIM(valor) != '')
      `, [municipio]);
      
      console.log(`📋 ${municipio}: ${count.rows[0].linhas} linhas com dados`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao remover linhas vazias:', error);
    process.exit(1);
  }
}

// Executar o script
removerLinhasVazias()
  .then(() => {
    console.log('\n✨ Limpeza de linhas vazias finalizada com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });
