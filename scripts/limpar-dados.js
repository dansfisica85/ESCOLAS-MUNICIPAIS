import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function limparDados() {
  console.log('🧹 Limpando dados antigos...');
  
  const municipios = [
    'BARRINHA', 'DUMOMT', 'JARDINÓPOLIS', 'PITANGUEIRAS',
    'PONTAL', 'SERTÃOZINHO', 'TERRA ROXA', 'VIRADOURO',
    'ESCOLAS MUNICIPAIS DE SERTÃOZIN',
    'ESCOLAS MUNICIPAIS DE PITANGUEI', 
    'ESCOLAS MUNICIPAIS DE JARDINÓPO',
    'ESCOLAS MUNICIPAIS DE TERRA ROX'
  ];

  for (const municipio of municipios) {
    await client.execute({
      sql: 'DELETE FROM celulas WHERE municipio = ?',
      args: [municipio]
    });
    await client.execute({
      sql: 'DELETE FROM configuracoes WHERE municipio = ?', 
      args: [municipio]
    });
  }
  
  console.log('✅ Dados limpos!');
}

if (process.argv.includes('--limpar')) {
  limparDados()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { limparDados };
