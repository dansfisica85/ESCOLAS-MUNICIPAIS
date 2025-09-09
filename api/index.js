import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import csv from 'csv-parser';
import csvWriter from 'csv-writer';
import XLSX from 'xlsx';
import { createClient } from '@libsql/client';
import { createReadStream, createWriteStream, unlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configuração do banco Turso
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const JWT_SECRET = process.env.JWT_SECRET || 'chave-secreta-dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Multer para upload
const upload = multer({ dest: '/tmp/' });

// Inicialização do banco
async function initDB() {
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
    CREATE TABLE IF NOT EXISTS historico (
      id INTEGER PRIMARY KEY,
      municipio TEXT NOT NULL,
      linha INTEGER NOT NULL,
      coluna INTEGER NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      municipio TEXT PRIMARY KEY,
      linhas INTEGER DEFAULT 20,
      colunas INTEGER DEFAULT 8
    )
  `);
}

// Middleware de autenticação
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token necessário' });
  
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

const MUNICIPIOS = [
  'BARRINHA', 'DUMOMT', 'JARDINÓPOLIS', 'PITANGUEIRAS',
  'PONTAL', 'SERTÃOZINHO', 'TERRA ROXA', 'VIRADOURO'
];

// Rotas de autenticação
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, success: true });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

// Rotas públicas
app.get('/api/municipios', (req, res) => {
  res.json(MUNICIPIOS);
});

// Rotas protegidas
app.use('/api', authenticate);

app.get('/api/configuracao/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const result = await client.execute({
    sql: 'SELECT * FROM configuracoes WHERE municipio = ?',
    args: [municipio]
  });
  
  if (result.rows.length === 0) {
    res.json({ linhas: 20, colunas: 8 });
  } else {
    res.json({ linhas: result.rows[0].linhas, colunas: result.rows[0].colunas });
  }
});

app.post('/api/configuracao/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const { linhas, colunas } = req.body;
  
  await client.execute({
    sql: `INSERT OR REPLACE INTO configuracoes (municipio, linhas, colunas) 
          VALUES (?, ?, ?)`,
    args: [municipio, linhas, colunas]
  });
  
  res.json({ ok: true });
});

app.get('/api/celulas/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const { busca } = req.query;
  
  let sql = 'SELECT linha, coluna, valor, tipo FROM celulas WHERE municipio = ?';
  let args = [municipio];
  
  if (busca) {
    sql += ' AND valor LIKE ?';
    args.push(`%${busca}%`);
  }
  
  const result = await client.execute({ sql, args });
  res.json(result.rows);
});

app.post('/api/celulas/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const { linha, coluna, valor, tipo = 'text' } = req.body;
  
  if (typeof linha !== 'number' || typeof coluna !== 'number') {
    return res.status(400).json({ error: 'linha/coluna inválidas' });
  }
  
  // Buscar valor anterior para histórico
  const anterior = await client.execute({
    sql: 'SELECT valor FROM celulas WHERE municipio = ? AND linha = ? AND coluna = ?',
    args: [municipio, linha, coluna]
  });
  
  const valorAnterior = anterior.rows[0]?.valor || '';
  
  // Salvar no histórico
  await client.execute({
    sql: `INSERT INTO historico (municipio, linha, coluna, valor_anterior, valor_novo) 
          VALUES (?, ?, ?, ?, ?)`,
    args: [municipio, linha, coluna, valorAnterior, valor || '']
  });
  
  // Atualizar célula
  await client.execute({
    sql: `INSERT OR REPLACE INTO celulas 
          (municipio, linha, coluna, valor, tipo, alterado_em) 
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [municipio, linha, coluna, valor || '', tipo]
  });
  
  res.json({ ok: true });
});

app.get('/api/historico/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const result = await client.execute({
    sql: `SELECT * FROM historico WHERE municipio = ? 
          ORDER BY timestamp DESC LIMIT 100`,
    args: [municipio]
  });
  res.json(result.rows);
});

app.delete('/api/celulas/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  await client.execute({
    sql: 'DELETE FROM celulas WHERE municipio = ?',
    args: [municipio]
  });
  res.json({ ok: true });
});

// Exportar CSV
app.get('/api/export/:municipio/csv', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const result = await client.execute({
    sql: 'SELECT linha, coluna, valor FROM celulas WHERE municipio = ? ORDER BY linha, coluna',
    args: [municipio]
  });
  
  const csvData = result.rows.map(row => ({
    linha: row.linha,
    coluna: row.coluna,
    valor: row.valor
  }));
  
  const writer = csvWriter.createObjectCsvWriter({
    path: '/tmp/export.csv',
    header: [
      { id: 'linha', title: 'Linha' },
      { id: 'coluna', title: 'Coluna' },
      { id: 'valor', title: 'Valor' }
    ]
  });
  
  await writer.writeRecords(csvData);
  res.download('/tmp/export.csv', `${municipio}.csv`);
});

// Nova rota para exportar todas as planilhas em um arquivo Excel
app.get('/api/export-all/excel', async (req, res) => {
  try {
    const workbook = XLSX.utils.book_new();
    
    for (const municipio of MUNICIPIOS) {
      console.log(`Exportando ${municipio}...`);
      
      // Buscar dados do município
      const result = await client.execute({
        sql: `SELECT linha, coluna, valor FROM celulas 
              WHERE municipio = ? 
              ORDER BY linha, coluna`,
        args: [municipio]
      });
      
      // Criar matriz de dados
      const maxLinha = Math.max(...result.rows.map(r => parseInt(r.linha)), 0);
      const maxColuna = Math.max(...result.rows.map(r => parseInt(r.coluna)), 0);
      
      const dados = [];
      
      // Criar cabeçalho
      const cabecalho = ['LINHA'];
      for (let c = 0; c <= maxColuna; c++) {
        cabecalho.push(`COLUNA ${c + 1}`);
      }
      dados.push(cabecalho);
      
      // Criar linhas de dados
      for (let l = 0; l <= maxLinha; l++) {
        const linha = [`L${l + 1}`];
        for (let c = 0; c <= maxColuna; c++) {
          const celula = result.rows.find(r => 
            parseInt(r.linha) === l && parseInt(r.coluna) === c
          );
          linha.push(celula ? celula.valor || '' : '');
        }
        dados.push(linha);
      }
      
      // Adicionar planilha ao workbook
      const worksheet = XLSX.utils.aoa_to_sheet(dados);
      XLSX.utils.book_append_sheet(workbook, worksheet, municipio);
    }
    
    // Gerar arquivo Excel
    const filename = `/tmp/todas-escolas-municipais-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, filename);
    
    res.download(filename, 'todas-escolas-municipais.xlsx', () => {
      unlinkSync(filename);
    });
    
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    res.status(500).json({ error: 'Erro ao gerar arquivo Excel' });
  }
});

// Importar CSV
app.post('/api/import/:municipio/csv', upload.single('file'), async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const results = [];
  
  createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        if (row.linha && row.coluna) {
          await client.execute({
            sql: `INSERT OR REPLACE INTO celulas 
                  (municipio, linha, coluna, valor, alterado_em) 
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [municipio, parseInt(row.linha), parseInt(row.coluna), row.valor || '']
          });
        }
      }
      unlinkSync(req.file.path);
      res.json({ ok: true, imported: results.length });
    });
});

initDB().catch(console.error);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor iniciado na porta ${PORT}`));

export default app;
