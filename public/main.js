const API = location.origin + '/api';

// Elementos DOM
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout');
const buscaInput = document.getElementById('busca');
const downloadTodasBtn = document.getElementById('download-todas');

const municipiosDiv = document.getElementById('municipios');
const areaTabela = document.getElementById('area-tabela');
const tituloMunicipio = document.getElementById('titulo-municipio');
const cabecalho = document.getElementById('cabecalho');
const corpo = document.getElementById('corpo');
const salvarBtn = document.getElementById('salvar');

// Estado
let token = localStorage.getItem('token');
let municipioAtual = null;
let cacheValores = new Map();
let alteracoesPendentes = false;

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

// Funcionalidade do botão de download
downloadTodasBtn.addEventListener('click', async () => {
  const textoOriginal = downloadTodasBtn.textContent;
  
  try {
    downloadTodasBtn.textContent = '⏳ Gerando arquivo...';
    downloadTodasBtn.disabled = true;
    
    // Criar link temporário para download
    const link = document.createElement('a');
    link.href = `${API}/export-all/excel`;
    link.download = 'todas-escolas-municipais.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Feedback de sucesso
    downloadTodasBtn.textContent = '✅ Baixado!';
    setTimeout(() => {
      downloadTodasBtn.textContent = textoOriginal;
    }, 3000);
    
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    downloadTodasBtn.textContent = '❌ Erro';
    setTimeout(() => {
      downloadTodasBtn.textContent = textoOriginal;
    }, 3000);
  } finally {
    downloadTodasBtn.disabled = false;
  }
});

async function selecionarMunicipio(m) {
  municipioAtual = m;
  tituloMunicipio.textContent = m;
  areaTabela.classList.remove('hidden');
  
  // Carregar configuração
  const configRes = await fetch(`${API}/configuracao/${encodeURIComponent(m)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const config = await configRes.json();
  
  montarTabela(config.linhas, config.colunas);
  cacheValores.clear();
  alteracoesPendentes = false;
  atualizarBotaoSalvar();
  await carregarValores(m);
}

function montarTabela(linhas, colunas) {
  // Cabeçalho simples - deixar o CSS fazer o trabalho de estilização
  cabecalho.innerHTML = '<th>LINHA</th>' + 
    Array.from({length: colunas}, (_, i) => `<th>COLUNA ${i+1}</th>`).join('');
  
  // Corpo
  corpo.innerHTML = '';
  for (let l = 0; l < linhas; l++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<th class="linha">L${l+1}</th>` + 
      Array.from({length: colunas}, (_, c) => {
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
    td.dataset.original = '';
    td.style.backgroundColor = '';
    td.classList.remove('palavra-cabecalho');
  });
  
  dados.forEach(({linha, coluna, valor, tipo}) => {
    const sel = `td[data-l="${linha}"][data-c="${coluna}"]`;
    const td = corpo.querySelector(sel);
    if (td) {
      td.textContent = valor;
      td.dataset.tipo = tipo || 'text';
      td.dataset.original = valor; // Armazenar valor original
      
      // Verificar se é uma palavra especial do cabeçalho
      if (isPalavraCabecalho(valor)) {
        td.classList.add('palavra-cabecalho');
      }
    }
  });
  
  // Resetar estado de alterações
  cacheValores.clear();
  alteracoesPendentes = false;
  atualizarBotaoSalvar();
}

// Lista de palavras especiais que devem ter formatação especial
const palavrasCabecalho = [
  'L1', 'Município', 'Polo', 'CoEscolaCenso', 'NOME DO PROFESSOR REGENTE', 
  'CPF - PROFESSOR REGENTE', 'WHATSAPP PROF REGENTE', 'NOME DO DIRETOR(A) DA UE', 
  'CPF DIRETOR(A) DA UE', 'WHATSAPP DIRETOR(A) DA UE', 'UE - UNIDADE ESCOLAR', 
  'Localização', 'Rede', 'Telefone1', 'Telefone2', 'CoTurmaCenso', 'Turma', 
  'Série', 'Turno', 'ObservacoesDaEscola', 'TemCiencias', 'QtdDiasAplicacao'
];

function isPalavraCabecalho(valor) {
  if (!valor) return false;
  const valorTrimmed = valor.trim();
  return palavrasCabecalho.some(palavra => 
    valorTrimmed === palavra || valorTrimmed.toUpperCase() === palavra.toUpperCase()
  );
}

function atualizarBotaoSalvar() {
  if (alteracoesPendentes) {
    salvarBtn.textContent = 'SALVAR *';
    salvarBtn.style.background = '#dc3545';
    salvarBtn.style.color = '#ffffff';
    salvarBtn.disabled = false;
  } else {
    salvarBtn.textContent = 'SALVAR';
    salvarBtn.style.background = '#28a745';
    salvarBtn.style.color = '#ffffff';
    salvarBtn.disabled = false;
  }
}

// Evento do botão salvar
salvarBtn.addEventListener('click', async () => {
  if (!municipioAtual || !alteracoesPendentes) return;
  
  salvarBtn.textContent = 'Salvando...';
  salvarBtn.disabled = true;
  
  try {
    // Coletar apenas as alterações pendentes
    const alteracoesParaSalvar = new Map();
    
    // Percorrer todas as células editáveis para detectar mudanças
    corpo.querySelectorAll('td[contenteditable]').forEach(td => {
      const linha = Number(td.dataset.l);
      const coluna = Number(td.dataset.c);
      const valorAtual = td.textContent.trim();
      const chave = `${linha}-${coluna}`;
      
      // Se a célula foi modificada, adicionar à lista de salvamento
      if (cacheValores.has(chave)) {
        alteracoesParaSalvar.set(chave, valorAtual);
      }
    });
    
    console.log(`Salvando ${alteracoesParaSalvar.size} alterações...`);
    
    // Salvar cada alteração
    for (const [chave, valor] of alteracoesParaSalvar.entries()) {
      const [linha, coluna] = chave.split('-').map(Number);
      const td = corpo.querySelector(`td[data-l="${linha}"][data-c="${coluna}"]`);
      const tipo = td?.dataset.tipo || 'text';
      
      const response = await fetch(`${API}/celulas/${encodeURIComponent(municipioAtual)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ linha, coluna, valor, tipo })
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao salvar célula L${linha+1}C${coluna+1}`);
      }
    }
    
    // Limpar cache de alterações após salvamento bem-sucedido
    cacheValores.clear();
    alteracoesPendentes = false;
    atualizarBotaoSalvar();
    
    // Feedback visual de sucesso
    salvarBtn.textContent = 'SALVO!';
    salvarBtn.style.background = '#28a745';
    
    setTimeout(() => {
      if (!alteracoesPendentes) {
        salvarBtn.textContent = 'SALVAR';
        atualizarBotaoSalvar();
      }
    }, 2000);
    
  } catch (error) {
    alert('Erro ao salvar dados: ' + error.message);
    console.error('Erro detalhado:', error);
    
    // Manter o estado de alterações pendentes em caso de erro
    salvarBtn.textContent = 'ERRO - TENTAR NOVAMENTE';
    salvarBtn.style.background = '#dc3545';
    
    setTimeout(() => {
      atualizarBotaoSalvar();
    }, 3000);
    
  } finally {
    salvarBtn.disabled = false;
  }
});

// Eventos de input nas células editáveis
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
  
  // Verificar se é uma palavra especial do cabeçalho e aplicar formatação
  if (isPalavraCabecalho(valor)) {
    td.classList.add('palavra-cabecalho');
  } else {
    td.classList.remove('palavra-cabecalho');
  }
  
  // Marcar célula como modificada
  const chave = `${linha}-${coluna}`;
  const valorOriginal = td.dataset.original || '';
  
  if (valor !== valorOriginal) {
    cacheValores.set(chave, valor);
    alteracoesPendentes = true;
    // Destacar célula modificada apenas se não for palavra especial
    if (!isPalavraCabecalho(valor)) {
      td.style.backgroundColor = '#fff3cd';
    }
  } else {
    cacheValores.delete(chave);
    // Remover indicador visual apenas se não for palavra especial
    if (!isPalavraCabecalho(valor)) {
      td.style.backgroundColor = '';
    }
    
    // Verificar se ainda há alterações pendentes
    alteracoesPendentes = cacheValores.size > 0;
  }
  
  atualizarBotaoSalvar();
});

// Função para baixar todas as planilhas em Markdown
async function baixarTodas() {
    try {
        // Solicitar senha de download
        const senha = prompt('Digite a senha para baixar as planilhas:');
        if (!senha) {
            return; // Usuário cancelou
        }
        
        // Mostrar loading
        const btn = document.getElementById('download-todas');
        const originalText = btn.textContent;
        btn.textContent = 'Baixando...';
        btn.disabled = true;
        
        const response = await fetch('/api/export-all/markdown', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: senha })
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Senha incorreta');
            }
            throw new Error(`Erro: ${response.status}`);
        }
        
        // Baixar arquivo
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'todas-escolas-municipais.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        alert('Download concluído com sucesso!');
        
    } catch (error) {
        console.error('Erro ao baixar:', error);
        alert('Erro ao baixar arquivo: ' + error.message);
    } finally {
        // Restaurar botão
        const btn = document.getElementById('download-todas');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Conectar evento do botão de download
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('download-todas');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', baixarTodas);
    }
});
