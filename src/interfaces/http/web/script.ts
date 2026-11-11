import { iconMarkup } from './icons.js';

const client = String.raw`
(function () {
  'use strict';

  var PROFILES = {
    analyst: { email: 'analyst@example.test', password: 'AnalystDemo!2026' },
    viewer: { email: 'viewer@example.test', password: 'ViewerDemo!2026' }
  };
  var ROUTES = ['simular', 'historico', 'clientes'];
  var STATUS = {
    APPROVED: { tone: 'ok', label: 'Aprovada', icon: 'checkCircle', text: 'A proposta atende a todos os critérios da política de crédito.' },
    MANUAL_REVIEW: { tone: 'warn', label: 'Revisão manual', icon: 'hourglassMedium', text: 'A proposta precisa da análise de um especialista antes da decisão final.' },
    REJECTED: { tone: 'bad', label: 'Recusada', icon: 'xCircle', text: 'A proposta não atende aos critérios mínimos da política de crédito.' }
  };
  var REASONS = {
    POLICY_REQUIREMENTS_MET: { tone: 'ok', text: 'Todos os critérios da política foram atendidos.' },
    CREDIT_RESTRICTION: { tone: 'bad', text: 'O cliente tem restrição de crédito ativa.' },
    LOW_CREDIT_SCORE: { tone: 'bad', text: 'Score abaixo do mínimo exigido (500).' },
    INSUFFICIENT_PAYMENT_CAPACITY: { tone: 'bad', text: 'A parcela ultrapassa a capacidade de pagamento (30% da renda, já descontadas as dívidas).' },
    INTERMEDIATE_CREDIT_SCORE: { tone: 'warn', text: 'Score intermediário (500 a 699) exige revisão de um analista.' },
    RECENT_LATE_PAYMENTS: { tone: 'warn', text: 'Três ou mais atrasos de pagamento nos últimos 12 meses.' }
  };
  var ROLE_LABEL = { ANALYST: 'Analista', VIEWER: 'Visualizador' };
  var SEGMENT_LABEL = { PREMIUM: 'Premium', STANDARD: 'Padrão' };

  var state = {
    token: '',
    user: null,
    expiryTimer: 0,
    customers: [],
    profiles: {},
    policy: null,
    history: { page: 1, limit: 8, status: '', customerId: '', stale: true },
    route: 'simular',
    customersRendered: false
  };

  var currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var percent = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 });
  var dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function $(id) { return document.getElementById(id); }
  function money(cents) { return currency.format(cents / 100); }

  function icon(name, className) {
    var holder = document.createElement('span');
    holder.innerHTML = ICONS[name] || '';
    var svg = holder.firstChild;
    if (svg && className) svg.setAttribute('class', className);
    return svg || holder;
  }

  function h(tag, props, children) {
    var element = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'className') element.className = value;
        else if (key === 'text') element.textContent = value;
        else if (key === 'onClick') element.addEventListener('click', value);
        else element.setAttribute(key, value === true ? '' : String(value));
      });
    }
    [].concat(children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return element;
  }

  function replace(target, children) {
    while (target.firstChild) target.removeChild(target.firstChild);
    [].concat(children).forEach(function (child) { if (child) target.appendChild(child); });
  }

  function initials(name) {
    return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('');
  }

  function scoreTone(score) { return score >= 700 ? 'ok' : score >= 500 ? 'warn' : 'bad'; }

  function scoreRing(score, small) {
    var radius = 40;
    var length = 2 * Math.PI * radius;
    var wrapper = h('div', { className: 'score is-' + scoreTone(score) + (small ? ' score-sm' : ''), role: 'img', 'aria-label': 'Score ' + score + ' de 1000' });
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    var track = document.createElementNS(ns, 'circle');
    var value = document.createElementNS(ns, 'circle');
    [track, value].forEach(function (circle) {
      circle.setAttribute('cx', '50');
      circle.setAttribute('cy', '50');
      circle.setAttribute('r', String(radius));
    });
    track.setAttribute('class', 'track');
    value.setAttribute('class', 'value');
    value.setAttribute('stroke-dasharray', String(length));
    value.setAttribute('stroke-dashoffset', String(length));
    svg.appendChild(track);
    svg.appendChild(value);
    wrapper.appendChild(svg);
    wrapper.appendChild(h('div', { className: 'score-label', 'aria-hidden': 'true' }, [h('strong', { text: String(score) }), h('small', { text: 'score' })]));
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { value.setAttribute('stroke-dashoffset', String(length * (1 - Math.min(score, 1000) / 1000))); });
    });
    return wrapper;
  }

  function badge(tone, text, iconName) {
    return h('span', { className: 'badge' + (tone ? ' badge-' + tone : '') + (iconName ? '' : ' badge-dot') }, [iconName ? icon(iconName) : null, text]);
  }

  function setBusy(button, busy, label) {
    button.disabled = busy;
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    var text = button.querySelector('.btn-label');
    if (text) {
      if (!button.dataset.idleLabel) button.dataset.idleLabel = text.textContent;
      text.textContent = busy ? label : button.dataset.idleLabel;
    }
  }

  function showAlert(element, message, iconName) {
    replace(element, [icon(iconName || 'warningCircle'), h('span', { text: message })]);
    element.hidden = false;
  }

  function hideAlert(element) { element.hidden = true; replace(element, []); }

  function ApiError(status, code, message) {
    this.status = status;
    this.code = code;
    this.message = message;
  }

  function api(path, options) {
    options = options || {};
    var headers = { Accept: 'application/json' };
    if (options.body) headers['Content-Type'] = 'application/json';
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    Object.keys(options.headers || {}).forEach(function (key) { headers[key] = options.headers[key]; });
    return fetch(path, { method: options.method || 'GET', headers: headers, body: options.body ? JSON.stringify(options.body) : undefined, credentials: 'omit' })
      .catch(function () { throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua rede e tente de novo.'); })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (payload) {
          if (response.ok) return payload;
          var error = payload && payload.error ? payload.error : {};
          if (response.status === 401 && state.token && path.indexOf('/auth/login') === -1) {
            logout('Sua sessão expirou. Entre novamente para continuar.');
          }
          throw new ApiError(response.status, error.code || 'HTTP_' + response.status, error.message || '');
        });
      });
  }

  function newIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'sim-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function applyTheme(theme) {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
    var dark = currentTheme() === 'dark';
    var toggle = $('themeToggle');
    replace(toggle, [icon(dark ? 'sun' : 'moon')]);
    toggle.setAttribute('aria-label', dark ? 'Usar tema claro' : 'Usar tema escuro');
  }

  function currentTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit) return explicit;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function storedTheme() {
    try { return localStorage.getItem('creditguard-theme') || ''; } catch (_error) { return ''; }
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('creditguard-theme', next); } catch (_error) { return applyTheme(next); }
    applyTheme(next);
  }

  function selectProfile(name) {
    var profile = PROFILES[name];
    document.querySelectorAll('[data-profile]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-profile') === name ? 'true' : 'false');
    });
    $('loginEmail').value = profile.email;
    $('loginPassword').value = profile.password;
    hideAlert($('loginAlert'));
    ($('loginAccessKey').value ? $('loginSubmit') : $('loginAccessKey')).focus();
  }

  function toggleVisibility(button) {
    var input = $(button.getAttribute('data-toggle-visibility'));
    var reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
    button.setAttribute('aria-label', (reveal ? 'Ocultar ' : 'Mostrar ') + button.getAttribute('aria-label').replace(/^(Mostrar|Ocultar) /, ''));
    replace(button, [icon(reveal ? 'eyeSlash' : 'eye')]);
  }

  function handleLogin(event) {
    event.preventDefault();
    var alertBox = $('loginAlert');
    var submit = $('loginSubmit');
    var email = $('loginEmail').value.trim();
    var password = $('loginPassword').value;
    var accessKey = $('loginAccessKey').value.trim();
    hideAlert(alertBox);
    if (!email || !password || !accessKey) {
      showAlert(alertBox, 'Preencha e-mail, senha e chave de acesso para entrar.');
      (!email ? $('loginEmail') : !password ? $('loginPassword') : $('loginAccessKey')).focus();
      return;
    }
    setBusy(submit, true, 'Entrando…');
    api('/api/v1/auth/login', { method: 'POST', body: { email: email, password: password }, headers: { 'x-demo-access-key': accessKey } })
      .then(function (payload) { startSession(payload); })
      .catch(function (error) {
        var message = error.status === 429
          ? 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'
          : error.status === 0 ? error.message : 'E-mail, senha ou chave de acesso inválidos.';
        showAlert(alertBox, message);
      })
      .then(function () { setBusy(submit, false); });
  }

  function startSession(payload) {
    state.token = payload.accessToken;
    state.user = payload.user;
    state.profiles = {};
    state.history.stale = true;
    state.customersRendered = false;
    clearTimeout(state.expiryTimer);
    state.expiryTimer = setTimeout(function () { logout('Sua sessão expirou. Entre novamente para continuar.'); }, Math.max(payload.expiresIn - 5, 5) * 1000);
    $('userName').textContent = payload.user.name;
    $('userRole').textContent = ROLE_LABEL[payload.user.role] || payload.user.role;
    $('userInitials').textContent = initials(payload.user.name);
    var viewer = payload.user.role !== 'ANALYST';
    $('viewerNotice').hidden = !viewer;
    Array.prototype.forEach.call($('simForm').elements, function (field) {
      if (field.id !== 'simCustomer') field.disabled = viewer;
    });
    $('loginView').hidden = true;
    $('appView').hidden = false;
    renderResultEmpty();
    loadReferenceData();
    navigate(routeFromHash(), true);
  }

  function logout(message) {
    state.token = '';
    state.user = null;
    clearTimeout(state.expiryTimer);
    $('appView').hidden = true;
    $('loginView').hidden = false;
    if (message) showAlert($('loginAlert'), message, 'info');
    else hideAlert($('loginAlert'));
    $('loginSubmit').focus();
  }

  function loadReferenceData() {
    renderProfileSkeleton();
    api('/api/v1/credit-policy').then(function (payload) {
      state.policy = payload.data;
      $('policyBadge').lastChild.textContent = payload.data.version;
      $('simAmountHint').textContent = 'De ' + money(payload.data.minimumAmountCents) + ' a ' + money(payload.data.maximumAmountCents) + '.';
    }).catch(function () { return null; });
    api('/api/v1/customers').then(function (payload) {
      state.customers = payload.data;
      var select = $('simCustomer');
      var filter = $('historyCustomer');
      var previous = select.value;
      replace(select, payload.data.map(function (customer) { return h('option', { value: customer.id, text: customer.name + ' · ' + (SEGMENT_LABEL[customer.segment] || customer.segment) }); }));
      replace(filter, [h('option', { value: '', text: 'Todos os clientes' })].concat(payload.data.map(function (customer) { return h('option', { value: customer.id, text: customer.name }); })));
      if (previous) select.value = previous;
      filter.value = state.history.customerId;
      updateCustomerProfile();
      if (state.route === 'clientes') renderCustomers();
    }).catch(function (error) {
      replace($('customerProfile'), [h('div', { className: 'alert alert-bad' }, [icon('warningCircle'), h('span', { text: friendlyError(error) })])]);
    });
  }

  function loadProfile(customerId) {
    if (state.profiles[customerId]) return Promise.resolve(state.profiles[customerId]);
    var history = api('/api/v1/customers/' + encodeURIComponent(customerId) + '/credit-history').then(function (payload) { return payload.data; });
    var finance = api('/api/v1/customers/' + encodeURIComponent(customerId) + '/open-finance').then(function (payload) { return payload.data; }).catch(function (error) {
      if (error.code === 'OPEN_FINANCE_CONSENT_REQUIRED') return null;
      throw error;
    });
    return Promise.all([history, finance]).then(function (values) {
      var profile = { history: values[0], finance: values[1] };
      state.profiles[customerId] = profile;
      return profile;
    });
  }

  function customerById(id) {
    return state.customers.filter(function (customer) { return customer.id === id; })[0];
  }

  function renderProfileSkeleton() {
    replace($('customerProfile'), [h('div', { className: 'sk-stack', 'aria-label': 'Carregando perfil do cliente', role: 'status' }, [
      h('div', { className: 'skeleton sk-title' }),
      h('div', { className: 'skeleton sk-block' }),
      h('div', { className: 'skeleton sk-line' })
    ])]);
  }

  function profileStats(profile) {
    var finance = profile.finance;
    var history = profile.history;
    function stat(label, value) { return h('div', null, [h('dt', { text: label }), h('dd', { text: value })]); }
    return h('dl', { className: 'pc-stats' }, [
      stat('Renda mensal', finance ? money(finance.monthlyIncomeCents) : 'Indisponível'),
      stat('Dívidas mensais', finance ? money(finance.monthlyDebtCents) : 'Indisponível'),
      stat('Atrasos em 12 meses', String(history.latePaymentsLast12Months)),
      stat('Relacionamento', history.relationshipMonths + ' meses')
    ]);
  }

  function profileFlags(profile) {
    return h('div', { className: 'pc-flags' }, [
      profile.history.hasRestrictions ? badge('bad', 'Restrição ativa', 'warningCircle') : badge('ok', 'Sem restrições', 'checkCircle'),
      profile.finance ? badge('ok', 'Open Finance autorizado', 'bank') : badge('warn', 'Sem consentimento Open Finance', 'bank'),
      badge('', profile.history.activeContracts + ' contratos ativos')
    ]);
  }

  function updateCustomerProfile() {
    var customerId = $('simCustomer').value;
    var customer = customerById(customerId);
    if (!customer) return;
    renderProfileSkeleton();
    loadProfile(customerId).then(function (profile) {
      if ($('simCustomer').value !== customerId) return;
      replace($('customerProfile'), [
        h('div', { className: 'pc-head' }, [
          h('span', { className: 'avatar', 'aria-hidden': 'true', text: initials(customer.name) }),
          h('div', null, [h('div', { className: 'pc-name', text: customer.name }), h('div', { className: 'pc-sub', text: 'Segmento ' + (SEGMENT_LABEL[customer.segment] || customer.segment) })])
        ]),
        h('div', { className: 'pc-body' }, [scoreRing(profile.history.score), profileStats(profile)]),
        profileFlags(profile)
      ]);
    }).catch(function (error) {
      replace($('customerProfile'), [h('div', { className: 'alert alert-bad' }, [icon('warningCircle'), h('span', { text: friendlyError(error) })])]);
    });
  }

  function parseAmount(raw) {
    var value = String(raw).replace(/[^0-9.,]/g, '');
    if (!value) return NaN;
    if (value.indexOf(',') !== -1) value = value.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(value)) value = value.replace(/\./g, '');
    var number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 100) : NaN;
  }

  function syncAmountChips() {
    var cents = parseAmount($('simAmount').value);
    document.querySelectorAll('[data-amount]').forEach(function (chip) {
      chip.setAttribute('aria-pressed', Number(chip.getAttribute('data-amount')) * 100 === cents ? 'true' : 'false');
    });
  }

  function setAmountError(message) {
    var error = $('simAmountError');
    $('simAmountWrap').classList.toggle('is-invalid', Boolean(message));
    if (message) {
      $('simAmount').setAttribute('aria-invalid', 'true');
      replace(error, [icon('warningCircle'), h('span', { text: message })]);
      error.hidden = false;
    } else {
      $('simAmount').removeAttribute('aria-invalid');
      replace(error, []);
      error.hidden = true;
    }
  }

  function friendlyError(error) {
    var messages = {
      OPEN_FINANCE_CONSENT_REQUIRED: 'Este cliente não autorizou o compartilhamento de dados via Open Finance, então a simulação não pode ser feita.',
      FORBIDDEN: 'Seu perfil não tem permissão para criar simulações.',
      VALIDATION_ERROR: 'Confira o valor e o prazo informados.',
      RATE_LIMIT_EXCEEDED: 'Muitas requisições em pouco tempo. Aguarde um minuto e tente de novo.',
      SIMULATION_CAPACITY_REACHED: 'O limite de simulações em memória foi atingido. Tente novamente mais tarde.',
      CUSTOMER_NOT_FOUND: 'Cliente não encontrado.',
      NETWORK_ERROR: 'Sem conexão com o servidor. Verifique sua rede e tente de novo.'
    };
    return messages[error.code] || 'Não foi possível concluir agora. Tente de novo em instantes.';
  }

  function handleSimulation(event) {
    event.preventDefault();
    var alertBox = $('simAlert');
    var submit = $('simSubmit');
    hideAlert(alertBox);
    var cents = parseAmount($('simAmount').value);
    var minimum = state.policy ? state.policy.minimumAmountCents : 10000;
    var maximum = state.policy ? state.policy.maximumAmountCents : 10000000;
    if (!Number.isFinite(cents) || cents < minimum || cents > maximum) {
      setAmountError('Informe um valor de ' + money(minimum) + ' a ' + money(maximum) + '.');
      $('simAmount').focus();
      return;
    }
    setAmountError('');
    var checked = document.querySelector('input[name="installments"]:checked');
    var body = { customerId: $('simCustomer').value, amountCents: cents, installments: Number(checked ? checked.value : 12) };
    setBusy(submit, true, 'Analisando…');
    renderResultSkeleton();
    api('/api/v1/credit-applications', { method: 'POST', body: body, headers: { 'Idempotency-Key': newIdempotencyKey() } })
      .then(function (payload) {
        state.history.stale = true;
        renderResult(payload.data);
      })
      .catch(function (error) {
        if (!state.token) return;
        renderResultEmpty();
        showAlert(alertBox, friendlyError(error));
      })
      .then(function () { setBusy(submit, false); });
  }

  function renderResultEmpty() {
    var analyst = state.user && state.user.role === 'ANALYST';
    $('resultMeta').textContent = '';
    replace($('resultBody'), [h('div', { className: 'empty' }, [
      icon(analyst ? 'calculator' : 'eye'),
      h('h3', { text: analyst ? 'O parecer aparece aqui' : 'Modo de consulta' }),
      h('p', { text: analyst ? 'Escolha um cliente, ajuste valor e prazo e clique em Simular proposta. A decisão vem com parcela, taxa e os motivos da política.' : 'Escolha um cliente para ver score, renda e restrições. Para simular uma proposta, entre com o perfil de analista.' })
    ])]);
  }

  function renderResultSkeleton() {
    $('resultMeta').textContent = 'Analisando…';
    replace($('resultBody'), [h('div', { className: 'sk-stack', role: 'status', 'aria-label': 'Analisando a proposta' }, [
      h('div', { className: 'skeleton', style: 'height:84px' }),
      h('div', { className: 'skeleton', style: 'height:64px' }),
      h('div', { className: 'skeleton sk-block' }),
      h('div', { className: 'skeleton sk-line' }),
      h('div', { className: 'skeleton sk-line', style: 'width:70%' })
    ])]);
  }

  function renderResult(application) {
    var decision = application.decision;
    var status = STATUS[decision.status] || STATUS.MANUAL_REVIEW;
    var ratio = Number(decision.debtToIncomeRatio);
    var limit = state.policy ? state.policy.maximumDebtToIncomeRatio : 0.3;
    var scale = limit * 2;
    var monthlyRate = Number(decision.monthlyInterestRate);
    var lastDiffers = decision.lastInstallmentCents !== decision.installmentCents;

    $('resultMeta').textContent = dateTime.format(new Date(application.createdAt));

    var fill = h('div', { className: 'meter-fill' + (ratio > limit ? ' is-bad' : '') });
    var meter = h('div', { className: 'meter' }, [
      h('div', { className: 'meter-head' }, [
        h('span', { className: 'muted', text: 'Comprometimento da renda com a nova parcela' }),
        h('strong', { text: percent.format(ratio) })
      ]),
      h('div', { className: 'meter-track', role: 'img', 'aria-label': 'Comprometimento de ' + percent.format(ratio) + ' para um limite de ' + percent.format(limit) }, [fill, h('span', { className: 'meter-limit' })]),
      h('div', { className: 'meter-scale' }, [h('span', { text: '0%' }), h('span', { text: 'Limite ' + percent.format(limit) }), h('span', { text: percent.format(scale) })])
    ]);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { fill.style.width = Math.min(ratio / scale, 1) * 100 + '%'; });
    });

    function fact(label, value, sub) {
      return h('div', null, [h('dt', { text: label }), h('dd', null, [value, sub ? h('small', { text: sub }) : null])]);
    }

    replace($('resultBody'), [
      h('div', { className: 'result-status' }, [
        h('span', { className: 'badge' }, [application.customer.name + ' · ' + money(application.request.amountCents) + ' em ' + application.request.installments + 'x']),
        h('h3', { className: 'result-title is-' + status.tone }, [icon(status.icon), status.label]),
        h('p', { className: 'result-text', text: status.text })
      ]),
      h('div', { className: 'result-lead' }, [
        h('div', null, [h('div', { className: 'figure-label', text: 'Parcela mensal' }), h('div', { className: 'figure-value', text: money(decision.installmentCents) })]),
        h('div', { className: 'figure-sub', text: lastDiffers ? 'Última parcela de ' + money(decision.lastInstallmentCents) : application.request.installments + ' parcelas iguais' })
      ]),
      h('dl', { className: 'facts' }, [
        fact('Taxa de juros', percent.format(monthlyRate) + ' ao mês', 'Pela faixa de score'),
        fact('Total a pagar', money(decision.totalRepaymentCents), 'Juros de ' + money(decision.totalRepaymentCents - application.request.amountCents)),
        fact('Disponível para parcelas', money(decision.availablePaymentCents), percent.format(limit) + ' da renda menos as dívidas'),
        fact('Score do cliente', String(application.creditHistory.score), application.creditHistory.latePaymentsLast12Months + ' atrasos em 12 meses')
      ]),
      meter,
      h('h3', { className: 'section-title', text: 'Motivos da decisão' }),
      h('ul', { className: 'reasons' }, decision.reasons.map(function (code) {
        var reason = REASONS[code] || { tone: 'warn', text: code };
        return h('li', null, [icon(reason.tone === 'ok' ? 'checkCircle' : reason.tone === 'bad' ? 'xCircle' : 'warningCircle', 'icon is-' + reason.tone), h('span', { text: reason.text })]);
      })),
      h('div', { className: 'result-foot' }, [
        h('span', null, ['Política ', h('code', { translate: 'no', text: decision.policyVersion })]),
        h('span', null, ['Simulação ', h('code', { translate: 'no', text: application.id.slice(0, 8) })]),
        h('span', { text: 'Valores educativos, sem IOF, tarifas ou CET' })
      ])
    ]);
  }

  function historyQuery() {
    var params = new URLSearchParams({ page: String(state.history.page), limit: String(state.history.limit) });
    if (state.history.status) params.set('status', state.history.status);
    if (state.history.customerId) params.set('customerId', state.history.customerId);
    return '/api/v1/credit-applications?' + params.toString();
  }

  function renderHistorySkeleton() {
    $('historyEmpty').hidden = true;
    $('historyPager').hidden = true;
    replace($('historyBody'), [0, 1, 2, 3].map(function () {
      return h('tr', null, [0, 1, 2, 3, 4, 5, 6].map(function () { return h('td', null, [h('div', { className: 'skeleton sk-line' })]); }));
    }));
  }

  function loadHistory() {
    renderHistorySkeleton();
    state.history.stale = false;
    api(historyQuery()).then(function (payload) {
      var items = payload.data;
      var pagination = payload.pagination;
      var pages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
      if (!items.length) {
        replace($('historyBody'), []);
        var filtered = state.history.status || state.history.customerId;
        replace($('historyEmpty'), [h('div', { className: 'empty' }, [
          icon(filtered ? 'funnel' : 'clockCounterClockwise'),
          h('h3', { text: filtered ? 'Nenhuma simulação com esses filtros' : 'Nenhuma simulação ainda' }),
          h('p', { text: filtered ? 'Tente outra decisão ou outro cliente.' : (state.user && state.user.role === 'ANALYST' ? 'Faça a primeira simulação e ela aparece aqui com o parecer completo.' : 'Como visualizador, você não cria simulações, então seu histórico fica vazio.') }),
          !filtered && state.user && state.user.role === 'ANALYST' ? h('button', { type: 'button', className: 'btn btn-primary', onClick: function () { navigate('simular'); } }, [icon('calculator'), 'Fazer uma simulação']) : null
        ])]);
        $('historyEmpty').hidden = false;
        $('historyPager').hidden = true;
        return;
      }
      $('historyEmpty').hidden = true;
      replace($('historyBody'), items.map(function (application) {
        var status = STATUS[application.decision.status] || STATUS.MANUAL_REVIEW;
        return h('tr', null, [
          h('td', { className: 'num', text: dateTime.format(new Date(application.createdAt)) }),
          h('td', { className: 'td-strong' }, [application.customer.name, h('span', { className: 'cell-sub', text: SEGMENT_LABEL[application.customer.segment] || application.customer.segment })]),
          h('td', { className: 'td-num', text: money(application.request.amountCents) }),
          h('td', { className: 'td-num', text: application.request.installments + 'x' }),
          h('td', { className: 'td-num', text: money(application.decision.installmentCents) }),
          h('td', null, [badge(status.tone, status.label)]),
          h('td', { className: 'td-num' }, [h('button', { type: 'button', className: 'link-btn', 'aria-label': 'Abrir parecer de ' + application.customer.name, onClick: function () { openApplication(application); } }, ['Abrir', icon('caretRight')])])
        ]);
      }));
      $('historyPageInfo').textContent = pagination.total + (pagination.total === 1 ? ' simulação' : ' simulações') + ' · página ' + pagination.page + ' de ' + pages;
      $('historyPrev').disabled = pagination.page <= 1;
      $('historyNext').disabled = pagination.page >= pages;
      $('historyPager').hidden = false;
    }).catch(function (error) {
      if (!state.token) return;
      replace($('historyBody'), []);
      replace($('historyEmpty'), [h('div', { className: 'empty' }, [
        icon('warningCircle'),
        h('h3', { text: 'Não foi possível carregar o histórico' }),
        h('p', { text: friendlyError(error) }),
        h('button', { type: 'button', className: 'btn btn-secondary', onClick: loadHistory }, ['Tentar de novo'])
      ])]);
      $('historyEmpty').hidden = false;
      state.history.stale = true;
    });
  }

  function openApplication(application) {
    $('simCustomer').value = application.customer.id;
    updateCustomerProfile();
    navigate('simular');
    renderResult(application);
  }

  function renderCustomers() {
    var grid = $('customerGrid');
    if (!state.customers.length) {
      replace(grid, [0, 1, 2].map(function () { return h('div', { className: 'card' }, [h('div', { className: 'sk-stack' }, [h('div', { className: 'skeleton sk-title' }), h('div', { className: 'skeleton sk-block' })])]); }));
      return;
    }
    state.customersRendered = true;
    replace(grid, state.customers.map(function (customer) {
      var body = h('div', { className: 'cc-body' }, [h('div', { className: 'skeleton', style: 'width:64px;height:64px;border-radius:50%' }), h('div', { className: 'sk-stack' }, [h('div', { className: 'skeleton sk-line' }), h('div', { className: 'skeleton sk-line' })])]);
      var flags = h('div');
      var card = h('article', { className: 'card customer-card', 'aria-label': customer.name }, [
        h('div', { className: 'pc-head' }, [
          h('span', { className: 'avatar', 'aria-hidden': 'true', text: initials(customer.name) }),
          h('div', null, [h('div', { className: 'pc-name', text: customer.name }), h('div', { className: 'pc-sub', text: 'Segmento ' + (SEGMENT_LABEL[customer.segment] || customer.segment) })])
        ]),
        body,
        flags,
        h('div', { className: 'cc-foot' }, [
          h('span', { className: 'muted small', text: 'Data-base 01/11/2026' }),
          h('button', { type: 'button', className: 'btn btn-secondary btn-sm', onClick: function () { $('simCustomer').value = customer.id; updateCustomerProfile(); navigate('simular'); } }, ['Simular', icon('arrowRight')])
        ])
      ]);
      loadProfile(customer.id).then(function (profile) {
        replace(body, [scoreRing(profile.history.score, true), profileStats(profile)]);
        replace(flags, [profileFlags(profile)]);
      }).catch(function (error) {
        replace(body, [h('div', { className: 'alert alert-bad' }, [icon('warningCircle'), h('span', { text: friendlyError(error) })])]);
      });
      return card;
    }));
  }

  function routeFromHash() {
    var route = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return ROUTES.indexOf(route) === -1 ? 'simular' : route;
  }

  function readHistoryFromHash() {
    var query = window.location.hash.split('?')[1] || '';
    var params = new URLSearchParams(query);
    var status = params.get('decisao') || '';
    state.history.status = STATUS[status] ? status : '';
    state.history.customerId = params.get('cliente') || '';
    state.history.page = Math.max(1, parseInt(params.get('pagina') || '1', 10) || 1);
    document.querySelectorAll('input[name="historyStatus"]').forEach(function (radio) { radio.checked = radio.value === state.history.status; });
    $('historyCustomer').value = state.history.customerId;
  }

  function historyHash() {
    var params = new URLSearchParams();
    if (state.history.status) params.set('decisao', state.history.status);
    if (state.history.customerId) params.set('cliente', state.history.customerId);
    if (state.history.page > 1) params.set('pagina', String(state.history.page));
    var query = params.toString();
    return '#historico' + (query ? '?' + query : '');
  }

  function changeHistory(update) {
    update();
    history.replaceState(null, '', historyHash());
    loadHistory();
  }

  function navigate(route, replaceHistory) {
    if (ROUTES.indexOf(route) === -1) route = 'simular';
    var previousRoute = state.route;
    state.route = route;
    if (route === 'historico' && routeFromHash() === 'historico' && window.location.hash.indexOf('?') !== -1) {
      readHistoryFromHash();
      state.history.stale = true;
    }
    var hash = route === 'historico' ? historyHash() : '#' + route;
    if (window.location.hash !== hash) {
      if (replaceHistory) history.replaceState(null, '', hash);
      else history.pushState(null, '', hash);
    }
    ROUTES.forEach(function (name) {
      var active = name === route;
      var tab = $('tab-' + name);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
      $('panel-' + name).hidden = !active;
    });
    if (route === 'historico' && state.history.stale) loadHistory();
    if (route === 'clientes' && !state.customersRendered) renderCustomers();
    if (previousRoute !== route) window.scrollTo(0, 0);
  }

  function handleTabKeys(event) {
    var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
    var index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    var next = null;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;
    event.preventDefault();
    navigate(next.getAttribute('data-route'));
    next.focus();
  }

  function loadVersion() {
    fetch('/version', { headers: { Accept: 'application/json' } }).then(function (response) { return response.ok ? response.json() : null; }).then(function (payload) {
      if (!payload) return;
      var commit = String(payload.commit || '');
      $('appVersion').textContent = 'Versão ' + payload.version + (commit && commit !== 'development' ? ' · ' + commit.slice(0, 7) : '');
    }).catch(function () { return null; });
  }

  function init() {
    applyTheme(storedTheme());
    $('themeToggle').addEventListener('click', toggleTheme);
    document.querySelectorAll('[data-profile]').forEach(function (button) {
      button.addEventListener('click', function () { selectProfile(button.getAttribute('data-profile')); });
    });
    document.querySelectorAll('[data-toggle-visibility]').forEach(function (button) {
      button.addEventListener('click', function () { toggleVisibility(button); });
    });
    $('loginForm').addEventListener('submit', handleLogin);
    $('logoutButton').addEventListener('click', function () { logout(''); });
    $('simForm').addEventListener('submit', handleSimulation);
    $('simCustomer').addEventListener('change', updateCustomerProfile);
    $('simAmount').addEventListener('input', function () { setAmountError(''); syncAmountChips(); });
    $('simAmount').addEventListener('blur', function () {
      var cents = parseAmount($('simAmount').value);
      if (Number.isFinite(cents)) $('simAmount').value = decimal.format(cents / 100);
      syncAmountChips();
    });
    document.querySelectorAll('[data-amount]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $('simAmount').value = decimal.format(Number(chip.getAttribute('data-amount')));
        setAmountError('');
        syncAmountChips();
      });
    });
    document.querySelectorAll('[role="tab"]').forEach(function (tab) {
      tab.addEventListener('click', function () { navigate(tab.getAttribute('data-route')); });
    });
    document.querySelector('[role="tablist"]').addEventListener('keydown', handleTabKeys);
    window.addEventListener('popstate', function () { if (state.token) navigate(routeFromHash(), true); });
    document.querySelectorAll('input[name="historyStatus"]').forEach(function (radio) {
      radio.addEventListener('change', function () { changeHistory(function () { state.history.status = radio.value; state.history.page = 1; }); });
    });
    $('historyCustomer').addEventListener('change', function () { changeHistory(function () { state.history.customerId = $('historyCustomer').value; state.history.page = 1; }); });
    $('historyRefresh').addEventListener('click', loadHistory);
    $('historyPrev').addEventListener('click', function () { changeHistory(function () { state.history.page = Math.max(1, state.history.page - 1); }); });
    $('historyNext').addEventListener('click', function () { changeHistory(function () { state.history.page += 1; }); });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { applyTheme(document.documentElement.getAttribute('data-theme') || ''); });
    }
    loadVersion();
  }

  init();
})();
`;

export const script = `var ICONS = ${JSON.stringify(iconMarkup())};\n${client}`;
