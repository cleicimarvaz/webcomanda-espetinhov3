/* =================================================================================
   CONFIGURAÇÃO DO BANCO DE DADOS — V3
   ---------------------------------------------------------------------------------
   Este arquivo é o ponto central das credenciais usadas pelos módulos V3.

   ATENÇÃO:
   - Use somente uma chave pública/publishable no navegador.
   - Nunca coloque uma chave secreta/service_role neste arquivo.
   - A URL e a chave devem pertencer ao mesmo projeto Supabase.
   - Caso o banco V3 seja um projeto Supabase diferente do V2, ele terá sua
     própria URL e sua própria chave pública.
   ================================================================================= */

const SUPABASE_V3_URL = 'COLOQUE_A_URL_DO_BANCO_V3_AQUI';
const SUPABASE_V3_KEY = 'COLOQUE_A_CHAVE_PUBLICAVEL_DO_BANCO_V3_AQUI';

window.WEBCOMANDA_V3_CONFIG = Object.freeze({
    SUPABASE_URL: SUPABASE_V3_URL,
    SUPABASE_KEY: SUPABASE_V3_KEY
});
