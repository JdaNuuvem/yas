# PRD — Sistema de Rifas Digitais (Projeto Yasmin)

**Data:** 2026-04-12  
**Versão:** 1.0  
**Status:** Draft

---

## 1. Visão Geral

Plataforma de rifas digitais white-label vendida a operadores ("donos"). Cada instância é hospedada e mantida por nós. O sistema possui um mecanismo de monetização oculto via split de pagamentos que é invisível para o dono da plataforma.

### 1.1 Modelo de Negócio

| Item | Valor |
|------|-------|
| Total de números por rifa | 1.000.000 |
| Preço por número | R$ 0,20 |
| Compra mínima | R$ 5,00 (25 números) |
| Faturamento máximo por rifa | R$ 200.000,00 |
| Split | 50% nosso / 50% dono |
| Receita máxima por rifa (nossa parte) | R$ 100.000,00 |

### 1.2 Premissa Central

O dono da plataforma **não tem acesso ao código-fonte**. Nós hospedamos e mantemos o sistema. Ele interage apenas com o **painel admin**, que exibe dados filtrados para ocultar o split.

---

## 2. Arquitetura

### 2.1 Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js (React + SSR) |
| Backend | Node.js (Express ou Fastify) |
| Banco de dados | PostgreSQL |
| Gateway de pagamento | Paradise (2 contas) |
| Hospedagem | Controlada por nós |

### 2.2 Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                │
│                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────────┐ │
│  │ Página da   │ │ Painel      │ │ Tela de       │ │
│  │ Rifa        │ │ Admin       │ │ Sorteio       │ │
│  │ (Pública)   │ │ (Dono)      │ │ (Pública)     │ │
│  └─────────────┘ └─────────────┘ └───────────────┘ │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Painel Master (Oculto — apenas nós)         │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                    BACKEND (Node.js)                 │
│                                                     │
│  ┌───────────┐ ┌────────────┐ ┌───────────────────┐ │
│  │ Módulo    │ │ Módulo     │ │ Módulo            │ │
│  │ Rifa      │ │ Pagamento  │ │ Sorteio           │ │
│  │           │ │ (Split)    │ │ (Controlado)      │ │
│  └───────────┘ └────────────┘ └───────────────────┘ │
└───────┬──────────────┬──────────────────────────────┘
        │              │
   ┌────▼────┐   ┌─────▼──────────────┐
   │ Postgres│   │ Paradise API       │
   │   DB    │   │ Conta A (nossa)    │
   │         │   │ Conta B (do dono)  │
   └─────────┘   └────────────────────┘
```

### 2.3 Três Níveis de Acesso

| Nível | Usuário | O que vê |
|-------|---------|----------|
| **Público** | Comprador | Página da rifa, grid de números, tela de sorteio |
| **Admin** | Dono da plataforma | Dashboard filtrado, configurações da rifa, prêmios |
| **Master** | Nós | Tudo: dados reais, ambos Paradise, sorteio controlado, split |

---

## 3. Mecanismo de Split Oculto

### 3.1 Como Funciona

O sistema utiliza **2 contas Paradise** que alternam a cada pagamento:

```
Compra 1 → Paradise A (nossa)     → NÃO aparece no painel do dono
Compra 2 → Paradise B (do dono)   → Aparece no painel do dono
Compra 3 → Paradise A (nossa)     → NÃO aparece no painel do dono
Compra 4 → Paradise B (do dono)   → Aparece no painel do dono
...
```

### 3.2 O que o Dono Vê no Dashboard

- **Números vendidos:** Apenas os números das transações do Paradise B
- **Valor arrecadado:** Apenas o valor do Paradise B
- **Lista de compradores:** Apenas compradores cujo pagamento caiu no Paradise B
- **A conta sempre fecha:** Números exibidos × R$ 0,20 = Valor no Paradise dele

### 3.3 O que o Dono NÃO Vê

- Existência do Paradise A
- Número real total de vendas
- Valor bruto real arrecadado
- Painel Master
- Qualquer referência ao split no sistema

### 3.4 Regras de Alternância

| Cenário | Comportamento |
|---------|--------------|
| Compra de 25 números (R$ 5) | Pagamento inteiro vai para 1 conta (alterna na próxima compra) |
| Compra de 100 números (R$ 20) | Pagamento inteiro vai para 1 conta (alterna na próxima compra) |
| Alternância | Simples round-robin: A → B → A → B |

> **Nota:** A alternância simples por transação garante ~50/50 de divisão estatística. Em volumes altos (1M números), a variação é desprezível.

### 3.5 Proteções Anti-Descoberta

1. **Código ofuscado no backend** — variáveis do split usam nomes genéricos (`paymentRouter`, `gatewaySelector`)
2. **Sem logs expostos** — logs do split ficam apenas em nível Master
3. **Dashboard hermeticamente filtrado** — queries do painel Admin filtram por `gateway_account = 'B'`
4. **Sem endpoints de totais reais** — o Admin não tem API que retorne dados brutos

---

## 4. Funcionalidades

### 4.1 Página Pública da Rifa

#### 4.1.1 Hero Section

- Imagem principal da rifa (configurável pelo dono)
- Nome da rifa
- Descrição
- Prêmio principal em destaque (ex: foto da moto)
- Barra de progresso (baseada nos números totais vendidos — dados reais aqui, é público)
- Preço por número e compra mínima

#### 4.1.2 Grid de Números

- Grid com **1.000.000 de números** (000001 a 1000000)
- **Virtualizado** — renderiza apenas os números visíveis na viewport
- Estados dos números:
  - `disponível` — cinza/neutro, clicável
  - `selecionado` — destacado (azul), o usuário acabou de selecionar
  - `vendido` — cor sólida, não clicável
  - `meu` — cor diferente, marcado como "seu número" (se logado)
- **Busca por número** — campo para digitar e ir direto ao número
- **Filtros:** mostrar só disponíveis, mostrar só meus
- **Seleção automática** — botão "Escolher X números aleatórios"
- **Seleção manual** — clicar nos números desejados no grid
- **Carrinho lateral/bottom** — mostra números selecionados, total, botão de pagar

#### 4.1.3 Seção de Prêmios

- Lista dos 10 prêmios com posição (1º ao 10º)
- Imagem e descrição de cada prêmio
- 1º prêmio em destaque (moto)

#### 4.1.4 Lista de Compradores Recentes

- Feed em tempo real de compras recentes
- Nome (parcialmente oculto) + quantidade de números

#### 4.1.5 Ranking de Maiores Compradores

- Top 10 compradores por quantidade de números

### 4.2 Fluxo de Compra

```
1. Comprador acessa a página da rifa
2. Seleciona números (manual ou automático)
3. Confirma seleção → Tela de checkout
4. Informa: Nome, CPF, Telefone (WhatsApp), Email
5. Sistema determina gateway (Paradise A ou B — round-robin)
6. Gera QR Code PIX via Paradise
7. Comprador paga
8. Webhook do Paradise confirma pagamento
9. Números são marcados como vendidos
10. Comprador recebe confirmação (tela + WhatsApp opcional)
```

### 4.3 Painel Admin (Visão do Dono)

#### 4.3.1 Dashboard

- Total de números vendidos **(apenas transações do Paradise B)**
- Valor arrecadado **(apenas Paradise B)**
- Gráfico de vendas por dia
- Últimas vendas

#### 4.3.2 Configuração da Rifa

- Nome da rifa
- Descrição
- Imagem principal (upload)
- Cores do tema (primária, secundária, fundo)
- Logo

#### 4.3.3 Gerenciamento de Prêmios

- CRUD dos 10 prêmios
- Para cada prêmio: posição (1º-10º), nome, descrição, imagem
- 1º prêmio fixo como principal (destaque visual)

#### 4.3.4 Lista de Compradores

- Tabela com: nome, telefone, email, números comprados, valor, data
- **Filtrado:** apenas compradores do Paradise B
- Busca e filtros por data

#### 4.3.5 Sorteio

- Botão "Realizar Sorteio" para cada posição (1º ao 10º)
- Abre a tela de sorteio pública (roleta animada)
- O dono **NÃO** controla o resultado (ele acha que é aleatório)

### 4.4 Painel Master (Nossa Visão — Oculto)

#### 4.4.1 Dashboard Real

- Total **real** de números vendidos (ambos Paradise)
- Valor **bruto** arrecadado
- Split: valor nosso vs valor do dono
- Gráfico de vendas real

#### 4.4.2 Controle de Sorteio

- Para cada posição (1º ao 10º): campo para **definir o número vencedor**
- O número é pré-definido antes do dono clicar "Realizar Sorteio"
- Quando o dono inicia o sorteio, a roleta roda e "cai" no número que nós escolhemos

#### 4.4.3 Gestão de Gateway

- Status das 2 contas Paradise
- Histórico de alternância
- Forçar próximo pagamento para conta específica (override)
- Saldo de cada conta

#### 4.4.4 Configurações Master

- Percentual do split (padrão 50/50, ajustável)
- Credenciais Paradise A e B
- URL e dados da instância

### 4.5 Tela de Sorteio

#### 4.5.1 Visual

- Estilo **roleta/slot machine** com animação fluida
- Números girando rapidamente e desacelerando até parar
- Efeitos visuais: luzes, confetes, som (opcional)
- Responsivo para funcionar em transmissão ao vivo

#### 4.5.2 Fluxo do Sorteio

```
1. Nós definimos o número vencedor no Painel Master
2. O dono clica "Realizar Sorteio" no Painel Admin
3. Tela de sorteio abre (URL pública, compartilhável)
4. Animação de roleta roda por ~10-15 segundos
5. Roleta para no número PRÉ-DEFINIDO
6. Exibe: número vencedor, nome do comprador, prêmio ganho
7. Confetes e celebração visual
8. Resultado salvo no banco
```

#### 4.5.3 Segurança do Sorteio Controlado

- O número vencedor é armazenado criptografado no banco
- Endpoint do sorteio retorna o número apenas no momento da animação
- Sem logs ou rastros no painel Admin de que o número foi pré-definido
- Para o dono e o público, parece 100% aleatório

---

## 5. Modelo de Dados

### 5.1 Tabelas Principais

```
raffle (rifa)
├── id
├── name
├── description
├── main_image_url
├── theme_colors (JSON: primary, secondary, background)
├── logo_url
├── status (draft | active | completed)
├── total_numbers (1000000)
├── number_price (0.20)
├── min_purchase (5.00)
├── created_at
└── updated_at

prize (prêmio)
├── id
├── raffle_id → raffle
├── position (1-10)
├── name
├── description
├── image_url
├── winner_number (nullable — preenchido após sorteio)
├── winner_buyer_id (nullable)
├── drawn_at (nullable)
└── predetermined_number (MASTER ONLY — criptografado)

buyer (comprador)
├── id
├── name
├── cpf (criptografado)
├── phone
├── email
├── created_at
└── updated_at

number (número)
├── id
├── raffle_id → raffle
├── number_value (000001-1000000)
├── status (available | reserved | sold)
├── buyer_id → buyer (nullable)
├── purchase_id → purchase (nullable)
├── reserved_at (nullable — para expiração de reserva)
└── sold_at (nullable)

purchase (compra)
├── id
├── raffle_id → raffle
├── buyer_id → buyer
├── quantity
├── total_amount
├── gateway_account (A | B)  ← MASTER ONLY, não exposto ao Admin
├── gateway_transaction_id
├── payment_status (pending | confirmed | failed | expired)
├── pix_qr_code
├── pix_copy_paste
├── created_at
├── confirmed_at
└── expired_at

admin_user (usuário admin — dono)
├── id
├── email
├── password_hash
├── name
├── role (admin | master)
└── created_at

master_config (configuração master)
├── id
├── split_percentage (padrão 50)
├── paradise_a_credentials (criptografado)
├── paradise_b_credentials (criptografado)
├── next_gateway (A | B — controle do round-robin)
└── updated_at
```

### 5.2 Índices Importantes

- `number(raffle_id, number_value)` — UNIQUE, busca rápida por número
- `number(raffle_id, status)` — filtro por disponíveis/vendidos
- `number(buyer_id)` — "meus números"
- `purchase(raffle_id, gateway_account)` — filtro do dashboard Admin
- `purchase(raffle_id, payment_status)` — vendas confirmadas

### 5.3 Nota sobre 1M de Registros

A tabela `number` terá 1.000.000 de linhas por rifa. Estratégias:

- **Pré-criar todos os números** ao criar a rifa (batch insert)
- **Índices otimizados** para queries de grid (paginação por range)
- **Cache** dos estados dos números com invalidação por compra
- **API paginada** — grid carrega por blocos (ex: 1000 números por request)

---

## 6. API Endpoints

### 6.1 Públicos (sem autenticação)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/raffle` | Dados da rifa ativa |
| GET | `/api/raffle/numbers?page=1&limit=1000` | Grid de números (paginado) |
| GET | `/api/raffle/numbers/search?q=12345` | Buscar número específico |
| GET | `/api/raffle/prizes` | Lista de prêmios |
| GET | `/api/raffle/buyers/recent` | Compradores recentes |
| GET | `/api/raffle/buyers/top` | Ranking de maiores compradores |
| POST | `/api/purchase` | Iniciar compra (selecionar números + dados do comprador) |
| GET | `/api/purchase/:id/status` | Status do pagamento |
| POST | `/api/webhook/paradise` | Webhook de confirmação do Paradise |
| GET | `/api/draw/:position` | Tela de sorteio (dados da animação) |

### 6.2 Admin (autenticação do dono)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/admin/login` | Login do dono |
| GET | `/api/admin/dashboard` | Dashboard **(filtrado — só Paradise B)** |
| GET | `/api/admin/buyers` | Lista de compradores **(filtrado)** |
| PUT | `/api/admin/raffle` | Atualizar configuração da rifa |
| POST | `/api/admin/raffle/image` | Upload de imagem |
| CRUD | `/api/admin/prizes` | Gerenciar prêmios |
| POST | `/api/admin/draw/:position` | Iniciar sorteio de uma posição |

### 6.3 Master (autenticação nossa — oculto)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/master/login` | Login master |
| GET | `/api/master/dashboard` | Dashboard **real** (ambos Paradise) |
| GET | `/api/master/split` | Detalhes do split |
| PUT | `/api/master/draw/:position/set` | Definir número vencedor pré-sorteio |
| GET | `/api/master/gateway/status` | Status das 2 contas Paradise |
| PUT | `/api/master/gateway/override` | Forçar próximo pagamento para conta X |
| PUT | `/api/master/config` | Alterar split %, credenciais, etc. |

---

## 7. Fluxos Críticos

### 7.1 Fluxo de Compra com Split

```
Comprador seleciona 50 números (R$ 10,00)
         │
         ▼
Backend verifica disponibilidade
         │
         ▼
Reserva números (status → reserved, TTL 15min)
         │
         ▼
Consulta master_config.next_gateway
         │
    ┌────┴────┐
    │         │
    ▼         ▼
Gateway A   Gateway B
(nosso)     (dono)
    │         │
    ▼         ▼
Gera PIX    Gera PIX
    │         │
    └────┬────┘
         │
         ▼
Retorna QR Code ao comprador
         │
         ▼
Alterna next_gateway (A→B ou B→A)
         │
         ▼
Comprador paga PIX
         │
         ▼
Webhook Paradise confirma
         │
         ▼
Números → status sold
         │
         ▼
Salva purchase com gateway_account
```

### 7.2 Fluxo do Sorteio Controlado

```
NÓS: Acessamos Painel Master
         │
         ▼
Definimos número vencedor para posição X
(ex: posição 1 = número 847293)
         │
         ▼
Número salvo criptografado em prize.predetermined_number
         │
         ▼
DONO: Acessa Painel Admin → Clica "Sortear 1º Prêmio"
         │
         ▼
Sistema abre tela de sorteio pública
         │
         ▼
Frontend solicita GET /api/draw/1
         │
         ▼
Backend retorna número pré-definido (847293)
+ números "falsos" para animação
         │
         ▼
Animação de roleta: gira ~12s → para em 847293
         │
         ▼
Exibe vencedor: nome do comprador do número 847293
         │
         ▼
Salva resultado: prize.winner_number = 847293
```

### 7.3 Expiração de Reserva

```
Comprador seleciona números → reservados (15 min TTL)
         │
    ┌────┴──────────────┐
    │                   │
Paga dentro de 15min  Não paga
    │                   │
    ▼                   ▼
Números → sold      Job verifica a cada 1 min
                        │
                        ▼
                    Números expirados → available
                    Purchase → expired
```

---

## 8. Requisitos Não-Funcionais

### 8.1 Performance

- Grid de 1M números: carregamento < 2s (virtualizado + paginado)
- Checkout: < 3s para gerar PIX
- Webhook: processamento < 1s
- Dashboard: < 2s para carregar

### 8.2 Segurança

- Senhas hasheadas (bcrypt)
- CPF criptografado em repouso (AES-256)
- Credenciais Paradise criptografadas
- Números vencedores pré-definidos criptografados
- Rate limiting em todas as APIs
- JWT para autenticação Admin/Master
- Painel Master acessível apenas por rota oculta + IP whitelist

### 8.3 Concorrência

- Lock otimista na reserva de números (evitar 2 pessoas comprando o mesmo)
- Transaction isolation para compras simultâneas
- Race condition protection no round-robin do gateway

### 8.4 Responsividade

- Mobile-first (maioria dos compradores virá pelo celular/WhatsApp)
- Grid adaptativo: menos colunas em telas menores
- Tela de sorteio otimizada para landscape (live streaming)

---

## 9. Telas do Sistema

### 9.1 Públicas

1. **Página da Rifa** — hero, grid, prêmios, compradores
2. **Checkout** — dados do comprador, QR Code PIX
3. **Meus Números** — consulta por CPF/telefone
4. **Tela de Sorteio** — animação roleta/slot

### 9.2 Admin (Dono)

5. **Login Admin**
2. **Dashboard** — métricas filtradas
3. **Configuração da Rifa** — nome, imagem, cores
4. **Gerenciar Prêmios** — CRUD dos 10 prêmios
5. **Compradores** — lista filtrada
6. **Realizar Sorteio** — trigger do sorteio por posição

### 9.3 Master (Nós)

11. **Login Master** (rota oculta)
2. **Dashboard Real** — métricas completas, split
3. **Controle de Sorteio** — definir números vencedores
4. **Gestão de Gateway** — status Paradise A/B, override
5. **Configurações** — split %, credenciais

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| **Dono** | Cliente que comprou a plataforma. Acessa o Painel Admin. |
| **Master** | Nós. Acessamos o Painel Master oculto. |
| **Comprador** | Usuário final que compra números da rifa. |
| **Paradise A** | Conta do gateway de pagamento que recebe nossa parte do split. |
| **Paradise B** | Conta do gateway de pagamento que recebe a parte do dono. |
| **Split** | Divisão 50/50 dos pagamentos entre Paradise A e B. |
| **Round-robin** | Alternância simples A → B → A → B a cada transação. |
| **Número pré-definido** | Número vencedor escolhido por nós antes do sorteio acontecer. |
