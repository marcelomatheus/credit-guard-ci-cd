import { creditPolicy } from '../../../modules/credit-analysis/domain/credit-policy.js';
import { icon } from './icons.js';

export interface PageOptions {
  accessKey: string;
}

const favicon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='10' fill='%230f6b5b'/%3E%3Cpath d='M18 40l9-10 7 6 12-14' fill='none' stroke='white' stroke-width='5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function percent(ratio: number): string {
  return `${(ratio * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

const spinner = icon('circleNotch', 'icon spinner');
const brand = `<span class="brand-mark">${icon('chartLineUp')}</span><span translate="no">CreditGuard</span>`;

function visibilityToggle(target: string, label: string): string {
  return `<button type="button" class="input-action" data-toggle-visibility="${target}" aria-label="Mostrar ${label}" aria-pressed="false">${icon('eye')}</button>`;
}

function installmentOption(months: number, checked: boolean): string {
  return `<label><input type="radio" name="installments" value="${months}"${checked ? ' checked' : ''}><span>${months}x</span></label>`;
}

function policyRows(): string {
  return creditPolicy.rates.map((rate, index) => {
    const upper = index === 0 ? 1000 : creditPolicy.rates[index - 1]!.minimumScore - 1;
    const range = rate.minimumScore === 0 ? `abaixo de ${creditPolicy.minimumScore}` : `${rate.minimumScore} a ${upper}`;
    const [tone, decision] = rate.minimumScore >= creditPolicy.automaticApprovalScore
      ? ['ok', 'Aprovação']
      : rate.minimumScore >= creditPolicy.minimumScore ? ['warn', 'Revisão manual'] : ['bad', 'Recusa'];
    return `<tr><td>${range}</td><td><span class="tone tone-${tone}"></span>${decision}</td><td class="td-num">${percent(Number(rate.monthlyRate))} a.m.</td></tr>`;
  }).join('');
}

function loginView(options: PageOptions): string {
  return `
<section id="loginView" class="auth" aria-labelledby="loginTitle">
  <aside class="auth-side" aria-label="Política de crédito">
    <span class="brand">${brand}</span>
    <div>
      <h2>Simulador de análise de crédito</h2>
      <p class="lede">Escolha um dos cinco clientes fictícios, informe valor e prazo e veja a decisão da política com parcela, taxa e motivos.</p>
    </div>
    <div class="policy-frame">
      <div class="policy-frame-head"><span>Faixas de score e taxa</span><code translate="no">${creditPolicy.version}</code></div>
      <table class="policy-table">
        <thead><tr><th scope="col">Score</th><th scope="col">Decisão</th><th scope="col" class="th-num">Taxa</th></tr></thead>
        <tbody>${policyRows()}</tbody>
      </table>
      <ul class="policy-rules">
        <li>Restrição ativa ou parcela acima de ${percent(creditPolicy.maximumDebtToIncomeRatio)} da renda, descontadas as dívidas: recusa.</li>
        <li>Três ou mais atrasos nos últimos 12 meses: revisão manual.</li>
      </ul>
    </div>
    <p class="auth-foot">Dados fictícios com data-base em 01/11/2026. Nenhuma operação de crédito é feita.</p>
  </aside>
  <div class="auth-panel">
    <div class="auth-card">
      <span class="brand">${brand}</span>
      <h1 id="loginTitle">Entrar</h1>
      <p class="lede">Escolha um perfil de demonstração e informe a chave de acesso.</p>
      <div class="profile-pick" role="group" aria-label="Perfis de demonstração">
        <button type="button" class="profile" data-profile="analyst" aria-pressed="true"><strong>${icon('calculator')}Analista</strong><small>Cria simulações</small></button>
        <button type="button" class="profile" data-profile="viewer" aria-pressed="false"><strong>${icon('eye')}Visualizador</strong><small>Somente consulta</small></button>
      </div>
      <div id="loginAlert" class="alert alert-bad" role="alert" hidden></div>
      <form id="loginForm" novalidate>
        <div class="field">
          <label for="loginEmail">E-mail</label>
          <div class="input-wrap">${icon('envelopeSimple')}<input id="loginEmail" name="email" type="email" autocomplete="username" spellcheck="false" autocapitalize="off" required value="analyst@example.test"></div>
        </div>
        <div class="field">
          <label for="loginPassword">Senha</label>
          <div class="input-wrap">${icon('lockKey')}<input id="loginPassword" name="password" type="password" autocomplete="current-password" required value="AnalystDemo!2026">${visibilityToggle('loginPassword', 'senha')}</div>
        </div>
        <div class="field">
          <label for="loginAccessKey">Chave de acesso</label>
          <div class="input-wrap">${icon('key')}<input id="loginAccessKey" name="accessKey" type="password" autocomplete="off" spellcheck="false" autocapitalize="off" required value="${escapeAttribute(options.accessKey)}" aria-describedby="loginAccessKeyHint">${visibilityToggle('loginAccessKey', 'chave de acesso')}</div>
          <p class="hint" id="loginAccessKeyHint">Peça a chave para quem está apresentando a demonstração.</p>
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" id="loginSubmit">${spinner}<span class="btn-label">Entrar</span></button>
      </form>
      <p class="fine-print">Ambiente de demonstração: clientes, bancos e históricos são fictícios.</p>
    </div>
  </div>
</section>`;
}

function simulationPanel(): string {
  return `
<section id="panel-simular" role="tabpanel" aria-labelledby="tab-simular" tabindex="-1">
  <div class="page-head">
    <div>
      <h1>Nova simulação</h1>
      <p>Escolha um cliente, defina valor e prazo e receba o parecer da política de crédito.</p>
    </div>
    <span class="badge badge-accent" id="policyBadge" translate="no">${icon('shieldCheck')}<span>${creditPolicy.version}</span></span>
  </div>
  <div id="viewerNotice" class="alert alert-info" hidden>${icon('info')}<span>Seu perfil é de consulta: você vê clientes e o histórico, mas só analistas criam simulações.</span></div>
  <div class="sim-grid">
    <form id="simForm" class="card" novalidate>
      <div class="card-head"><h2>Proposta</h2></div>
      <div class="field">
        <label for="simCustomer">Cliente</label>
        <select id="simCustomer" name="customer" class="select" required></select>
        <div id="customerProfile" class="profile-card" aria-live="polite"></div>
      </div>
      <div class="field">
        <label for="simAmount">Valor solicitado</label>
        <div class="input-wrap" id="simAmountWrap"><span class="prefix">R$</span><input id="simAmount" name="amount" inputmode="decimal" autocomplete="off" required value="5.000,00" aria-describedby="simAmountHint simAmountError"></div>
        <p class="field-error" id="simAmountError" hidden></p>
        <div class="chips" role="group" aria-label="Valores sugeridos">
          <button type="button" class="chip" data-amount="1000">R$&nbsp;1.000</button>
          <button type="button" class="chip" data-amount="5000" aria-pressed="true">R$&nbsp;5.000</button>
          <button type="button" class="chip" data-amount="10000">R$&nbsp;10.000</button>
          <button type="button" class="chip" data-amount="25000">R$&nbsp;25.000</button>
        </div>
        <p class="hint" id="simAmountHint">De R$&nbsp;100,00 a R$&nbsp;100.000,00.</p>
      </div>
      <div class="field">
        <span class="label" id="simInstallmentsLabel">Prazo em parcelas mensais</span>
        <div class="segmented" role="radiogroup" aria-labelledby="simInstallmentsLabel">
          ${[6, 12, 24, 36, 48, 60].map((months) => installmentOption(months, months === 12)).join('')}
        </div>
      </div>
      <div id="simAlert" class="alert alert-bad" role="alert" hidden></div>
      <button type="submit" class="btn btn-primary btn-lg btn-block" id="simSubmit">${spinner}<span class="btn-label">Simular proposta</span></button>
    </form>
    <section class="card result-card" aria-labelledby="resultTitle">
      <div class="card-head"><h2 id="resultTitle">Parecer</h2><span id="resultMeta" class="muted small num"></span></div>
      <div id="resultBody" aria-live="polite"></div>
    </section>
  </div>
</section>`;
}

function historyPanel(): string {
  return `
<section id="panel-historico" role="tabpanel" aria-labelledby="tab-historico" tabindex="-1" hidden>
  <div class="page-head">
    <div>
      <h1>Histórico</h1>
      <p>Suas simulações das últimas 24 horas. Elas ficam na memória da API e são apagadas a cada deploy.</p>
    </div>
  </div>
  <div class="toolbar">
    <div class="toolbar-group">
      <div class="segmented segmented-auto" role="radiogroup" aria-label="Filtrar por decisão">
        <label><input type="radio" name="historyStatus" value="" checked><span>Todas</span></label>
        <label><input type="radio" name="historyStatus" value="APPROVED"><span>Aprovadas</span></label>
        <label><input type="radio" name="historyStatus" value="MANUAL_REVIEW"><span>Em revisão</span></label>
        <label><input type="radio" name="historyStatus" value="REJECTED"><span>Recusadas</span></label>
      </div>
      <label class="sr-only" for="historyCustomer">Filtrar por cliente</label>
      <select id="historyCustomer" name="historyCustomer" class="select"><option value="">Todos os clientes</option></select>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" id="historyRefresh">${icon('clockCounterClockwise')}<span>Atualizar lista</span></button>
  </div>
  <div class="card table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr><th scope="col">Data</th><th scope="col">Cliente</th><th scope="col" class="th-num">Valor</th><th scope="col" class="th-num">Prazo</th><th scope="col" class="th-num">Parcela</th><th scope="col">Decisão</th><th scope="col"><span class="sr-only">Ações</span></th></tr>
        </thead>
        <tbody id="historyBody"></tbody>
      </table>
    </div>
    <div id="historyEmpty" hidden></div>
    <div class="pager" id="historyPager" hidden>
      <span id="historyPageInfo" class="num"></span>
      <div class="pager-actions">
        <button type="button" class="btn btn-secondary btn-sm" id="historyPrev">${icon('caretLeft')}<span>Anterior</span></button>
        <button type="button" class="btn btn-secondary btn-sm" id="historyNext"><span>Próxima</span>${icon('caretRight')}</button>
      </div>
    </div>
  </div>
</section>`;
}

function customersPanel(): string {
  return `
<section id="panel-clientes" role="tabpanel" aria-labelledby="tab-clientes" tabindex="-1" hidden>
  <div class="page-head">
    <div>
      <h1>Clientes</h1>
      <p>Carteira fictícia com dados de Open Finance e histórico de crédito na data-base de 01/11/2026.</p>
    </div>
  </div>
  <div id="customerGrid" class="customer-grid" aria-live="polite"></div>
</section>`;
}

function appView(): string {
  return `
<div id="appView" hidden>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="#simular">${brand}</a>
      <nav class="tabs" role="tablist" aria-label="Seções">
        <button type="button" class="tab" role="tab" id="tab-simular" aria-controls="panel-simular" aria-selected="true" data-route="simular">${icon('calculator')}<span>Simular</span></button>
        <button type="button" class="tab" role="tab" id="tab-historico" aria-controls="panel-historico" aria-selected="false" tabindex="-1" data-route="historico">${icon('clockCounterClockwise')}<span>Histórico</span></button>
        <button type="button" class="tab" role="tab" id="tab-clientes" aria-controls="panel-clientes" aria-selected="false" tabindex="-1" data-route="clientes">${icon('usersThree')}<span>Clientes</span></button>
      </nav>
      <div class="topbar-actions">
        <button type="button" class="icon-btn" id="themeToggle" aria-label="Alternar tema claro e escuro"></button>
        <div class="user-chip"><span class="avatar" id="userInitials" aria-hidden="true"></span><span class="user-meta"><strong id="userName"></strong><small id="userRole"></small></span></div>
        <button type="button" class="btn btn-secondary btn-sm" id="logoutButton">${icon('signOut')}<span class="logout-label">Sair</span></button>
      </div>
    </div>
  </header>
  <main id="main" class="container" tabindex="-1">
    ${simulationPanel()}
    ${historyPanel()}
    ${customersPanel()}
  </main>
  <footer class="app-footer">
    <span>Dados fictícios com data-base em 01/11/2026</span>
    <span id="appVersion" class="num" translate="no"></span>
    <a href="/docs/">Documentação da API</a>
  </footer>
</div>`;
}

export function renderPage(options: PageOptions): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Simulador de análise de crédito com clientes fictícios, usado na demonstração do pipeline de CI/CD.">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f3f7f6" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#11251f" media="(prefers-color-scheme: dark)">
  <title>CreditGuard · Simulador de crédito</title>
  <link rel="icon" href="${favicon}">
  <link rel="stylesheet" href="/assets/app.css">
  <script src="/assets/app.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Pular para o conteúdo</a>
  ${loginView(options)}
  ${appView()}
</body>
</html>`;
}
