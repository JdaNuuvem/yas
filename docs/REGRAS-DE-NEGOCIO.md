# Mega Rifa - Regras de Negócio e Fluxo do Sistema

## Visão Geral

Plataforma de rifa digital com gateway de pagamento Paradise PIX, sistema de split 50/50 entre duas contas, e sorteio automático de prêmios por milestone.

---

## Arquitetura

| Componente | Tecnologia | URL Produção |
|---|---|---|
| Frontend | Next.js 16 + React 19 | https://sortedayas.site |
| Backend API | Fastify 5 + Prisma 7 | https://api.sortedayas.site |
| Banco de Dados | PostgreSQL 16 | Interno (Coolify) |
| Gateway PIX | Paradise Pags | multi.paradisepags.com |

---

## Números e Contagem

| Dado | Valor |
|---|---|
| Total de números no banco | 1.000.000 |
| Total vendável pelo dono (Gateway B) | 550.000 |
| Total vendável pelo split (Gateway A) | 450.000 |
| Visual mostrado ao público | 1.000.000 |
| Fator visual | real × 1.818 (550K real = 1M visual) |

**Regra:** Quando 55.000 números são vendidos pelo gateway B, o visual mostra 100.000 (10% de 1M).

---

## Sistema de Split

### Como funciona
- Cada compra usa a secret key de uma das duas contas Paradise (A ou B)
- Gateway A = "Nosso" (split)
- Gateway B = "Dono" (influencer/dono da rifa)
- A conta alterna a cada pagamento CONFIRMADO (não na criação)

### Fluxo
1. Cliente compra → usa a secret key do gateway atual (A ou B)
2. Paradise processa o PIX
3. Webhook confirma pagamento → flipa gateway para a próxima compra
4. Resultado: compra 1 → B, compra 2 → A, compra 3 → B, ...

### Toggle
- **Split ativo (50%):** alterna entre A e B
- **Split desativado (0%):** todas vão para B (dono)
- Controlado no Master → Gateway

---

## Sistema de Prêmios e Sorteio Automático

### 11 Prêmios — liberados por milestone

| Milestone | % Real (de 550K) | Vendas reais | Visual (de 1M) | Prêmio |
|---|---|---|---|---|
| 1 | 10% | 55.000 | 100.000 | 11º Prêmio |
| 2 | 20% | 110.000 | 200.000 | 10º Prêmio |
| 3 | 30% | 165.000 | 300.000 | 9º Prêmio |
| 4 | 40% | 220.000 | 400.000 | 8º Prêmio |
| 5 | 50% | 275.000 | 500.000 | 7º Prêmio |
| 6 | 60% | 330.000 | 600.000 | 6º Prêmio |
| 7 | 70% | 385.000 | 700.000 | 5º Prêmio |
| 8 | 80% | 440.000 | 800.000 | 4º Prêmio |
| 9 | 90% | 495.000 | 900.000 | 3º Prêmio |
| 10 | 100% | 550.000 | 1.000.000 | 2º Prêmio |
| 11 | Bônus | — | — | 1º Prêmio |

### Sorteio automático
- Apenas vendas do **gateway B (dono)** contam para o progresso
- Vendas do gateway A (split) NÃO contam
- Quando um pagamento B é confirmado e o progresso cruza um milestone:
  1. Se o prêmio tem **número predefinido** (master) → usa ele
  2. Se não → pega um **número aleatório já vendido**
  3. O número vencedor aparece na home ao lado do prêmio

### Predefinição
- No Master → Predefinir Sorteio, define-se o número vencedor
- O número é encriptado no banco (AES-256-GCM)
- Botão "Testar" simula o sorteio sem precisar de vendas reais

---

## Páginas e Acessos

### Públicas (qualquer pessoa)

| Página | URL | Função |
|---|---|---|
| Home/Rifa | `/` | Página principal com compra de números |
| Checkout | `/checkout` | Formulário de dados + QR Code PIX |
| Sorteio ao vivo | `/sorteio/[position]` | Animação de revelação do prêmio |
| Live (site separado) | `/live` | Simulação de sorteio (visual diferente) |

### Admin (dono da rifa)

| Página | URL | Função |
|---|---|---|
| Login | `/admin/login` | Email + senha |
| Configuração | `/admin/configuracao` | Nome, descrição, imagem da rifa, chave Paradise |
| Prêmios | `/admin/premios` | CRUD de prêmios + zerar sorteios |
| Buscar Número | `/admin/buscar` | Consulta dono de um número específico |

**Login:** `yasminadm@sortedayas.site` / `Absurdo25@`

### Master (nós — escondido)

| Página | URL | Função |
|---|---|---|
| Login | `/master/login` | Email + senha (404 falsa sem auth) |
| Dashboard | `/master` | Receita real A vs B, vendidos, credenciais Paradise |
| Gateway | `/master/gateway` | Toggle split ativo/desativado, forçar gateway |
| Atribuir Números | `/master/atribuir` | Atribuir número manualmente a um cliente |
| Predefinir Sorteio | `/master/sorteio` | Definir vencedores + botão testar |

**Login:** `masteradm@sortedayas.site` / `Roimaluco22`

### Painel de Sorteio (separado)

| Página | URL | Função |
|---|---|---|
| Painel | `/sorteio-painel` | Executar sorteios manualmente (senha: `sortear2026`) |

### Ctrl-SP (controle rápido)

| Página | URL | Função |
|---|---|---|
| Painel | `/ctrl-sp` | Split slider + gateway override (login master) |

---

## Fluxo de Compra

```
Cliente abre a home
    ↓
Seleciona quantidade (mínimo 25)
    ↓
Números aleatórios são reservados (SELECT FOR UPDATE SKIP LOCKED)
    ↓
Vai para /checkout
    ↓
Preenche: nome, CPF (validado Mod11), telefone, email
    ↓
Backend determina gateway (A ou B baseado no split)
    ↓
Paradise gera QR Code PIX
    ↓
Cliente paga
    ↓
Paradise envia webhook → /api/webhook/paradise
    ↓
Backend confirma pagamento:
  - Marca purchase como CONFIRMED
  - Marca números como SOLD
  - Flipa gateway (se split ativo)
  - Verifica milestone → auto-draw se cruzou
    ↓
Cliente consulta "Meus Títulos" pelo telefone
```

---

## Segurança

| Item | Implementação |
|---|---|
| CPF | Encriptado AES-256-GCM + hash HMAC-SHA256 para busca |
| Credenciais Paradise | Encriptadas no banco |
| JWT | Expira em 7 dias, min 32 chars secret |
| Master panel | 404 falsa sem auth (apenas JWT, sem IP guard) |
| API separada | `api-master.ts` isolado no bundle (code-split) |
| Números | Unique constraint `(raffleId, numberValue)` |
| Reserva | `SELECT FOR UPDATE SKIP LOCKED` (sem venda dupla) |
| Rate limit | 1000 req/min por IP |

---

## Performance (100K+ acessos)

| Otimização | Detalhe |
|---|---|
| Cache in-memory | Raffle 15s, numbers 10s, progress 30s, buyers 60s |
| HTTP Cache-Control | stale-while-revalidate em GET endpoints |
| Gzip | @fastify/compress em todas as respostas |
| Imagem | Servida como binário (não base64 no JSON) |
| DB pool | 50 conexões |
| PostgreSQL | 500 max_connections, 512MB shared_buffers |
| Cloudflare | CDN + DDoS no frontend |

---

## Webhook Paradise

**URL:** `https://api.sortedayas.site/api/webhook/paradise`

Configurar nas **duas** contas Paradise (A e B).

**Status tratados:**
- `approved` → confirma pagamento, flipa gateway, verifica milestone
- `failed` / `refunded` / `expired` → libera números reservados
- `pending` / `processing` → ignorado

---

## Gaps Identificados

1. **Seed de números no redeploy:** Se o banco for recriado, precisa rodar `/api/seed` e `/api/seed-numbers`
2. **Sem notificação ao ganhador:** Quando um prêmio é sorteado, não envia WhatsApp/SMS
3. **Sem painel de resultados público:** Os prêmios sorteados aparecem na home mas não há uma página dedicada
4. **Sem expiração do PIX:** O QR Code não tem timer visual (a Paradise expira automaticamente)
5. **Endpoint /api/setup e /api/seed expostos:** Protegidos por JWT_SECRET na query, mas deveriam ser removidos em produção
6. **Sem backup automático:** O banco PostgreSQL não tem backup agendado
7. **Sem monitoramento:** Sem Sentry/alertas para erros em produção
