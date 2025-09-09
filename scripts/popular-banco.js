import { createClient } from '@libsql/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function popularBanco() {
  console.log('🚀 Iniciando população do banco de dados...');
  
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

  // Mapear colunas do CSV para posições na tabela
  const colunas = [
    'Município',
    'Polo', 
    'CoEscolaCenso',
    'NOME DO PROFESSOR REGENTE',
    'CPF - PROFESSOR REGENTE', 
    'WHATSAPP PROF REGENTE',
    'NOME DO DIRETOR(A) DA UE',
    'CPF DIRETOR(A) DA UE',
    'WHATSAPP DIRETOR(A) DA UE',
    'UE - UNIDADE ESCOLAR',
    'Localização',
    'Rede',
    'Telefone1',
    'Telefone2',
    'CoTurmaCenso',
    'Turma',
    'Série',
    'Turno',
    'ObservacoesDaEscola',
    'TemCiencias',
    'QtdDiasAplicacao'
  ];

    const csvFile = path.join(__dirname, '..', 'ESCOLAS MUNICIPAIS - ESCOLAS MUNICIPAIS DE SERTÃOZINHO.csv');
  
  if (!fs.existsSync(csvFile)) {
    throw new Error(`Arquivo CSV não encontrado: ${csvFile}`);
  }
  
  return new Promise((resolve, reject) => {
    const resultados = [];
    let linhaAtual = 0;

    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (data) => {
        resultados.push(data);
      })
      .on('end', async () => {
        console.log(`📊 Processando ${resultados.length} registros...`);
        
        try {
          // Limpar dados existentes de Sertãozinho
          await client.execute({
            sql: 'DELETE FROM celulas WHERE municipio = ?',
            args: ['SERTÃOZINHO']
          });

          // Inserir cabeçalho
          for (let coluna = 0; coluna < colunas.length; coluna++) {
            await client.execute({
              sql: `INSERT OR REPLACE INTO celulas 
                    (municipio, linha, coluna, valor, tipo) 
                    VALUES (?, ?, ?, ?, ?)`,
              args: ['SERTÃOZINHO', 0, coluna, colunas[coluna], 'text']
            });
          }

          // Inserir dados
          for (let linha = 0; linha < resultados.length; linha++) {
            const registro = resultados[linha];
            
            for (let coluna = 0; coluna < colunas.length; coluna++) {
              const campo = colunas[coluna];
              const valor = registro[campo] || '';
              
              // Determinar tipo
              let tipo = 'text';
              if (/^\d+$/.test(valor)) {
                tipo = 'number';
              } else if (/^\(\d{2}\)\d{8,9}$/.test(valor)) {
                tipo = 'phone';
              } else if (/^\d{11}$/.test(valor)) {
                tipo = 'cpf';
              }

              await client.execute({
                sql: `INSERT OR REPLACE INTO celulas 
                      (municipio, linha, coluna, valor, tipo) 
                      VALUES (?, ?, ?, ?, ?)`,
                args: ['SERTÃOZINHO', linha + 1, coluna, valor, tipo]
              });
            }
            
            if ((linha + 1) % 10 === 0) {
              console.log(`📝 Processadas ${linha + 1} linhas...`);
            }
          }

          // Configurar dimensões da tabela para Sertãozinho
          await client.execute({
            sql: `INSERT OR REPLACE INTO configuracoes (municipio, linhas, colunas) 
                  VALUES (?, ?, ?)`,
            args: ['SERTÃOZINHO', resultados.length + 1, colunas.length]
          });

          console.log(`✅ Concluído! ${resultados.length + 1} linhas e ${colunas.length} colunas importadas para SERTÃOZINHO`);
          resolve();
        } catch (error) {
          console.error('❌ Erro ao processar dados:', error);
          reject(error);
        }
      })
      .on('error', reject);
  });
}

async function popularDadosExemplo() {
  console.log('📋 Populando dados de exemplo para outros municípios...');
  
  const municipios = [
    'BARRINHA', 'DUMOMT', 'JARDINÓPOLIS', 'PITANGUEIRAS',
    'PONTAL', 'TERRA ROXA', 'VIRADOURO'
  ];

  const colunas = [
    'Município', 'Escola', 'Diretor', 'Telefone', 'Endereço', 
    'Turma', 'Professor', 'Alunos', 'Observações'
  ];

  for (const municipio of municipios) {
    // Limpar dados existentes
    await client.execute({
      sql: 'DELETE FROM celulas WHERE municipio = ?',
      args: [municipio]
    });

    // Inserir cabeçalho
    for (let coluna = 0; coluna < colunas.length; coluna++) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO celulas 
              (municipio, linha, coluna, valor, tipo) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [municipio, 0, coluna, colunas[coluna], 'text']
      });
    }

    // Inserir algumas linhas de exemplo
    const exemplos = [
      [`${municipio}`, `Escola Municipal Centro`, 'Maria Silva', '(16) 3942-1234', 'Rua Principal, 123', '5º Ano A', 'João Santos', '25', 'Manhã'],
      [`${municipio}`, `Escola Municipal Vila`, 'José Oliveira', '(16) 3942-5678', 'Av. Escola, 456', '4º Ano B', 'Ana Costa', '30', 'Tarde'],
      [`${municipio}`, `EMEF ${municipio}`, 'Carlos Lima', '(16) 3942-9012', 'Rua Educação, 789', '3º Ano C', 'Paulo Rocha', '28', 'Manhã']
    ];

    for (let linha = 0; linha < exemplos.length; linha++) {
      for (let coluna = 0; coluna < exemplos[linha].length; coluna++) {
        await client.execute({
          sql: `INSERT OR REPLACE INTO celulas 
                (municipio, linha, coluna, valor, tipo) 
                VALUES (?, ?, ?, ?, ?)`,
          args: [municipio, linha + 1, coluna, exemplos[linha][coluna], 'text']
        });
      }
    }

    // Configurar dimensões
    await client.execute({
      sql: `INSERT OR REPLACE INTO configuracoes (municipio, linhas, colunas) 
            VALUES (?, ?, ?)`,
      args: [municipio, exemplos.length + 1, colunas.length]
    });

    console.log(`✅ ${municipio}: ${exemplos.length + 1} linhas e ${colunas.length} colunas`);
  }
}

// Executar
if (process.argv.includes('--popular')) {
  popularBanco()
    .then(() => popularDadosExemplo())
    .then(() => {
      console.log('🎉 População do banco concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

export { popularBanco, popularDadosExemplo };
