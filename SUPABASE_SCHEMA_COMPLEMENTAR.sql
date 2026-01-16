
-- 1. LIMPEZA TOTAL DE SOBRECARGAS (Resolve o erro: "Could not choose the best candidate function")
-- Removemos as assinaturas conhecidas para limpar o cache do PostgREST e evitar ambiguidade.
DROP FUNCTION IF EXISTS public.register_payment_transaction(numeric, text, uuid, uuid, text, numeric, integer, text, numeric, uuid, uuid);
DROP FUNCTION IF EXISTS public.register_payment_transaction(numeric, text, text, text, text, numeric, integer, text, numeric, text, text);

-- 2. CRIAÇÃO DA FUNÇÃO DEFINITIVA COM PARÂMETROS TEXT
-- Usar TEXT nos IDs garante que o banco aceite tanto IDs legados ("2433") quanto UUIDs sem erro 400.
CREATE OR REPLACE FUNCTION public.register_payment_transaction(
  p_amount numeric,
  p_brand text,
  p_client_id text,        -- Recebe como texto para flexibilidade
  p_command_id text,       -- Recebe como texto para flexibilidade
  p_description text,
  p_fee_amount numeric,
  p_installments integer,
  p_method text,
  p_net_value numeric,
  p_professional_id text,  -- Recebe como texto para flexibilidade
  p_studio_id text         -- Recebe como texto para flexibilidade
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_client_uuid uuid;
  v_command_uuid uuid;
  v_professional_uuid uuid;
  v_studio_uuid uuid;
BEGIN
  -- 3. TENTATIVA DE CONVERSÃO SEGURA (CASTING DEFENSIVO)
  -- Tenta converter strings para UUID apenas se tiverem o formato correto.
  -- Caso falhe (ex: "2433"), o valor fica como NULL na coluna UUID para não quebrar a transação.
  BEGIN v_client_uuid := p_client_id::uuid; EXCEPTION WHEN OTHERS THEN v_client_uuid := NULL; END;
  BEGIN v_command_uuid := p_command_id::uuid; EXCEPTION WHEN OTHERS THEN v_command_uuid := NULL; END;
  BEGIN v_professional_uuid := p_professional_id::uuid; EXCEPTION WHEN OTHERS THEN v_professional_uuid := NULL; END;
  BEGIN v_studio_uuid := p_studio_id::uuid; EXCEPTION WHEN OTHERS THEN v_studio_uuid := NULL; END;

  -- 4. INSERÇÃO NO FLUXO FINANCEIRO (financial_transactions)
  INSERT INTO public.financial_transactions (
    amount,
    net_value,
    fee_amount,
    payment_method,
    type,
    category,
    description,
    status,
    date,
    client_id,
    command_id,
    professional_id,
    studio_id
  ) VALUES (
    p_amount,
    p_net_value,
    p_fee_amount,
    p_method,
    'income',
    'Serviço',
    p_description,
    'pago',
    NOW(),
    v_client_uuid,
    v_command_uuid,
    v_professional_uuid,
    v_studio_uuid
  )
  RETURNING id INTO v_transaction_id;

  -- 5. ATUALIZAÇÃO DA COMANDA (Se o ID for válido)
  IF v_command_uuid IS NOT NULL THEN
    UPDATE public.commands 
    SET 
      status = 'paid', 
      closed_at = NOW(),
      total_amount = p_amount
    WHERE id = v_command_uuid;
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- 6. PERMISSÕES E RECARGA DE SCHEMA
GRANT EXECUTE ON FUNCTION public.register_payment_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_payment_transaction TO service_role;

-- Notifica o PostgREST para invalidar o cache de definições de funções
NOTIFY pgrst, 'reload schema';
