import 'dotenv/config';

async function testarHTTP() {
    console.log('🔗 Testando HTTP API...');
    
    const url = 'https://turso-db-create-escolas-municipais-dansfisica85.aws-us-east-2.turso.io';
    const token = process.env.TURSO_AUTH_TOKEN;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                statements: [{ q: 'SELECT 1 as test' }]
            })
        });

        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));
        
        const text = await response.text();
        console.log('Response:', text);
        
        if (response.ok) {
            console.log('✅ Conexão HTTP bem-sucedida!');
        } else {
            console.log('❌ Erro na conexão HTTP');
        }
        
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testarHTTP();