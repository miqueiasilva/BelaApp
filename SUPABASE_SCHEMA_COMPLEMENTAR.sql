
-- =============================================================================
-- (A) SQL COMPLETO DE ESTABILIZAÇÃO E BLINDAGEM
-- =============================================================================

-- 1. CONFIGURAÇÃO DA FUNÇÃO OFICIAL (v2)
-- Identifica a assinatura dinâmica para evitar erros de "function does not exist"
DO $$ 
DECLARE 
    _sig text;
BEGIN
    SELECT oid::regprocedure::text INTO _sig 
    FROM pg_proc 
    WHERE proname = 'register_payment_transaction_v2' 
    AND pronamespace = 'public'::regnamespace;

    IF _sig IS NOT NULL THEN
        -- Aplicar Segurança Máxima e Caminho de Busca Protegido
        EXECUTE 'ALTER FUNCTION ' || _sig || ' SECURITY DEFINER SET search_path = public';
        -- Gestão de Permissões: Restrito a usuários autenticados e role de serviço
        EXECUTE 'REVOKE ALL ON FUNCTION ' || _sig || ' FROM public';
        EXECUTE 'GRANT EXECUTE ON FUNCTION ' || _sig || ' TO authenticated, service_role';
        RAISE NOTICE 'Função % configurada com sucesso.', _sig;
    ELSE
        RAISE NOTICE 'Aviso: register_payment_transaction_v2 não encontrada para ajuste de privilégios.';
    END IF;
END $$;

-- 2. DESATIVAÇÃO DE FUNÇÕES LEGADAS (Revoga execução sem apagar código)
DO $$ 
DECLARE 
    _legacy_func record;
BEGIN
    FOR _legacy_func IN 
        SELECT oid::regprocedure as signature
        FROM pg_proc 
        WHERE (proname IN ('register_payment_transaction', 'pay_latest_open_command_v6') 
           OR proname LIKE 'pay_and_close_command%')
        AND proname != 'register_payment_transaction_v2'
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'REVOKE EXECUTE ON FUNCTION ' || _legacy_func.signature || ' FROM authenticated, public';
        RAISE NOTICE 'Acesso revogado para legado: %', _legacy_func.signature;
    END LOOP;
END $$;

-- 3. NORMALIZAÇÃO RETROATIVA DE DATA INTEGRITY
-- Garante que todos os registros usem o uuid_id canônico da tabela professionals
BEGIN;

-- Normalizar Comandas
UPDATE public.commands c
SET professional_id = p.uuid_id
FROM public.professionals p
WHERE (c.professional_id = p.team_member_id OR c.professional_id = p.professional_uuid)
  AND c.professional_id != p.uuid_id;

-- Normalizar Agendamentos
UPDATE public.appointments a
SET professional_id = p.uuid_id
FROM public.professionals p
WHERE (a.professional_id = p.team_member_id OR a.professional_id = p.professional_uuid)
  AND a.professional_id != p.uuid_id;

COMMIT;

-- 4. RE-NOTIFICAÇÃO DE SCHEMA
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- (B) SMOKE TESTS (Copiáveis para o SQL Editor)
-- =============================================================================
/*
-- TESTE 1: Comandas com professional_id órfão ou não-canônico (Deve retornar 0)
SELECT count(*) as "Comandas_Invalidas"
FROM public.commands c
LEFT JOIN public.professionals p ON p.uuid_id = c.professional_id
WHERE c.professional_id IS NOT NULL AND p.uuid_id IS NULL;

-- TESTE 2: Agendamentos com professional_id inválido (Deve retornar 0)
SELECT count(*) as "Agendamentos_Invalidos"
FROM public.appointments a
LEFT JOIN public.professionals p ON p.uuid_id = a.professional_id
WHERE a.professional_id IS NOT NULL AND p.uuid_id IS NULL;

-- TESTE 3: Verificar permissões da V2 (Deve listar apenas authenticated e service_role)
SELECT grantee, privilege_type 
FROM information_schema.role_routine_grants 
WHERE routine_name = 'register_payment_transaction_v2';
*/
