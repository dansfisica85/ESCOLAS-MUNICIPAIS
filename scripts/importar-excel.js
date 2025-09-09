import { createClient } from '@libsql/client';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function importarExcel() {
  console.log('🚀 Iniciando importação completa do arquivo Excel...');
  
  // Garantir que as tabelas existem
  await client.execute(`
    CREATE TABLE IF NOT EXISTS celulas (
      id INTEGER PRIMARY KEY,
      municipio TEXT NOT NULL,
      linha INTEGER NOT NULL,
      coluna INTEGER NOT NULL,
      valor TEXT,
      tipo TEXT DEFAULT 'text',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      alterado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(municipio, linha, coluna)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      municipio TEXT PRIMARY KEY,
      linhas INTEGER DEFAULT 20,
      colunas INTEGER DEFAULT 8
    )
  `);

  const excelFile = path.join(__dirname, '..', 'ESCOLAS MUNICIPAIS.xlsx');
  
  try {
    // Ler arquivo Excel
    const workbook = XLSX.readFile(excelFile);
    console.log(`📊 Planilhas encontradas: ${workbook.SheetNames.join(', ')}`);

    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 Processando planilha: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const dados = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Usar índices numéricos como header
        defval: '', // Valor padrão para células vazias
        raw: false // Converter tudo para string
      });

      if (dados.length === 0) {
        console.log(`⚠️  Planilha ${sheetName} está vazia, pulando...`);
        continue;
      }

      // Mapear nome da planilha para município
      let municipio = sheetName.toUpperCase();
      
      // Normalizar nomes dos municípios
      const mapeamento = {
        'ESCOLAS MUNICIPAIS DE BARRINHA': 'BARRINHA',
        'ESCOLAS MUNICIPAIS DE DUMOMT': 'DUMOMT', 
        'ESCOLAS MUNICIPAIS DE JARDINÓPO': 'JARDINÓPOLIS',
        'ESCOLAS MUNICIPAIS DE JARDINÓPOLIS': 'JARDINÓPOLIS',
        'ESCOLAS MUNICIPAIS DE PITANGUEI': 'PITANGUEIRAS',
        'ESCOLAS MUNICIPAIS DE PITANGUEIRAS': 'PITANGUEIRAS',
        'ESCOLAS MUNICIPAIS DE PONTAL': 'PONTAL',
        'ESCOLAS MUNICIPAIS DE SERTÃOZIN': 'SERTÃOZINHO',
        'ESCOLAS MUNICIPAIS DE SERTÃOZINHO': 'SERTÃOZINHO',
        'ESCOLAS MUNICIPAIS DE TERRA ROX': 'TERRA ROXA',
        'ESCOLAS MUNICIPAIS DE TERRA ROXA': 'TERRA ROXA',
        'ESCOLAS MUNICIPAIS DE VIRADOURO': 'VIRADOURO'
      };

      if (mapeamento[sheetName]) {
        municipio = mapeamento[sheetName];
      }

      console.log(`🏛️  Município: ${municipio}`);

      // Limpar dados existentes
      await client.execute({
        sql: 'DELETE FROM celulas WHERE municipio = ?',
        args: [municipio]
      });

      // Encontrar dimensões reais da planilha
      let maxColunas = 0;
      dados.forEach(linha => {
        if (linha.length > maxColunas) {
          maxColunas = linha.length;
        }
      });

      console.log(`📐 Dimensões: ${dados.length} linhas × ${maxColunas} colunas`);

      // Importar TODOS os dados linha por linha
      for (let linha = 0; linha < dados.length; linha++) {
        const linhaDados = dados[linha];
        
        // Garantir que temos dados até a coluna máxima
        for (let coluna = 0; coluna < maxColunas; coluna++) {
          const valor = linhaDados[coluna] || '';
          const valorString = String(valor).trim();
          
          // Determinar tipo automaticamente
          let tipo = 'text';
          if (/^\d+$/.test(valorString)) {
            tipo = 'number';
          } else if (/^\(\d{2}\)\d{8,9}$/.test(valorString)) {
            tipo = 'phone';
          } else if (/^\d{11}$/.test(valorString)) {
            tipo = 'cpf';
          } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(valorString)) {
            tipo = 'date';
          } else if (valorString.toLowerCase() === 'sim' || valorString.toLowerCase() === 'não') {
            tipo = 'boolean';
          }

          await client.execute({
            sql: `INSERT OR REPLACE INTO celulas 
                  (municipio, linha, coluna, valor, tipo) 
                  VALUES (?, ?, ?, ?, ?)`,
            args: [municipio, linha, coluna, valorString, tipo]
          });
        }
        
        if ((linha + 1) % 50 === 0) {
          console.log(`📝 Processadas ${linha + 1}/${dados.length} linhas...`);
        }
      }

      // Configurar dimensões exatas
      await client.execute({
        sql: `INSERT OR REPLACE INTO configuracoes (municipio, linhas, colunas) 
              VALUES (?, ?, ?)`,
        args: [municipio, dados.length, maxColunas]
      });

      console.log(`✅ ${municipio}: ${dados.length} linhas × ${maxColunas} colunas importadas`);
    }

    console.log('\n🎉 Importação completa do Excel concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao importar Excel:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (process.argv.includes('--excel')) {
  importarExcel()
    .then(() => {
      console.log('🎯 Todos os dados do Excel foram importados com precisão!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Falha na importação:', error);
      process.exit(1);
    });
}

export { importarExcel };
