
-- LIMPEZA ATÔMICA DE VERSÕES CONFLITANTES (Resolução Erro 42725)
-- Este bloco remove todas as assinaturas da função 'register_payment_transaction' 
-- independentemente dos parâmetros, limpando o cache do Postgres.

DO $$ 
DECLARE 
    _func_name text := 'register_payment_transaction';
    _routine record;
BEGIN
    FOR _routine IN 
        SELECT oid::regprocedure as signature
        FROM pg_proc 
        WHERE proname = _func_name 
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION ' || _routine.signature;
    END LOOP;
END $$;

-- CRIAÇÃO DA VERSÃO OFICIAL (11 PARÂMETROS)
CREATE OR REPLACE FUNCTION public.register_payment_transaction(
  p_amount numeric,
  p_brand text,
  p_client_id uuid,
  p_command_id uuid,
  p_description text,
  p_fee_amount numeric,
  p_installments integer,
  p_method text,
  p_net_value numeric,
  p_professional_id uuid,
  p_studio_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
BEGIN
  -- Inserção no fluxo financeiro (financial_transactions)
  INSERT INTO public.financial_transactions (
    studio_id,
    professional_id,
    client_id,
    command_id,
    amount,
    net_value,
    fee_amount,
    payment_method,
    type,
    category,
    description,
    status,
    date
  ) VALUES (
    p_studio_id,
    p_professional_id,
    p_client_id,
    p_command_id,
    p_amount,
    p_net_value,
    p_fee_amount,
    p_method,
    'income',
    'Serviço',
    p_description,
    'pago',
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Se for uma liquidação de comanda, atualiza status e data de fechamento
  IF p_command_id IS NOT NULL THEN
    UPDATE public.commands
    SET 
      status = 'paid',
      closed_at = NOW(),
      total_amount = p_amount
    WHERE id = p_command_id;
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- Permissões de execução
GRANT EXECUTE ON FUNCTION public.register_payment_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_payment_transaction TO service_role;

-- Força atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';
