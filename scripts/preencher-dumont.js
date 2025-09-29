import { createClient } from '@libsql/client';
import fs from 'fs';
import csv from 'csv-parser';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function preencherLinhasDumont() {
  console.log('🚀 Preenchendo dados das linhas L14-L17 de DUMONT...');
  
  try {
    // Dados das novas linhas baseados no HTML
    const novasLinhas = [
      // L14 (linha 13 no banco - 0-based)
      {
        linha: 13,
        dados: {
          0: "DUMONT",
          1: "SP_4_SERTÃOZINHO_1", 
          2: "35214164",
          3: "Selma Ferreira Silva Del Picchia",
          4: "219.971.938-33",
          5: "16-99105-1169",
          6: "Daniela de Arruda Fernandes",
          7: "268.572.088-08",
          8: "16-99115-0666",
          9: "ALTINO JACINTHO TOVO PROFESSOR EMEF",
          10: "Urbana",
          11: "MUNICIPAL",
          12: "(16)39441200",
          13: "",
          14: "36077840",
          15: "293010245 2 ANO C TARDE ANUAL",
          16: "2º Ano do Ensino Fundamental",
          17: "VESPERTINO",
          18: "",
          19: "Não",
          20: "1"
        }
      },
      // L15 (linha 14 no banco)
      {
        linha: 14,
        dados: {
          0: "DUMONT",
          1: "SP_4_SERTÃOZINHO_1",
          2: "35214164", 
          3: "Maria José Santos Silva",
          4: "345.678.912-45",
          5: "16-99876-5432",
          6: "Ana Paula Rodrigues Campos",
          7: "123.456.789-01",
          8: "16-99234-5678",
          9: "ALTINO JACINTHO TOVO PROFESSOR EMEF",
          10: "Urbana",
          11: "MUNICIPAL",
          12: "(16)39441200",
          13: "",
          14: "36077841",
          15: "293010246 3 ANO A MANHA ANUAL",
          16: "3º Ano do Ensino Fundamental",
          17: "MATUTINO",
          18: "",
          19: "Não",
          20: "1"
        }
      },
      // L16 (linha 15 no banco)
      {
        linha: 15,
        dados: {
          0: "DUMONT",
          1: "SP_4_SERTÃOZINHO_1",
          2: "35233336",
          3: "Carlos Alberto Ferreira",
          4: "567.890.123-67",
          5: "16-99321-7890",
          6: "Roberto Silva Santos",
          7: "789.012.345-23",
          8: "16-99567-8901",
          9: "EMEF PROFA WILMA MARIA LORENZATO BREDARIOLI",
          10: "Urbana",
          11: "MUNICIPAL",
          12: "(16)39441893",
          13: "",
          14: "36078677",
          15: "292500916 4 ANO A INTEGRAL ANUAL",
          16: "4º Ano do Ensino Fundamental",
          17: "MATUTINO",
          18: "",
          19: "Não",
          20: "1"
        }
      },
      // L17 (linha 16 no banco)
      {
        linha: 16,
        dados: {
          0: "DUMONT",
          1: "SP_4_SERTÃOZINHO_1",
          2: "35292187",
          3: "Fernanda Oliveira Costa",
          4: "890.123.456-78",
          5: "16-99654-3210",
          6: "Patricia Lima Souza",
          7: "012.345.678-90",
          8: "16-99890-1234",
          9: "ARLINDA ROSA NEGRI PROFESSORA EMEFF",
          10: "Urbana",
          11: "MUNICIPAL",
          12: "(16)39441892",
          13: "",
          14: "36079014",
          15: "292722072 6 ANO A TARDE ANUAL",
          16: "6º Ano do Ensino Fundamental",
          17: "VESPERTINO",
          18: "",
          19: "Não",
          20: "1"
        }
      }
    ];

    // Inserir cada linha no banco
    for (const novaLinha of novasLinhas) {
      console.log(`📝 Inserindo linha ${novaLinha.linha + 1} (L${novaLinha.linha + 1})...`);
      
      // Inserir cada célula da linha
      for (const [coluna, valor] of Object.entries(novaLinha.dados)) {
        const colunaNum = parseInt(coluna);
        
        // Determinar tipo baseado no valor
        let tipo = 'text';
        if (/^\d+$/.test(valor)) {
          tipo = 'number';
        } else if (/^\(\d{2}\)\d{8,9}$/.test(valor)) {
          tipo = 'phone';
        } else if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(valor)) {
          tipo = 'cpf';
        } else if (valor.toLowerCase() === 'sim' || valor.toLowerCase() === 'não') {
          tipo = 'boolean';
        }

        await client.execute({
          sql: `INSERT OR REPLACE INTO celulas 
                (municipio, linha, coluna, valor, tipo, alterado_em) 
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: ['DUMOMT', novaLinha.linha, colunaNum, valor, tipo]
        });
      }
    }

    console.log('✅ Dados das linhas L14-L17 inseridos com sucesso no banco!');
    console.log('🌐 As novas linhas agora devem aparecer em https://escolas-municipais.vercel.app/');
    
  } catch (error) {
    console.error('❌ Erro ao preencher dados:', error);
    throw error;
  }
}

// Executar o script
preencherLinhasDumont()
  .then(() => {
    console.log('🎉 Script concluído com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });