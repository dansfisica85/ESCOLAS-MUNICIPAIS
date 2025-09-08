const API = location.origin + '/api';

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout');
const buscaInput = document.getElementById('busca');

const municipiosDiv = document.getElementById('municipios');
const areaTabela = document.getElementById('area-tabela');
const tituloMunicipio = document.getElementById('titulo-municipio');
const cabecalho = document.getElementById('cabecalho');
const corpo = document.getElementById('corpo');

const configLinhas = document.getElementById('config-linhas');
const configColunas = document.getElementById('config-colunas');
const aplicarConfigBtn = document.getElementById('aplicar-config');

const historicoBtn = document.getElementById('historico-btn');
const historicoPanel = document.getElementById('historico-panel');
const fecharHistoricoBtn = document.getElementById('fechar-historico');
const historicoLista = document.getElementById('historico-lista');

const exportarCsvBtn = document.getElementById('exportar-csv');
const importarCsvInput = document.getElementById('importar-csv');
const limparBtn = document.getElementById('limpar');

// Estado
let token = localStorage.getItem('token');
let municipioAtual = null;
let cacheValores = new Map();
let LINHAS = 20;
let COLUNAS = 8;

// Verificar autenticação inicial
if (token) {
  verificarToken();
} else {
  mostrarLogin();
}

function mostrarLogin() {
  loginScreen.classList.remove('hidden');
  app.classList.add('hidden');
}

function mostrarApp() {
  loginScreen.classList.add('hidden');
  app.classList.remove('hidden');
  carregarMunicipios();
}

async function verificarToken() {
  try {
    const res = await fetch(API + '/municipios', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      mostrarApp();
    } else {
      localStorage.removeItem('token');
      token = null;
      mostrarLogin();
    }
  } catch {
    mostrarLogin();
  }
}

// Eventos de login
loginBtn.addEventListener('click', fazerLogin);
passwordInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') fazerLogin();
});

async function fazerLogin() {
  const password = passwordInput.value;
  try {
    const res = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    
    const data = await res.json();
    if (data.success) {
      token = data.token;
      localStorage.setItem('token', token);
      mostrarApp();
      loginError.classList.add('hidden');
    } else {
      loginError.textContent = data.error;
      loginError.classList.remove('hidden');
    }
  } catch (err) {
    loginError.textContent = 'Erro de conexão';
    loginError.classList.remove('hidden');
  }
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  token = null;
  mostrarLogin();
});

// Busca
let buscaTimeout;
buscaInput.addEventListener('input', () => {
  if (buscaTimeout) clearTimeout(buscaTimeout);
  buscaTimeout = setTimeout(() => {
    if (municipioAtual) carregarValores(municipioAtual);
  }, 300);
});

async function carregarMunicipios() {
  const res = await fetch(API + '/municipios', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dados = await res.json();
  municipiosDiv.innerHTML = '';
  dados.forEach(m => {
    const b = document.createElement('button');
    b.textContent = m;
    b.addEventListener('click', () => selecionarMunicipio(m));
    municipiosDiv.appendChild(b);
  });
}

async function selecionarMunicipio(m) {
  municipioAtual = m;
  tituloMunicipio.textContent = m;
  areaTabela.classList.remove('hidden');
  
  // Carregar configuração
  const configRes = await fetch(`${API}/configuracao/${encodeURIComponent(m)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const config = await configRes.json();
  LINHAS = config.linhas;
  COLUNAS = config.colunas;
  configLinhas.value = LINHAS;
  configColunas.value = COLUNAS;
  
  montarTabela();
  cacheValores.clear();
  await carregarValores(m);
}

function montarTabela() {
  // Cabeçalho
  cabecalho.innerHTML = '<th>#</th>' + 
    Array.from({length: COLUNAS}, (_, i) => `<th>C${i+1}</th>`).join('');
  
  // Corpo
  corpo.innerHTML = '';
  for (let l = 0; l < LINHAS; l++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th class="linha">L${l+1}</th>` + 
      Array.from({length: COLUNAS}, (_, c) => {
        return `<td contenteditable data-l="${l}" data-c="${c}" data-tipo="text"></td>`;
      }).join('');
    corpo.appendChild(tr);
  }
}

async function carregarValores(m) {
  const busca = buscaInput.value.trim();
  const params = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  
  const res = await fetch(`${API}/celulas/${encodeURIComponent(m)}${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dados = await res.json();
  
  // Limpar tabela
  corpo.querySelectorAll('td[contenteditable]').forEach(td => {
    td.textContent = '';
    td.dataset.tipo = 'text';
  });
  
  dados.forEach(({linha, coluna, valor, tipo}) => {
    const sel = `td[data-l="${linha}"][data-c="${coluna}"]`;
    const td = corpo.querySelector(sel);
    if (td) {
      td.textContent = valor;
      td.dataset.tipo = tipo || 'text';
      cacheValores.set(`${linha}-${coluna}`, valor);
    }
  });
}

// Configuração de linhas/colunas
aplicarConfigBtn.addEventListener('click', async () => {
  const novasLinhas = parseInt(configLinhas.value);
  const novasColunas = parseInt(configColunas.value);
  
  if (novasLinhas < 1 || novasColunas < 1 || novasLinhas > 100 || novasColunas > 20) {
    alert('Valores inválidos (linhas: 1-100, colunas: 1-20)');
    return;
  }
  
  await fetch(`${API}/configuracao/${encodeURIComponent(municipioAtual)}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ linhas: novasLinhas, colunas: novasColunas })
  });
  
  LINHAS = novasLinhas;
  COLUNAS = novasColunas;
  montarTabela();
  await carregarValores(municipioAtual);
});

// Salvamento de células
let timeout;
corpo.addEventListener('input', e => {
  const td = e.target.closest('td[contenteditable]');
  if (!td || municipioAtual == null) return;
  
  const linha = Number(td.dataset.l);
  const coluna = Number(td.dataset.c);
  const valor = td.textContent.trim();
  
  // Detectar tipo automaticamente
  let tipo = 'text';
  if (/^\d+$/.test(valor)) {
    tipo = 'number';
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    tipo = 'date';
  }
  
  td.dataset.tipo = tipo;
  cacheValores.set(`${linha}-${coluna}`, valor);
  
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(salvarAlteracoes, 600);
});

async function salvarAlteracoes() {
  if (!municipioAtual) return;
  const entradas = Array.from(cacheValores.entries());
  
  for (const [chave, valor] of entradas) {
    const [linha, coluna] = chave.split('-').map(Number);
    const td = corpo.querySelector(`td[data-l="${linha}"][data-c="${coluna}"]`);
    const tipo = td?.dataset.tipo || 'text';
    
    await fetch(`${API}/celulas/${encodeURIComponent(municipioAtual)}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ linha, coluna, valor, tipo })
    });
  }
}

// Histórico
historicoBtn.addEventListener('click', async () => {
  if (!municipioAtual) return;
  
  const res = await fetch(`${API}/historico/${encodeURIComponent(municipioAtual)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const historico = await res.json();
  
  historicoLista.innerHTML = historico.map(h => `
    <div class="historico-item">
      <strong>L${h.linha + 1}C${h.coluna + 1}</strong><br>
      "${h.valor_anterior}" → "${h.valor_novo}"<br>
      <small>${new Date(h.timestamp).toLocaleString('pt-BR')}</small>
    </div>
  `).join('');
  
  historicoPanel.classList.remove('hidden');
});

fecharHistoricoBtn.addEventListener('click', () => {
  historicoPanel.classList.add('hidden');
});

// Exportar CSV
exportarCsvBtn.addEventListener('click', () => {
  if (!municipioAtual) return;
  window.open(`${API}/export/${encodeURIComponent(municipioAtual)}/csv`, '_blank');
});

// Importar CSV
importarCsvInput.addEventListener('change', async (e) => {
  if (!municipioAtual || !e.target.files[0]) return;
  
  const formData = new FormData();
  formData.append('file', e.target.files[0]);
  
  const res = await fetch(`${API}/import/${encodeURIComponent(municipioAtual)}/csv`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  
  const result = await res.json();
  if (result.ok) {
    alert(`${result.imported} registros importados`);
    await carregarValores(municipioAtual);
  }
  
  e.target.value = '';
});

// Limpar dados
limparBtn.addEventListener('click', async () => {
  if (!municipioAtual) return;
  if (!confirm('Tem certeza que deseja apagar todos os dados deste município?')) return;
  
  await fetch(`${API}/celulas/${encodeURIComponent(municipioAtual)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  
  await selecionarMunicipio(municipioAtual);
});
