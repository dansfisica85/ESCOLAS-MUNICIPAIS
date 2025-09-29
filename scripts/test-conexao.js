import 'dotenv/config';
import { createClient } from '@libsql/client';

async function testarConexao() {
    console.log('🔗 Testando conexão com o banco Turso...');
    
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });

    try {
        // Teste simples
        const result = await client.execute('SELECT 1 as test');
        console.log('✅ Conexão bem-sucedida!', result.rows);
        
        // Verificar se a tabela existe
        const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('📋 Tabelas existentes:', tables.rows);
        
        // Criar tabela se não existir
        await client.execute(`
            CREATE TABLE IF NOT EXISTS celulas (
                id INTEGER PRIMARY KEY,
                municipio TEXT NOT NULL,
                linha INTEGER NOT NULL,
                coluna INTEGER NOT NULL,
                valor TEXT,
                tipo TEXT DEFAULT 'text'
            )
        `);
        console.log('✅ Tabela celulas criada/verificada');
        
        // Verificar dados existentes
        const count = await client.execute('SELECT COUNT(*) as total FROM celulas');
        console.log('📊 Registros existentes:', count.rows[0].total);
        
    } catch (error) {
        console.error('❌ Erro de conexão:', error);
    } finally {
        client.close();
    }
}

testarConexao();