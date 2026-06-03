-- ============================================================
-- Sistema de Gestão e Automação — Casa de Temporada (Olímpia/SP)
-- Schema PostgreSQL — MVP
-- ============================================================
-- Em Docker, roda automaticamente na 1ª subida. Manualmente: psql -f db/schema.sql
-- Ele cria tipos, tabelas, índices, regras de integridade e
-- popula modelos de mensagem padrão da jornada do hóspede.
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TIPOS (enums)
-- ------------------------------------------------------------
do $$ begin
  create type origem_reserva    as enum ('airbnb', 'manual', 'bloqueio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_pagamento  as enum ('pendente', 'parcial', 'pago');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_reserva    as enum ('confirmada', 'cancelada', 'concluida');
exception when duplicate_object then null; end $$;

do $$ begin
  create type canal_msg         as enum ('whatsapp', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gatilho_msg        as enum (
    'confirmacao',     -- na criação da reserva
    'antes_checkin',   -- X dias antes do check-in
    'dia_checkin',     -- no dia do check-in
    'durante',         -- durante a estadia
    'antes_checkout',  -- X dias antes do check-out
    'pos_checkout',    -- após o check-out (agradecimento)
    'reconvite'        -- X dias após o check-out (volte a Olímpia)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_envio      as enum ('agendada', 'enviada', 'falhou', 'lida', 'cancelada');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- HÓSPEDES (CRM)
-- ------------------------------------------------------------
create table if not exists hospedes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  telefone      text,                       -- E.164, ex: +5517999999999
  email         text,
  documento     text,                       -- CPF / passaporte (opcional)
  observacoes   text,
  preferencias  text,
  eh_recorrente boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_hospedes_telefone on hospedes (telefone);
create index if not exists idx_hospedes_nome      on hospedes (lower(nome));

-- ------------------------------------------------------------
-- RESERVAS
-- ------------------------------------------------------------
create table if not exists reservas (
  id                uuid primary key default gen_random_uuid(),
  hospede_id        uuid references hospedes (id) on delete set null,
  origem            origem_reserva   not null default 'manual',
  id_externo_airbnb text,                    -- UID do evento iCal (quando origem = airbnb)
  data_checkin      date not null,
  data_checkout     date not null,
  qtd_pessoas       int  not null default 1 check (qtd_pessoas > 0),
  valor             numeric(10,2),
  status_pagamento  status_pagamento not null default 'pendente',
  status_reserva    status_reserva   not null default 'confirmada',
  observacoes       text,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),

  constraint chk_datas check (data_checkout > data_checkin)
);

create index if not exists idx_reservas_checkin   on reservas (data_checkin);
create index if not exists idx_reservas_checkout  on reservas (data_checkout);
create index if not exists idx_reservas_hospede   on reservas (hospede_id);
create unique index if not exists idx_reservas_airbnb
  on reservas (id_externo_airbnb) where id_externo_airbnb is not null;

-- REGRA ANTI-CONFLITO (overbooking): nenhuma reserva ATIVA pode
-- sobrepor o intervalo de datas de outra reserva ativa.
-- Usamos um índice de exclusão com daterange [checkin, checkout).
create extension if not exists btree_gist;

alter table reservas drop constraint if exists nao_sobrepor_datas;
alter table reservas add constraint nao_sobrepor_datas
  exclude using gist (
    daterange(data_checkin, data_checkout, '[)') with &&
  )
  where (status_reserva <> 'cancelada');

-- ------------------------------------------------------------
-- MODELOS DE MENSAGEM
-- ------------------------------------------------------------
create table if not exists modelos_mensagem (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  canal         canal_msg   not null default 'whatsapp',
  gatilho       gatilho_msg not null,
  offset_dias   int not null default 0,      -- negativo = antes; positivo = depois
  -- referência da data: 'checkin' ou 'checkout' (confirmacao ignora e dispara na hora)
  referencia    text not null default 'checkin' check (referencia in ('checkin','checkout','criacao')),
  hora_envio    time not null default '09:00',
  -- WhatsApp: mensagens proativas fora da janela 24h exigem TEMPLATE aprovado pela Meta.
  eh_template   boolean not null default false,
  nome_template text,                        -- nome do template aprovado na Meta
  texto_template text not null,              -- corpo com variáveis {nome}, {checkin}, etc.
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create unique index if not exists idx_modelos_nome on modelos_mensagem (nome);

-- ------------------------------------------------------------
-- MENSAGENS (agenda + histórico)
-- ------------------------------------------------------------
create table if not exists mensagens (
  id             uuid primary key default gen_random_uuid(),
  reserva_id     uuid references reservas (id) on delete cascade,
  hospede_id     uuid references hospedes (id) on delete set null,
  modelo_id      uuid references modelos_mensagem (id) on delete set null,
  canal          canal_msg not null default 'whatsapp',
  gatilho        gatilho_msg not null,
  conteudo_final text,                        -- texto já com variáveis substituídas
  status         status_envio not null default 'agendada',
  agendada_para  timestamptz not null,
  enviada_em     timestamptz,
  erro           text,
  criado_em      timestamptz not null default now()
);

create index if not exists idx_mensagens_pendentes
  on mensagens (status, agendada_para) where status = 'agendada';
create index if not exists idx_mensagens_reserva  on mensagens (reserva_id);
create index if not exists idx_mensagens_hospede  on mensagens (hospede_id);

-- ------------------------------------------------------------
-- TRIGGER: atualizar atualizado_em automaticamente
-- ------------------------------------------------------------
create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_hospedes_upd on hospedes;
create trigger trg_hospedes_upd before update on hospedes
  for each row execute function set_atualizado_em();

drop trigger if exists trg_reservas_upd on reservas;
create trigger trg_reservas_upd before update on reservas
  for each row execute function set_atualizado_em();

-- ============================================================
-- SEED — Modelos de mensagem padrão da jornada do hóspede
-- (Você poderá editar todos pelo painel depois.)
-- ============================================================
insert into modelos_mensagem (nome, gatilho, referencia, offset_dias, hora_envio, eh_template, texto_template)
values
('Confirmação da reserva', 'confirmacao', 'criacao', 0, '09:00', false,
 'Olá {nome}! Sua reserva na nossa casa em Olímpia está confirmada. 🎉

Check-in: {checkin}
Check-out: {checkout}
Hóspedes: {pessoas}
Valor: {valor}

Qualquer dúvida, é só chamar por aqui. Até logo!'),

('Lembrete pré-estadia (3 dias antes)', 'antes_checkin', 'checkin', -3, '10:00', false,
 'Oi {nome}! Faltam poucos dias para sua estadia em Olímpia. 🌞

Seu check-in é dia {checkin}, a partir das 14h.
Endereço: [PREENCHER ENDEREÇO]
Como chegar: [LINK GOOGLE MAPS]

Em breve enviaremos as orientações de entrada. Boa viagem!'),

('Lembrete pré-estadia (1 dia antes)', 'antes_checkin', 'checkin', -1, '10:00', false,
 'Excelente dia {nome}! 😃

Aqui é a Sté, sua anfitriã em Olímpia!
Sua estadia na Sté House já está chegando e quero garantir que vocês tenham todas as informações para um check-in tranquilo:

📅 Check-in: {checkin} – a partir das 14h
📅 Check-out: {checkout} – até às 13h
📍 Endereço: Rua Maria Thereza Dutra Neves, 69 - Jardim Botânico - Olimpia/SP - 15400-642

📶 Wi-Fi:
Rede: STÉ HOUSE
Senha: STEhouse123

🛌 Enxoval e Limpeza:
* Atenção: Não fornecemos enxoval (roupas de cama, fronhas, toalhas de banho e cobertas). Por favor, não esqueçam de trazer os seus.
* Cozinha e Limpeza: Disponibilizamos como cortesia panos de prato e panos de limpeza.

⚡ Informações importantes:
* Voltagem da casa: 110V. Algumas tomadas são 220V (identificadas com cor vermelha). Tenha cuidado ao conectar aparelhos.

🛎️ Instruções para o Check-in:
* O portão é aberto remotamente. Ao chegar, me envie mensagem que liberarei sua entrada.

📜 Regras da casa:
* Check-out até às 13h: Evitar atrasos, pois a limpeza é feita logo após sua saída.
* Proibido som alto.
* Não são permitidas visitas extras ou inclusão de hóspedes sem autorização prévia.
* Qualquer dano à casa será cobrado conforme necessidade.

Se precisar de algo antes da chegada, estou por aqui para ajudar!

Desejo uma ótima viagem e que venham com Deus 🙏💙
Até breve!
Abraços,
Sté 🥰'),

('Mensagem no dia do check-in', 'dia_checkin', 'checkin', 0, '08:00', false,
 'Bom dia, {nome}! Hoje é o dia do seu check-in. 🏡

Check-in a partir das 14h.
Senha do portão: [PREENCHER]
Wi-Fi: [REDE / SENHA]
Regras da casa: [LINK]

Estamos à disposição. Aproveite Olímpia!'),

('Durante a estadia (dia seguinte)', 'durante', 'checkin', 1, '11:00', false,
 'Oi {nome}, tudo certo por aí? 😊 Está precisando de alguma coisa para a estadia? É só me avisar!'),

('Lembrete de check-out (1 dia antes)', 'antes_checkout', 'checkout', -1, '18:00', false,
 'Olá {nome}! Passando para lembrar que o check-out é amanhã, dia {checkout}, até as 11h.

Antes de sair: [INSTRUÇÕES DE SAÍDA].
Foi um prazer receber você!'),

('Agradecimento pós-estadia', 'pos_checkout', 'checkout', 1, '10:00', false,
 'Oi {nome}! Esperamos que tenha tido uma ótima estadia em Olímpia. 💛
Obrigado por escolher nossa casa! Se puder, deixe sua avaliação — ajuda muito.
Até a próxima!'),

('Reconvite (90 dias depois)', 'reconvite', 'checkout', 90, '10:00', true,
 'Oi {nome}! Sentimos sua falta em Olímpia. 🌴 Que tal voltar a se hospedar com a gente? Temos condições especiais para quem já é da casa. Quer ver as datas disponíveis?')
on conflict (nome) do nothing;

-- ------------------------------------------------------------
-- DESPESAS (controle financeiro)
-- ------------------------------------------------------------
create table if not exists despesas (
  id          uuid primary key default gen_random_uuid(),
  descricao   text not null,
  categoria   text not null default 'geral',   -- limpeza, manutencao, material, plataformas, impostos, agua_luz_gas, internet, geral
  valor       numeric(10,2) not null check (valor > 0),
  data        date not null,
  observacoes text,
  criado_em   timestamptz not null default now()
);

create index if not exists idx_despesas_data on despesas (data);

-- ============================================================
-- Observação: no MVP single-user o app acessa o banco diretamente
-- via DATABASE_URL (sem RLS). Ao adicionar autenticação multiusuário,
-- considere ativar Row Level Security e políticas por usuário.
-- ============================================================
