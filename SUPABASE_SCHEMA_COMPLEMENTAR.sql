
-- 1. FUNÇÃO PRINCIPAL (11 Parâmetros) - Garantindo que aceite TEXT para IDs
CREATE OR REPLACE FUNCTION public.register_payment_transaction(
  p_amount numeric,
  p_brand text DEFAULT NULL,
  p_client_id text DEFAULT NULL,
  p_command_id text DEFAULT NULL,
  p_description text DEFAULT 'Venda',
  p_fee_amount numeric DEFAULT 0,
  p_installments integer DEFAULT 1,
  p_method text DEFAULT 'pix',
  p_net_value numeric DEFAULT 0,
  p_professional_id text DEFAULT NULL,
  p_studio_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_u_client_id uuid;
  v_u_command_id uuid;
  v_u_professional_id uuid;
  v_u_studio_id uuid;
BEGIN
  -- Conversão segura: string vazia vira NULL, senão cast para UUID
  v_u_client_id := NULLIF(p_client_id, '')::uuid;
  v_u_command_id := NULLIF(p_command_id, '')::uuid;
  v_u_professional_id := NULLIF(p_professional_id, '')::uuid;
  v_u_studio_id := NULLIF(p_studio_id, '')::uuid;

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
    COALESCE(p_net_value, p_amount),
    p_fee_amount,
    p_method,
    'income',
    'Serviço',
    p_description,
    'pago',
    NOW(),
    v_u_client_id,
    v_u_command_id,
    v_u_professional_id,
    v_u_studio_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- 2. WRAPPER COMPATÍVEL (6 Parâmetros) - Resolve o erro "does not exist"
-- Recebe studio_id e professional_id como TEXT para suportar "" vindo do frontend
CREATE OR REPLACE FUNCTION public.register_payment_transaction(
  p_studio_id text,
  p_professional_id text,
  p_amount numeric,
  p_method text,
  p_brand text,
  p_installments integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encaminha para o overload de 11 parâmetros com valores padrão
  RETURN public.register_payment_transaction(
    p_amount          := p_amount,
    p_brand           := p_brand,
    p_client_id       := NULL,
    p_command_id      := NULL,
    p_description     := 'Venda PDV / Checkout',
    p_fee_amount      := 0,
    p_installments    := COALESCE(p_installments, 1),
    p_method          := p_method,
    p_net_value       := p_amount,
    p_professional_id := p_professional_id, -- NULLIF é tratado na função principal
    p_studio_id       := p_studio_id
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.register_payment_transaction(numeric, text, text, text, text, numeric, integer, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_payment_transaction(numeric, text, text, text, text, numeric, integer, text, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_payment_transaction(text, text, numeric, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_payment_transaction(text, text, numeric, text, text, integer) TO anon;

-- 3. VIEWS EXISTENTES
CREATE OR REPLACE VIEW public.v_command_payments_history AS
SELECT 
    cp.id,
    cp.command_id,
    cp.gross_amount,
    cp.fee_amount,
    cp.net_amount,
    cp.method,
    cp.brand,
    cp.installments,
    cp.created_at,
    COALESCE(c.nome, c.name, 'Consumidor Final') as client_name,
    p.name as professional_name
FROM public.command_payments cp
LEFT JOIN public.commands cmd ON cp.command_id = cmd.id
LEFT JOIN public.clients c ON cmd.client_id = c.id
LEFT JOIN public.professionals p ON cmd.professional_id = p.uuid_id;

CREATE OR REPLACE VIEW public.v_cashflow_detailed AS
SELECT 
    ft.id as transaction_id,
    ft.date,
    ft.description,
    ft.amount as gross_value,
    ft.fee_amount,
    ft.net_value,
    ft.type,
    ft.studio_id,
    ft.status,
    COALESCE(cl.nome, cl.name, 'Consumidor Final') as client_display_name,
    UPPER(
        CASE 
            WHEN ft.payment_method = 'cash' THEN 'DINHEIRO'
            WHEN ft.payment_method = 'pix' THEN 'PIX'
            WHEN ft.payment_method = 'credit' THEN 'CRÉDITO'
            WHEN ft.payment_method = 'debit' THEN 'DÉBITO'
            ELSE COALESCE(ft.payment_method, 'OUTRO')
        END
    ) as payment_channel,
    ft.payment_brand as brand
FROM public.financial_transactions ft
LEFT JOIN public.clients cl ON ft.client_id = cl.id;

GRANT SELECT ON public.v_command_payments_history TO authenticated;
GRANT SELECT ON public.v_cashflow_detailed TO authenticated;

-- Notificar recarga de schema para o PostgREST
NOTIFY pgrst, 'reload schema';
