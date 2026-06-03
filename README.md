# Casa de Temporada · Olímpia/SP

Sistema próprio para **gestão de reservas** e **automação de comunicação** com hóspedes de uma casa de temporada. Roda **100% em Docker**, conecta-se **direto ao PostgreSQL** (sem Supabase) e já vem com **integração iCal do Airbnb**.

> **Status:** MVP — reservas manuais + sincronização Airbnb (iCal) + automação de WhatsApp.

---

## O que está incluído

- **Reservas manuais** com hóspede, período, pessoas, valor e status de pagamento.
- **Anti-overbooking no banco**: a constraint de exclusão do Postgres impede que duas reservas ativas ocupem o mesmo período — vale para reservas manuais **e** importadas do Airbnb.
- **Integração Airbnb (iCal)**: importa as datas bloqueadas do `.ics` do Airbnb (reservas e bloqueios), mantendo o calendário sincronizado. Conflitos com reservas manuais são detectados e reportados.
- **CRM de hóspedes** com contagem de estadias e marcação de recorrentes (2+).
- **Calendário** mensal de ocupação, com cores por origem (manual / Airbnb / bloqueio).
- **Modelos de mensagem** da jornada (confirmação → reconvite em 90 dias) com variáveis.
- **Motor de automação**: ao criar a reserva, toda a jornada é agendada; um *scheduler* dispara cada mensagem na hora certa e sincroniza o Airbnb periodicamente.
- **WhatsApp** via Cloud API (com **modo simulado** para testar sem conta/custo).

---

## Arquitetura (Docker Compose)

```
┌────────────┐     ┌────────────┐     ┌────────────────┐
│  scheduler │────▶│    app     │────▶│       db       │
│ (node puro)│ HTTP│ (Next.js)  │ SQL │ (PostgreSQL 16)│
└────────────┘     └────────────┘     └────────────────┘
   chama a cada       painel +            schema criado
   15/60 min       APIs /cron e          automaticamente
                   /sync-airbnb          na 1ª subida
```

- **db** — PostgreSQL 16. O `db/schema.sql` é executado automaticamente na primeira inicialização (tabelas + modelos de mensagem padrão).
- **app** — Next.js (painel e APIs), conecta no Postgres via `DATABASE_URL`.
- **scheduler** — serviço leve (Node puro, sem dependências) que chama `/api/cron` (mensagens, a cada 15 min) e `/api/sync-airbnb` (Airbnb, a cada 60 min).

---

## Como rodar (só precisa de Docker)

### 1. Pré-requisito
- **Docker** e **Docker Compose** instalados (Docker Desktop no Windows/Mac já traz os dois).

### 2. Configurar variáveis
Crie um arquivo `.env` na raiz do projeto (ao lado do `docker-compose.yml`):

```env
CRON_SECRET=um-token-aleatorio-forte
AIRBNB_ICAL_URL=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
CASA_NOME=Casa de Temporada Olímpia
```

> Pode deixar `AIRBNB_ICAL_URL` e as do WhatsApp em branco no começo. Sem WhatsApp configurado, o envio roda em **modo simulado** (aparece no log em vez de ir ao celular).

### 3. Subir tudo
```bash
docker compose up -d --build
```

Acesse **http://localhost:3000**

Para ver os logs (incluindo as mensagens "enviadas" em modo simulado):
```bash
docker compose logs -f app scheduler
```

Para derrubar:
```bash
docker compose down          # mantém os dados
docker compose down -v       # apaga também o banco (volume)
```

---

## Testando o fluxo completo

1. Em **Reservas → Nova reserva**, cadastre uma reserva com WhatsApp e check-in para **hoje**.
2. Vá em **Mensagens** e clique em **“Disparar mensagens agora”** (ou aguarde o scheduler).
3. Veja o status virar *Enviada* no histórico e o conteúdo aparecer em `docker compose logs -f app`.

### Sincronizar o Airbnb
1. No Airbnb: **Calendário → Disponibilidade → Sincronizar calendários → Exportar calendário** e copie a URL `.ics`.
2. Coloque-a em `AIRBNB_ICAL_URL` no `.env` e rode `docker compose up -d` de novo.
3. Em **Calendário**, clique em **“Sincronizar Airbnb”** (ou aguarde o ciclo de 60 min). As datas do Airbnb aparecem em laranja no calendário.

4. Para exportar suas reservas manuais como bloqueios para o Airbnb, use o feed iCal disponível em `/api/airbnb-ical?token=<seu-token>` (o painel de Reservas mostra a URL quando `NEXT_PUBLIC_AIRBNB_BLOCK_ICAL_SECRET` estiver configurado).

---

## Integrações — o que saber

### Airbnb (iCal)
O Airbnb **não tem API pública** para anfitriões individuais. O `.ics` traz apenas **datas bloqueadas**, sem dados do hóspede. Por isso o Airbnb serve para **bloquear o calendário** (evitar overbooking), enquanto a automação de mensagens funciona nas **reservas manuais**, onde você tem o contato do hóspede.

### WhatsApp (Cloud API da Meta)
Para enviar de verdade, configure uma conta no WhatsApp Business Platform (Meta direto ou via BSP como **360dialog** / **Twilio**) e preencha as variáveis. **Atenção:** mensagens proativas fora da janela de 24h (lembretes, agradecimento, reconvite) exigem **templates aprovados** pela Meta — o modelo "Reconvite" já vem marcado como tal.

---

## Rodar sem Docker (opcional, para desenvolvimento)

Precisa de Node 18+ e um Postgres rodando.
```bash
npm install
# crie o banco e rode db/schema.sql nele
cp .env.example .env.local   # ajuste DATABASE_URL para seu Postgres local
npm run dev
```

---

## Segurança (antes de produção)
Este MVP é single-user e o painel não tem login. Antes de expor na internet, adicione autenticação e proteja as rotas do painel. As rotas `/api/cron` e `/api/sync-airbnb` já são protegidas por `CRON_SECRET`.

---

## Estrutura

```
db/schema.sql              Banco (roda sozinho na 1ª subida do Postgres)
docker-compose.yml         Orquestra db + app + scheduler
Dockerfile                 Build standalone do Next.js
scheduler.mjs              Dispara /api/cron e /api/sync-airbnb
src/lib/db.ts              Conexão e queries (pg)
src/lib/airbnb.ts          Sincronização iCal do Airbnb
src/lib/messages.ts        Renderização de variáveis + agendamento
src/lib/whatsapp.ts        Envio WhatsApp (com modo simulado)
src/app/actions.ts         Server actions (reservas, hóspedes)
src/app/api/cron           Motor de automação (mensagens)
src/app/api/sync-airbnb    Sincronização do Airbnb
src/app/                   Telas: painel, calendário, reservas, hóspedes, mensagens
```

## Variáveis de mensagem
`{nome}` `{nome_completo}` `{checkin}` `{checkout}` `{pessoas}` `{valor}` `{noites}` `{casa}`
