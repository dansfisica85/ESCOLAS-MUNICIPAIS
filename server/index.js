import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Inicializa base NeDB persistente
const db = Datastore.create({ filename: path.join(__dirname, 'data.db'), autoload: true });
// Criar índice único para municipio+linha+coluna
db.ensureIndex({ fieldName: 'chave', unique: true });

const MUNICIPIOS = [
  'BARRINHA',
  'DUMOMT',
  'JARDINÓPOLIS',
  'PITANGUEIRAS',
  'PONTAL',
  'SERTÃOZINHO',
  'TERRA ROXA',
  'VIRADOURO'
];

app.get('/api/municipios', (req, res) => {
  res.json(MUNICIPIOS);
});

app.get('/api/celulas/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const rows = await db.find({ municipio });
  res.json(rows.map(r => ({ linha: r.linha, coluna: r.coluna, valor: r.valor || '' })));
});

app.post('/api/celulas/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  const { linha, coluna, valor } = req.body;
  if (typeof linha !== 'number' || typeof coluna !== 'number') {
    return res.status(400).json({ error: 'linha/coluna inválidas' });
  }
  const chave = `${municipio}-${linha}-${coluna}`;
  await db.update({ chave }, { $set: { chave, municipio, linha, coluna, valor: valor ?? '' } }, { upsert: true });
  res.json({ ok: true });
});

// Endpoint para limpar dados de um município (opcional)
app.delete('/api/celulas/:municipio', async (req, res) => {
  const municipio = req.params.municipio.toUpperCase();
  await db.remove({ municipio }, { multi: true });
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor iniciado na porta ' + PORT));
