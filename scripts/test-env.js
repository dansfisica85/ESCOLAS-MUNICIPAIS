import 'dotenv/config';

console.log('🔍 Verificando variáveis de ambiente...');
console.log('TURSO_DATABASE_URL:', process.env.TURSO_DATABASE_URL ? '✅ Definida' : '❌ Não definida');
console.log('TURSO_AUTH_TOKEN:', process.env.TURSO_AUTH_TOKEN ? '✅ Definida' : '❌ Não definida');

if (process.env.TURSO_DATABASE_URL) {
    console.log('URL:', process.env.TURSO_DATABASE_URL.substring(0, 50) + '...');
}
if (process.env.TURSO_AUTH_TOKEN) {
    console.log('Token:', process.env.TURSO_AUTH_TOKEN.substring(0, 20) + '...');
}