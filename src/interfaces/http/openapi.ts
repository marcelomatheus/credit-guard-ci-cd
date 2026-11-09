const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const response = (description: string, schema: object) => ({ description, content: json(schema) });
const data = (schema: object) => ({ type: 'object', required: ['data'], properties: { data: schema } });
const errorResponses = Object.fromEntries([400, 401, 403, 404, 409, 413, 422, 429, 503].map((status) => [status, response('Request rejected', ref('Error'))]));
const secured = { security: [{ bearerAuth: [] }] };
const customerId = { name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'customer-stable' };

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Mock Credit Analysis API',
    version: '1.0.0',
    description: 'Synthetic customers, users, Open Finance and credit history. No database or real financial integrations. Simulations and idempotency records expire after the configured TTL and are lost on restart. Application history is scoped to the authenticated user. All amounts are integer BRL cents. A demo access key is required to log in.'
  },
  servers: [{ url: '/' }],
  tags: ['Authentication', 'Customers', 'Credit analysis', 'Operations'].map((name) => ({ name })),
  paths: {
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'], summary: 'Authenticate a mock user', security: [{ demoAccessKey: [] }],
        requestBody: { required: true, content: json({ type: 'object', additionalProperties: false, required: ['email', 'password'], properties: { email: { type: 'string', format: 'email', example: 'analyst@example.test' }, password: { type: 'string', format: 'password', example: 'AnalystDemo!2026' } } }) },
        responses: { ...errorResponses, 200: response('Access token issued', { type: 'object', required: ['accessToken', 'tokenType', 'expiresIn', 'user'], properties: { accessToken: { type: 'string' }, tokenType: { type: 'string', enum: ['Bearer'] }, expiresIn: { type: 'integer' }, user: ref('User') } }) }
      }
    },
    '/api/v1/auth/me': { get: { ...secured, tags: ['Authentication'], summary: 'Read the authenticated profile', responses: { ...errorResponses, 200: response('User profile', data(ref('User'))) } } },
    '/api/v1/customers': { get: { ...secured, tags: ['Customers'], summary: 'List five synthetic customers', responses: { ...errorResponses, 200: response('Mock customers', data({ type: 'array', items: ref('Customer') })) } } },
    '/api/v1/customers/{id}': { get: { ...secured, tags: ['Customers'], summary: 'Read a synthetic customer', parameters: [customerId], responses: { ...errorResponses, 200: response('Mock customer', data(ref('Customer'))) } } },
    '/api/v1/customers/{id}/open-finance': { get: { ...secured, tags: ['Customers'], summary: 'Consult a mock Open Finance snapshot', parameters: [customerId], responses: { ...errorResponses, 200: response('Mock Open Finance data', data(ref('OpenFinance'))) } } },
    '/api/v1/customers/{id}/credit-history': { get: { ...secured, tags: ['Customers'], summary: 'Consult a mock credit history', parameters: [customerId], responses: { ...errorResponses, 200: response('Mock credit history', data(ref('CreditHistory'))) } } },
    '/api/v1/credit-policy': { get: { ...secured, tags: ['Credit analysis'], summary: 'Read the active policy and interest tiers', responses: { ...errorResponses, 200: response('Active policy', data({ type: 'object' })) } } },
    '/api/v1/credit-applications': {
      post: {
        ...secured, tags: ['Credit analysis'], summary: 'Run a simulation as an analyst',
        description: 'Inputs come from the mock customer gateways. The idempotency key is scoped to the user. A replay returns the original record; a different payload with the same key returns 409. Idempotency is process-local and expires with the record.',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9._:-]+$' }, example: 'demo-application-001' }],
        requestBody: { required: true, content: json(ref('CreditRequest')) },
        responses: {
          ...errorResponses,
          201: { ...response('Simulation created', data(ref('CreditApplication'))), headers: { Location: { schema: { type: 'string' } }, 'Idempotency-Replayed': { schema: { type: 'string', enum: ['false'] } } } },
          200: response('Idempotent replay', data(ref('CreditApplication')))
        }
      },
      get: {
        ...secured, tags: ['Credit analysis'], summary: 'List simulations owned by the current user',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100000, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'customerId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['APPROVED', 'REJECTED', 'MANUAL_REVIEW'] } }
        ],
        responses: { ...errorResponses, 200: response('Paginated simulations', { ...data({ type: 'array', items: ref('CreditApplication') }), properties: { data: { type: 'array', items: ref('CreditApplication') }, pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' } } } } }) }
      }
    },
    '/api/v1/credit-applications/{id}': { get: { ...secured, tags: ['Credit analysis'], summary: 'Read a simulation owned by the current user', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { ...errorResponses, 200: response('Simulation with source snapshots', data(ref('CreditApplication'))) } } },
    '/health/live': { get: { tags: ['Operations'], responses: { 200: response('Process is alive', { type: 'object', properties: { status: { type: 'string', enum: ['alive'] } } }) } } },
    '/health/ready': { get: { tags: ['Operations'], responses: { 200: response('Process is ready', { type: 'object', properties: { status: { type: 'string', enum: ['ready'] }, storage: { type: 'string', enum: ['memory'] } } }), 503: response('Process is draining', { type: 'object' }) } } },
    '/version': { get: { tags: ['Operations'], responses: { 200: response('Build identification', { type: 'object', properties: { version: { type: 'string' }, commit: { type: 'string' }, node: { type: 'string' } } }) } } },
    '/metrics': { get: { tags: ['Operations'], summary: 'Prometheus metrics exposition', responses: { 200: { description: 'Prometheus formatted metrics', content: { 'text/plain': { schema: { type: 'string' } } } } } } }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      demoAccessKey: { type: 'apiKey', in: 'header', name: 'x-demo-access-key' }
    },
    schemas: {
      Error: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code', 'message', 'requestId'], properties: { code: { type: 'string' }, message: { type: 'string' }, requestId: { type: 'string' }, details: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } } } } } },
      User: { type: 'object', required: ['id', 'email', 'name', 'role'], properties: { id: { type: 'string' }, email: { type: 'string', format: 'email' }, name: { type: 'string' }, role: { type: 'string', enum: ['ANALYST', 'VIEWER'] } } },
      Customer: { type: 'object', required: ['id', 'name', 'segment'], properties: { id: { type: 'string' }, name: { type: 'string' }, segment: { type: 'string', enum: ['STANDARD', 'PREMIUM'] } } },
      CreditRequest: { type: 'object', additionalProperties: false, required: ['customerId', 'amountCents', 'installments'], properties: { customerId: { type: 'string', pattern: '^customer-[a-z-]+$', maxLength: 80, example: 'customer-stable' }, amountCents: { type: 'integer', minimum: 10000, maximum: 10000000, example: 100000 }, installments: { type: 'integer', minimum: 1, maximum: 60, example: 12 } } },
      OpenFinance: { type: 'object', required: ['customerId', 'source', 'asOf', 'consent', 'monthlyIncomeCents', 'monthlyDebtCents', 'balanceCents', 'connectedInstitutions'], properties: { customerId: { type: 'string' }, source: { type: 'string', enum: ['MOCK_OPEN_FINANCE'] }, asOf: { type: 'string', format: 'date-time' }, consent: { type: 'string', enum: ['GRANTED'] }, monthlyIncomeCents: { type: 'integer' }, monthlyDebtCents: { type: 'integer' }, balanceCents: { type: 'integer' }, connectedInstitutions: { type: 'array', items: { type: 'string' } } } },
      CreditHistory: { type: 'object', required: ['customerId', 'source', 'asOf', 'score', 'hasRestrictions', 'latePaymentsLast12Months', 'activeContracts', 'relationshipMonths'], properties: { customerId: { type: 'string' }, source: { type: 'string', enum: ['MOCK_CREDIT_HISTORY'] }, asOf: { type: 'string', format: 'date-time' }, score: { type: 'integer', minimum: 0, maximum: 1000 }, hasRestrictions: { type: 'boolean' }, latePaymentsLast12Months: { type: 'integer' }, activeContracts: { type: 'integer' }, relationshipMonths: { type: 'integer' } } },
      Decision: { type: 'object', required: ['status', 'reasons', 'policyVersion', 'currency', 'monthlyInterestRate', 'installmentCents', 'lastInstallmentCents', 'totalRepaymentCents', 'availablePaymentCents', 'debtToIncomeRatio'], properties: { status: { type: 'string', enum: ['APPROVED', 'REJECTED', 'MANUAL_REVIEW'] }, reasons: { type: 'array', items: { type: 'string' } }, policyVersion: { type: 'string' }, currency: { type: 'string', enum: ['BRL'] }, monthlyInterestRate: { type: 'string', example: '0.0150' }, installmentCents: { type: 'integer' }, lastInstallmentCents: { type: 'integer' }, totalRepaymentCents: { type: 'integer' }, availablePaymentCents: { type: 'integer' }, debtToIncomeRatio: { type: 'string' } } },
      CreditApplication: { type: 'object', required: ['id', 'createdAt', 'expiresAt', 'createdBy', 'customer', 'request', 'openFinance', 'creditHistory', 'decision'], properties: { id: { type: 'string', format: 'uuid' }, createdAt: { type: 'string', format: 'date-time' }, expiresAt: { type: 'string', format: 'date-time' }, createdBy: { type: 'string' }, customer: ref('Customer'), request: ref('CreditRequest'), openFinance: ref('OpenFinance'), creditHistory: ref('CreditHistory'), decision: ref('Decision') } }
    }
  }
};
