export function renderHtmlUi(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CreditGuard | Sistema de Análise e Concessão de Crédito</title>
  <style>
    :root {
      --bg: #f7f7f5;
      --surface: #ffffff;
      --surface-subtle: #f9fafb;
      --surface-hover: #f3f4f6;
      --border: #e5e7eb;
      --border-strong: #d1d5db;
      --border-dark: #111827;
      --text: #111827;
      --text-muted: #4b5563;
      --text-dim: #6b7280;
      
      --primary: #111827;
      --primary-hover: #1f2937;
      --primary-text: #ffffff;
      --accent: #2563eb;
      
      /* Status harmônicos baseados nas referências */
      --status-approved-bg: #ecfdf5;
      --status-approved-border: #a7f3d0;
      --status-approved-text: #065f46;
      
      --status-review-bg: #fffbeb;
      --status-review-border: #fde68a;
      --status-review-text: #92400e;
      
      --status-rejected-bg: #fef2f2;
      --status-rejected-border: #fecaca;
      --status-rejected-text: #991b1b;
      
      --radius: 6px;
      --radius-sm: 4px;
      --shadow-subtle: 0 1px 3px rgba(0, 0, 0, 0.05);
      --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    html, body {
      height: 100vh;
      max-height: 100vh;
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      display: flex;
      flex-direction: column;
      -webkit-font-smoothing: antialiased;
    }

    /* REMOVE O FUNDO BRANCO E AS SETAS FEIAS DO INPUT NUMBER */
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
    input[type=number] {
      -moz-appearance: textfield;
      appearance: textfield;
    }

    /* TOP BAR */
    .navbar {
      flex-shrink: 0;
      background-color: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      background: #111827;
      border: 1px solid #111827;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .brand-icon svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.2;
    }
    .brand-text h1 {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    .brand-text p {
      font-size: 0.725rem;
      color: var(--text-dim);
    }
    .user-menu {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .user-profile {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface-subtle);
      padding: 4px 10px 4px 6px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }
    .user-avatar {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-sm);
      background: #111827;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
    }
    .user-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
    }
    .user-role-badge {
      font-size: 0.675rem;
      color: var(--text-dim);
      font-weight: 600;
      padding: 1px 6px;
      background: #e5e7eb;
      border-radius: 3px;
    }
    .btn-logout {
      background: var(--surface);
      border: 1px solid var(--border-strong);
      color: var(--text);
      padding: 6px 12px;
      border-radius: var(--radius);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-logout:hover {
      background: var(--surface-hover);
      border-color: var(--border-dark);
    }

    /* MAIN CONTAINER */
    .main-container {
      flex: 1;
      overflow-y: auto;
      max-width: 1140px;
      width: 100%;
      margin: 0 auto;
      padding: 16px 24px 12px;
    }

    /* LOGIN VIEW */
    .login-container {
      max-width: 400px;
      margin: 50px auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 32px 28px;
      box-shadow: var(--shadow-card);
    }
    .login-header {
      text-align: center;
      margin-bottom: 24px;
    }
    .login-header .brand-icon {
      margin: 0 auto 12px;
      width: 40px;
      height: 40px;
    }
    .login-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    .login-header p {
      font-size: 0.825rem;
      color: var(--text-dim);
      margin-top: 4px;
    }
    .quick-access-box {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px;
      margin-bottom: 20px;
    }
    .quick-access-title {
      font-size: 0.7rem;
      color: var(--text-dim);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      text-align: center;
    }
    .quick-btns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .btn-quick {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      padding: 7px 10px;
      font-size: 0.775rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-align: center;
    }
    .btn-quick:hover {
      background: var(--surface-hover);
      border-color: var(--border-dark);
    }

    /* FORMS & INPUTS */
    .form-group {
      margin-bottom: 12px;
    }
    .form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 4px;
    }
    .form-input, .form-select {
      width: 100%;
      background: var(--surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      color: var(--text);
      padding: 8px 12px;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-input:focus, .form-select:focus {
      border-color: var(--border-dark);
      box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.08);
    }
    .btn-submit {
      width: 100%;
      background: var(--primary);
      color: var(--primary-text);
      border: 1px solid var(--primary);
      border-radius: var(--radius);
      padding: 10px 14px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-submit:hover {
      background: var(--primary-hover);
    }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* DASHBOARD TABS */
    .tab-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 16px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-dim);
      font-size: 0.875rem;
      font-weight: 600;
      padding: 8px 14px;
      cursor: pointer;
      position: relative;
      transition: color 0.15s;
    }
    .tab-btn:hover {
      color: var(--text);
    }
    .tab-btn.active {
      color: var(--text);
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: #111827;
    }

    /* SIMULATION WORKSPACE (2 COLS) */
    .simulation-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }
    @media (min-width: 860px) {
      .simulation-grid {
        grid-template-columns: 430px 1fr;
      }
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow-card);
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--text);
      margin-bottom: 3px;
    }
    .card-subtitle {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-bottom: 14px;
    }

    /* CUSTOMER PREVIEW CARD */
    .customer-preview {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 12px;
      margin-top: 6px;
      margin-bottom: 12px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .preview-name {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text);
    }
    .badge-segment {
      font-size: 0.675rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: var(--radius-sm);
      background: #e5e7eb;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .preview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .preview-item {
      display: flex;
      flex-direction: column;
    }
    .preview-label {
      color: var(--text-dim);
      font-size: 0.725rem;
      margin-bottom: 2px;
    }
    .preview-value {
      font-weight: 600;
      color: var(--text);
      font-size: 0.85rem;
    }
    .score-badge {
      display: inline-block;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.75rem;
    }
    .score-high { color: #065f46; background: #ecfdf5; border: 1px solid #a7f3d0; }
    .score-mid { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }
    .score-low { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }

    /* VALUE PRESET BUTTONS */
    .value-presets {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    .btn-preset {
      background: var(--surface-subtle);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      color: var(--text);
      padding: 4px 8px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-preset:hover {
      background: #e5e7eb;
      border-color: var(--border-dark);
    }

    /* DECISION PANEL / RESULT */
    .decision-panel {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .empty-state {
      text-align: center;
      padding: 32px 20px;
      color: var(--text-dim);
    }
    .empty-icon {
      margin-bottom: 10px;
      display: flex;
      justify-content: center;
    }
    .empty-icon svg {
      width: 34px;
      height: 34px;
      stroke: #9ca3af;
    }
    .empty-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .empty-desc {
      font-size: 0.8rem;
      max-width: 320px;
      margin: 0 auto;
      line-height: 1.4;
      color: var(--text-muted);
    }

    /* STATUS BANNERS HARMÔNICOS */
    .proposal-result {
      display: none;
    }
    .status-banner {
      border-radius: var(--radius);
      padding: 12px 14px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-banner.approved {
      background: var(--status-approved-bg);
      border: 1px solid var(--status-approved-border);
      color: var(--status-approved-text);
    }
    .status-banner.review {
      background: var(--status-review-bg);
      border: 1px solid var(--status-review-border);
      color: var(--status-review-text);
    }
    .status-banner.rejected {
      background: var(--status-rejected-bg);
      border: 1px solid var(--status-rejected-border);
      color: var(--status-rejected-text);
    }
    .status-banner-icon {
      line-height: 1;
      display: flex;
      align-items: center;
    }
    .status-banner-text h3 {
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .status-banner-text p {
      font-size: 0.775rem;
      opacity: 0.95;
      margin-top: 1px;
    }

    /* FINANCIAL METRICS GRID */
    .financial-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    @media (min-width: 580px) {
      .financial-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .metric-card {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 10px 12px;
    }
    .metric-label {
      font-size: 0.675rem;
      font-weight: 700;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .metric-value {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text);
    }
    .metric-sub {
      font-size: 0.675rem;
      color: var(--text-dim);
      margin-top: 1px;
    }

    /* REASONS BOX */
    .reasons-box {
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 14px;
    }
    .reasons-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .reasons-list {
      list-style: none;
    }
    .reasons-list li {
      font-size: 0.825rem;
      color: var(--text-muted);
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .reasons-list li:last-child {
      border-bottom: none;
    }
    .bullet {
      color: #111827;
      font-weight: bold;
    }

    /* CUSTOMER DIRECTORY VIEW */
    .customer-table-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow-card);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    thead {
      background: var(--surface-subtle);
      border-bottom: 1px solid var(--border);
    }
    th {
      padding: 12px 16px;
      font-size: 0.725rem;
      font-weight: 700;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td {
      padding: 12px 16px;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    tbody tr:hover {
      background: var(--surface-subtle);
    }
    .btn-action-sm {
      background: #111827;
      color: #ffffff;
      border: 1px solid #111827;
      border-radius: var(--radius-sm);
      padding: 5px 11px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-action-sm:hover {
      background: #1f2937;
    }

    /* ALERTS */
    .alert-banner {
      padding: 10px 14px;
      border-radius: var(--radius);
      margin-bottom: 16px;
      font-size: 0.825rem;
      display: none;
    }
    .alert-banner.error {
      display: block;
      background: var(--status-rejected-bg);
      border: 1px solid var(--status-rejected-border);
      color: var(--status-rejected-text);
    }

    /* FOOTER COLADO AO FIM (STICKY BOTTOM, 100VH) */
    footer {
      flex-shrink: 0;
      border-top: 1px solid var(--border);
      background: var(--surface);
      padding: 8px 24px;
      text-align: center;
      font-size: 0.725rem;
      color: var(--text-dim);
      z-index: 50;
    }
  </style>
</head>
<body>

  <!-- HEADER / NAVBAR -->
  <header class="navbar">
    <div class="brand">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
      </div>
      <div class="brand-text">
        <h1>CreditGuard</h1>
        <p>Sistema de Concessão e Políticas de Crédito</p>
      </div>
    </div>
    <div class="user-menu" id="userMenuSection" style="display:none;">
      <div class="user-profile">
        <div class="user-avatar" id="userAvatarChar">A</div>
        <span class="user-name" id="navUserName">-</span>
        <span class="user-role-badge" id="navUserRole">-</span>
      </div>
      <button type="button" class="btn-logout" id="btnLogout">Sair</button>
    </div>
  </header>

  <!-- MAIN WRAPPER -->
  <main class="main-container">

    <!-- 1. TELA DE LOGIN -->
    <div id="loginView" class="login-container">
      <div class="login-header">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
        <h2>Acesso à Plataforma</h2>
        <p>Entre com suas credenciais para gerenciar e analisar crédito</p>
      </div>

      <div class="quick-access-box">
        <div class="quick-access-title">Perfis de Demonstração Rápida</div>
        <div class="quick-btns">
          <button type="button" class="btn-quick" id="btnQuickAnalyst">Analista de Crédito</button>
          <button type="button" class="btn-quick" id="btnQuickViewer">Visualizador</button>
        </div>
      </div>

      <div id="loginAlert" class="alert-banner"></div>

      <form id="loginForm">
        <div class="form-group">
          <label class="form-label">E-mail Profissional</label>
          <input type="email" id="inputEmail" class="form-input" value="analyst@example.test" required>
        </div>
        <div class="form-group">
          <label class="form-label">Senha</label>
          <input type="password" id="inputPassword" class="form-input" value="AnalystDemo!2026" required>
        </div>
        <button type="submit" class="btn-submit" id="btnLoginSubmit">
          <span>Acessar Painel</span>
        </button>
      </form>
    </div>

    <!-- 2. DASHBOARD DO USUÁRIO -->
    <div id="dashboardView" style="display:none;">
      
      <!-- ABAS DE NAVEGAÇÃO -->
      <nav class="tab-nav">
        <button type="button" class="tab-btn active" id="tabBtnSim">Nova Simulação</button>
        <button type="button" class="tab-btn" id="tabBtnCust">Carteira de Clientes</button>
      </nav>

      <!-- ABA 1: SIMULAÇÃO DE CRÉDITO -->
      <div id="tabSimulation" class="simulation-grid">
        
        <!-- FORMULÁRIO DE PROPOSTA -->
        <div class="card">
          <h2 class="card-title">Parâmetros da Proposta</h2>
          <p class="card-subtitle">Informe o cliente cadastrado, valor do empréstimo e condições de pagamento.</p>
          
          <div id="simAlert" class="alert-banner"></div>

          <form id="simForm">
            <div class="form-group">
              <label class="form-label">Cliente Cadastrado</label>
              <select id="selectCustomer" class="form-select">
                <option value="customer-stable" data-score="850" data-income="8000" data-debt="500" data-name="Alex Morgan" data-segment="PREMIUM">Alex Morgan (Score 850 • Renda R$ 8.000)</option>
                <option value="customer-review" data-score="620" data-income="4500" data-debt="400" data-name="Jordan Taylor" data-segment="STANDARD">Jordan Taylor (Score 620 • Renda R$ 4.500)</option>
                <option value="customer-restricted" data-score="410" data-income="4000" data-debt="200" data-name="Casey Parker" data-segment="STANDARD" data-restriction="true">Casey Parker (Score 410 • Restrição Ativa)</option>
                <option value="customer-overcommitted" data-score="760" data-income="3500" data-debt="1100" data-name="Riley Adams" data-segment="STANDARD">Riley Adams (Dívida > 30% da Renda)</option>
                <option value="customer-no-consent" data-score="730" data-income="0" data-debt="0" data-name="Sam Walker" data-segment="STANDARD" data-noconsent="true">Sam Walker (Sem consentimento Open Finance)</option>
              </select>

              <!-- CARTÃO DE PREVIEW DO CLIENTE -->
              <div id="customerPreviewBox" class="customer-preview">
                <div class="preview-header">
                  <span class="preview-name" id="prevName">Alex Morgan</span>
                  <span class="badge-segment" id="prevSegment">PREMIUM</span>
                </div>
                <div class="preview-grid">
                  <div class="preview-item">
                    <span class="preview-label">Renda Mensal</span>
                    <span class="preview-value" id="prevIncome">R$ 8.000,00</span>
                  </div>
                  <div class="preview-item">
                    <span class="preview-label">Dívidas Existentes</span>
                    <span class="preview-value" id="prevDebt">R$ 500,00</span>
                  </div>
                  <div class="preview-item">
                    <span class="preview-label">Score de Risco</span>
                    <span class="preview-value" id="prevScore"><span class="score-badge score-high">850 / 1000</span></span>
                  </div>
                  <div class="preview-item">
                    <span class="preview-label">Situação Cadastral</span>
                    <span class="preview-value" id="prevStatus" style="color:#065f46;">Regular</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Valor Solicitado (R$)</label>
              <input type="number" id="inputAmount" class="form-input" min="100" max="100000" step="50" value="1000" required>
              <div class="value-presets">
                <button type="button" class="btn-preset" data-amount="1000">R$ 1.000</button>
                <button type="button" class="btn-preset" data-amount="5000">R$ 5.000</button>
                <button type="button" class="btn-preset" data-amount="10000">R$ 10.000</button>
                <button type="button" class="btn-preset" data-amount="25000">R$ 25.000</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Prazo de Pagamento (Meses)</label>
              <select id="selectInstallments" class="form-select">
                <option value="6">6 parcelas mensais</option>
                <option value="12" selected>12 parcelas mensais (1 ano)</option>
                <option value="24">24 parcelas mensais (2 anos)</option>
                <option value="36">36 parcelas mensais (3 anos)</option>
                <option value="48">48 parcelas mensais (4 anos)</option>
                <option value="60">60 parcelas mensais (5 anos)</option>
              </select>
            </div>

            <button type="submit" class="btn-submit" id="btnSimSubmit">
              <span>Avaliar Proposta de Crédito</span>
            </button>
          </form>
        </div>

        <!-- PARECER DA PROPOSTA / RESULTADO -->
        <div class="card decision-panel">
          
          <!-- ESTADO INICIAL VAZIO -->
          <div id="decisionEmptyState" class="empty-state">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
            <div class="empty-title">Nenhuma análise executada</div>
            <p class="empty-desc">Selecione o cliente e as condições ao lado e clique em <strong>Avaliar Proposta</strong> para emitir o parecer imediato.</p>
          </div>

          <!-- RESULTADO CALCULADO -->
          <div id="decisionResultBox" class="proposal-result">
            <h2 class="card-title">Parecer de Crédito</h2>
            <p class="card-subtitle">Resultado da análise automatizada com base na política de risco vigente.</p>

            <div id="statusBanner" class="status-banner">
              <div class="status-banner-icon" id="bannerIcon">
                <!-- SVG dinâmico -->
              </div>
              <div class="status-banner-text">
                <h3 id="bannerTitle">Proposta Pré-Aprovada</h3>
                <p id="bannerDesc">Proposta dentro dos limites de capacidade de pagamento e pontuação mínima.</p>
              </div>
            </div>

            <div class="financial-grid">
              <div class="metric-card">
                <div class="metric-label">Valor Parcela</div>
                <div class="metric-value" id="valInstallment">R$ 0,00</div>
                <div class="metric-sub" id="valInstallmentSub">Parcela mensal</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Taxa Mensal</div>
                <div class="metric-value" id="valRate">0,0%</div>
                <div class="metric-sub">ao mês</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Total a Pagar</div>
                <div class="metric-value" id="valTotal">R$ 0,00</div>
                <div class="metric-sub">Financiamento + juros</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Comprometimento</div>
                <div class="metric-value" id="valDti">0,0%</div>
                <div class="metric-sub">da renda líquida</div>
              </div>
            </div>

            <div class="reasons-box">
              <div class="reasons-title">Diagnóstico das Diretrizes de Risco</div>
              <ul class="reasons-list" id="reasonsList"></ul>
            </div>
          </div>

        </div>

      </div>

      <!-- ABA 2: CARTEIRA DE CLIENTES -->
      <div id="tabCustomers" style="display:none;">
        <div class="card" style="margin-bottom: 20px;">
          <h2 class="card-title">Carteira de Clientes Cadastrados</h2>
          <p class="card-subtitle">Base de correntistas com integração direta às fontes de Open Finance e bureaus de crédito.</p>
        </div>

        <div class="customer-table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Segmento</th>
                <th>Score de Risco</th>
                <th>Renda Mensal</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="customersTableBody">
              <tr><td colspan="5" style="text-align:center; color:var(--text-dim);">Carregando dados dos clientes...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

  </main>

  <!-- FOOTER COLADO AO FIM (STICKY BOTTOM, 100VH) -->
  <footer>
    CreditGuard &bull; Sistema Integrado de Análise de Crédito &bull; Ambiente Corporativo
  </footer>

  <script>
    (function() {
      var appToken = '';
      var demoAccessKey = 'local-demo-access-key';

      function formatCurrency(cents) {
        return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }

      function updateCustomerPreview() {
        var select = document.getElementById('selectCustomer');
        if (!select) return;
        var opt = select.options[select.selectedIndex];
        if (!opt) return;

        var name = opt.getAttribute('data-name');
        var segment = opt.getAttribute('data-segment');
        var income = parseInt(opt.getAttribute('data-income') || '0', 10);
        var debt = parseInt(opt.getAttribute('data-debt') || '0', 10);
        var score = parseInt(opt.getAttribute('data-score') || '0', 10);
        var restriction = opt.getAttribute('data-restriction') === 'true';
        var noConsent = opt.getAttribute('data-noconsent') === 'true';

        document.getElementById('prevName').textContent = name;
        document.getElementById('prevSegment').textContent = segment;
        document.getElementById('prevIncome').textContent = income ? (income).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Indisponível';
        document.getElementById('prevDebt').textContent = (debt).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        var scoreEl = document.getElementById('prevScore');
        if (score >= 700) {
          scoreEl.innerHTML = '<span class="score-badge score-high">' + score + ' (Excelente)</span>';
        } else if (score >= 500) {
          scoreEl.innerHTML = '<span class="score-badge score-mid">' + score + ' (Moderado)</span>';
        } else {
          scoreEl.innerHTML = '<span class="score-badge score-low">' + score + ' (Alto Risco)</span>';
        }

        var statusEl = document.getElementById('prevStatus');
        if (restriction) {
          statusEl.textContent = 'Restrição no CPF';
          statusEl.style.color = '#991b1b';
        } else if (noConsent) {
          statusEl.textContent = 'Sem autorização Open Finance';
          statusEl.style.color = '#92400e';
        } else {
          statusEl.textContent = 'Cadastro Regular';
          statusEl.style.color = '#065f46';
        }
      }

      function switchTab(tab) {
        var tabSim = document.getElementById('tabSimulation');
        var tabCust = document.getElementById('tabCustomers');
        var btnSim = document.getElementById('tabBtnSim');
        var btnCust = document.getElementById('tabBtnCust');

        if (tab === 'simulation') {
          tabSim.style.display = 'grid';
          tabCust.style.display = 'none';
          btnSim.classList.add('active');
          btnCust.classList.remove('active');
        } else {
          tabSim.style.display = 'none';
          tabCust.style.display = 'block';
          btnSim.classList.remove('active');
          btnCust.classList.add('active');
          fetchCustomersList();
        }
      }

      async function handleAppLogin(e) {
        if (e && e.preventDefault) e.preventDefault();
        var alertEl = document.getElementById('loginAlert');
        alertEl.className = 'alert-banner';
        alertEl.style.display = 'none';

        var email = document.getElementById('inputEmail').value.trim();
        var password = document.getElementById('inputPassword').value;

        try {
          var response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-demo-access-key': demoAccessKey
            },
            body: JSON.stringify({ email: email, password: password })
          });
          var data = await response.json();
          if (!response.ok) {
            throw new Error(data.error ? data.error.message : 'Falha na autenticação');
          }

          appToken = data.accessToken;

          document.getElementById('navUserName').textContent = data.user.name;
          document.getElementById('navUserRole').textContent = data.user.role === 'ANALYST' ? 'Analista de Crédito' : 'Visualizador';
          document.getElementById('userAvatarChar').textContent = data.user.name.charAt(0).toUpperCase();

          document.getElementById('loginView').style.display = 'none';
          document.getElementById('dashboardView').style.display = 'block';
          document.getElementById('userMenuSection').style.display = 'flex';

          updateCustomerPreview();
        } catch (err) {
          alertEl.textContent = err.message || 'Erro ao realizar login';
          alertEl.classList.add('error');
          alertEl.style.display = 'block';
        }
      }

      function handleAppLogout() {
        appToken = '';
        document.getElementById('loginView').style.display = 'block';
        document.getElementById('dashboardView').style.display = 'none';
        document.getElementById('userMenuSection').style.display = 'none';
        document.getElementById('decisionEmptyState').style.display = 'block';
        document.getElementById('decisionResultBox').style.display = 'none';
      }

      async function handleRunSimulation(e) {
        if (e && e.preventDefault) e.preventDefault();
        var alertEl = document.getElementById('simAlert');
        alertEl.style.display = 'none';
        alertEl.className = 'alert-banner';

        var customerId = document.getElementById('selectCustomer').value;
        var amountCents = Math.round(parseFloat(document.getElementById('inputAmount').value) * 100);
        var installments = parseInt(document.getElementById('selectInstallments').value, 10);
        var idempotencyKey = 'sim-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8);

        var btn = document.getElementById('btnSimSubmit');
        btn.disabled = true;
        btn.innerHTML = '<span>Processando Análise...</span>';

        try {
          var response = await fetch('/api/v1/credit-applications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + appToken,
              'Idempotency-Key': idempotencyKey
            },
            body: JSON.stringify({ customerId: customerId, amountCents: amountCents, installments: installments })
          });

          var json = await response.json();
          btn.disabled = false;
          btn.innerHTML = '<span>Avaliar Proposta de Crédito</span>';

          if (!response.ok) {
            throw new Error(json.error ? json.error.message : 'Falha na simulação de crédito');
          }

          var app = json.data;
          var dec = app.decision;

          document.getElementById('decisionEmptyState').style.display = 'none';
          var resBox = document.getElementById('decisionResultBox');
          resBox.style.display = 'block';

          var banner = document.getElementById('statusBanner');
          var icon = document.getElementById('bannerIcon');
          var title = document.getElementById('bannerTitle');
          var desc = document.getElementById('bannerDesc');

          banner.className = 'status-banner';
          if (dec.status === 'APPROVED') {
            banner.classList.add('approved');
            icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#065f46" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
            title.textContent = 'Proposta Pré-Aprovada';
            desc.textContent = 'O perfil atende plenamente aos critérios de solvência, margem consignável e pontuação de crédito.';
          } else if (dec.status === 'MANUAL_REVIEW') {
            banner.classList.add('review');
            icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            title.textContent = 'Encaminhado para Análise Manual';
            desc.textContent = 'A proposta requer validação adicional pela mesa de crédito devido à faixa de pontuação ou histórico recente.';
          } else {
            banner.classList.add('rejected');
            icon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            title.textContent = 'Proposta Reprovada pela Política';
            desc.textContent = 'A solicitação foi recusada conforme os parâmetros regulatórios de risco e comprometimento financeiro.';
          }

          document.getElementById('valInstallment').textContent = formatCurrency(dec.installmentCents);
          document.getElementById('valRate').textContent = (parseFloat(dec.monthlyInterestRate) * 100).toFixed(2) + '% a.m.';
          document.getElementById('valTotal').textContent = formatCurrency(dec.totalRepaymentCents);
          document.getElementById('valDti').textContent = dec.debtToIncomeRatio ? (parseFloat(dec.debtToIncomeRatio) * 100).toFixed(1) + '%' : '-';

          var reasonMap = {
            'CREDIT_RESTRICTION': 'Restrições cadastrais ativas identificadas nos bureaus de crédito',
            'LOW_CREDIT_SCORE': 'Pontuação de crédito (score) abaixo do patamar mínimo exigido',
            'INSUFFICIENT_PAYMENT_CAPACITY': 'Valor da parcela excede o limite prudencial de 30% da renda líquida',
            'INTERMEDIATE_CREDIT_SCORE': 'Faixa de score intermediária: requer validação da mesa de crédito',
            'RECENT_LATE_PAYMENTS': 'Histórico com registros de atrasos nos últimos 12 meses',
            'POLICY_REQUIREMENTS_MET': 'Todos os critérios e políticas de crédito foram atendidos com sucesso'
          };
          var list = document.getElementById('reasonsList');
          list.innerHTML = dec.reasons.map(function(r) {
            var translated = reasonMap[r] || r;
            return '<li><span class="bullet">&bull;</span> ' + translated + '</li>';
          }).join('');

        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = '<span>Avaliar Proposta de Crédito</span>';
          alertEl.textContent = err.message || 'Erro ao processar simulação';
          alertEl.classList.add('error');
          alertEl.style.display = 'block';
        }
      }

      async function fetchCustomersList() {
        var tbody = document.getElementById('customersTableBody');
        try {
          var response = await fetch('/api/v1/customers', {
            headers: { 'Authorization': 'Bearer ' + appToken }
          });
          var json = await response.json();
          if (!response.ok) throw new Error();

          var rows = '';
          json.data.forEach(function(c) {
            rows += '<tr>' +
              '<td><strong>' + c.name + '</strong><br><span style="font-size:0.75rem;color:var(--text-dim);">' + c.id + '</span></td>' +
              '<td><span class="badge-segment">' + c.segment + '</span></td>' +
              '<td>' + (c.id === 'customer-stable' ? '<span class="score-badge score-high">850 (Alto)</span>' : (c.id === 'customer-restricted' ? '<span class="score-badge score-low">410 (Baixo)</span>' : '<span class="score-badge score-mid">620-760</span>')) + '</td>' +
              '<td>' + (c.id === 'customer-stable' ? 'R$ 8.000,00' : (c.id === 'customer-review' ? 'R$ 4.500,00' : 'R$ 3.500 - 4.000')) + '</td>' +
              '<td><button type="button" class="btn-action-sm btn-simulate-customer" data-id="' + c.id + '">Simular</button></td>' +
            '</tr>';
          });
          tbody.innerHTML = rows;

          var simBtns = tbody.querySelectorAll('.btn-simulate-customer');
          simBtns.forEach(function(b) {
            b.addEventListener('click', function() {
              var id = b.getAttribute('data-id');
              document.getElementById('selectCustomer').value = id;
              updateCustomerPreview();
              switchTab('simulation');
            });
          });
        } catch {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--status-rejected-text);">Erro ao carregar clientes.</td></tr>';
        }
      }

      document.addEventListener('DOMContentLoaded', function() {
        initEvents();
      });

      function initEvents() {
        var btnQuickAnalyst = document.getElementById('btnQuickAnalyst');
        if (btnQuickAnalyst) {
          btnQuickAnalyst.addEventListener('click', function() {
            document.getElementById('inputEmail').value = 'analyst@example.test';
            document.getElementById('inputPassword').value = 'AnalystDemo!2026';
          });
        }

        var btnQuickViewer = document.getElementById('btnQuickViewer');
        if (btnQuickViewer) {
          btnQuickViewer.addEventListener('click', function() {
            document.getElementById('inputEmail').value = 'viewer@example.test';
            document.getElementById('inputPassword').value = 'ViewerDemo!2026';
          });
        }

        var loginForm = document.getElementById('loginForm');
        if (loginForm) {
          loginForm.addEventListener('submit', handleAppLogin);
        }

        var btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
          btnLogout.addEventListener('click', handleAppLogout);
        }

        var tabBtnSim = document.getElementById('tabBtnSim');
        if (tabBtnSim) {
          tabBtnSim.addEventListener('click', function() { switchTab('simulation'); });
        }

        var tabBtnCust = document.getElementById('tabBtnCust');
        if (tabBtnCust) {
          tabBtnCust.addEventListener('click', function() { switchTab('customers'); });
        }

        var selectCustomer = document.getElementById('selectCustomer');
        if (selectCustomer) {
          selectCustomer.addEventListener('change', updateCustomerPreview);
        }

        var presets = document.querySelectorAll('.btn-preset');
        presets.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var val = btn.getAttribute('data-amount');
            if (val) document.getElementById('inputAmount').value = val;
          });
        });

        var simForm = document.getElementById('simForm');
        if (simForm) {
          simForm.addEventListener('submit', handleRunSimulation);
        }
      }

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initEvents();
      }
    })();
  </script>
</body>
</html>`;
}
