/**
 * Category 2 — Semantic Cross-Reference Checks
 *
 * For frontend-backend-handoff.json:
 *   - form.page / table.page / action.page / upload.page must reference an existing page.name
 *   - If authFlows includes role-based-access, at least one page must have roles[]
 *   - If any page has requiresAuth: true, authFlows must include login
 *
 * For repo-handoff.json:
 *   - Worker service requires infrastructure.queue
 *   - monorepo repoType requires non-empty packages[]
 *   - payment integration requires secretScanningEnabled: true
 */

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory2(type, data) {
  const checks = [];

  if (type === 'frontend-backend') {
    checks.push(...checkFrontendBackendSemantic(data));
  } else if (type === 'repo') {
    checks.push(...checkRepoSemantic(data));
  }

  return checks;
}

/**
 * Extract the type identifier from an authFlow entry.
 * Handles three formats:
 *   - string:  "login"
 *   - object:  { type: "login", ... }
 *   - object:  { name: "login", endpoint: ..., ... }
 */
function getAuthFlowType(flow) {
  if (typeof flow === 'string') return flow;
  return (flow.type || flow.name || '').toLowerCase();
}

function checkFrontendBackendSemantic(data) {
  const checks = [];
  const pageNames = new Set((data.pages || []).map(p => p.name));

  // --- page reference checks ---
  const referenceChecks = [
    { items: data.forms,   label: 'Form page reference',   idPrefix: 'form' },
    { items: data.tables,  label: 'Table page reference',  idPrefix: 'table' },
    { items: data.actions, label: 'Action page reference', idPrefix: 'action' },
    { items: data.uploads, label: 'Upload page reference', idPrefix: 'upload' },
  ];

  for (const { items, label, idPrefix } of referenceChecks) {
    if (!items || items.length === 0) continue;

    const broken = items.filter(item => item.page && !pageNames.has(item.page));
    if (broken.length === 0) {
      checks.push({
        id: `semantic-${idPrefix}-page-refs`,
        category: 'semantic',
        label: `${label.split(' ')[0]} Page References`,
        status: 'pass',
        message: `All ${idPrefix}s reference valid page names.`,
        severity: 'error',
      });
    } else {
      broken.forEach(item => {
        checks.push({
          id: `semantic-${idPrefix}-page-ref`,
          category: 'semantic',
          label: label,
          status: 'fail',
          message: `${label.split(' ')[0]} "${item.name}" references page "${item.page}" which does not exist in pages[].`,
          severity: 'error',
          field: `${idPrefix}s[name="${item.name}"].page`,
        });
      });
    }
  }

  // --- role-based-access: at least one page must define roles[] ---
  const authFlowTypes = (data.authFlows || []).map(a => getAuthFlowType(a));
  const hasRBACFlow = authFlowTypes.includes('role-based-access');
  const pagesWithRoles = (data.pages || []).filter(p => p.roles && p.roles.length > 0);

  if (hasRBACFlow) {
    if (pagesWithRoles.length > 0) {
      checks.push({
        id: 'semantic-rbac-page-roles',
        category: 'semantic',
        label: 'RBAC: Pages Define Roles',
        status: 'pass',
        message: `role-based-access auth flow detected and ${pagesWithRoles.length} page(s) define roles.`,
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'semantic-rbac-page-roles',
        category: 'semantic',
        label: 'RBAC: Pages Define Roles',
        status: 'fail',
        message: 'authFlows includes "role-based-access" but no page defines roles[]. At least one page must declare roles.',
        severity: 'error',
        field: 'pages[].roles',
      });
    }
  }

  // --- requiresAuth: true pages require a login flow ---
  const authRequiredPages = (data.pages || []).filter(p => p.requiresAuth === true);
  const hasLoginFlow = authFlowTypes.includes('login');

  if (authRequiredPages.length > 0) {
    if (hasLoginFlow) {
      checks.push({
        id: 'semantic-auth-login-flow',
        category: 'semantic',
        label: 'Auth-Required Pages Have Login Flow',
        status: 'pass',
        message: `${authRequiredPages.length} page(s) require auth and a "login" authFlow is declared.`,
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'semantic-auth-login-flow',
        category: 'semantic',
        label: 'Auth-Required Pages Have Login Flow',
        status: 'fail',
        message: `${authRequiredPages.length} page(s) have requiresAuth: true but authFlows does not include a "login" flow.`,
        severity: 'error',
        field: 'authFlows',
      });
    }
  }

  return checks;
}

function checkRepoSemantic(data) {
  const checks = [];

  // --- worker service requires queue infrastructure ---
  const services = data.backend?.services || [];
  const hasWorker = services.some(s => s.type === 'worker');
  const queueDefined = data.infrastructure?.queue && data.infrastructure.queue !== 'none' && data.infrastructure.queue !== '';

  if (hasWorker) {
    if (queueDefined) {
      checks.push({
        id: 'semantic-worker-queue',
        category: 'semantic',
        label: 'Worker Service Has Queue',
        status: 'pass',
        message: `Worker service detected and infrastructure.queue is "${data.infrastructure.queue}".`,
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'semantic-worker-queue',
        category: 'semantic',
        label: 'Worker Service Has Queue',
        status: 'fail',
        message: 'backend.services[] contains a worker type but infrastructure.queue is empty or missing.',
        severity: 'error',
        field: 'infrastructure.queue',
      });
    }
  }

  // --- monorepo requires non-empty packages[] ---
  if (data.project?.repoType === 'monorepo') {
    const packages = data.packages || [];
    if (packages.length > 0) {
      checks.push({
        id: 'semantic-monorepo-packages',
        category: 'semantic',
        label: 'Monorepo Has Packages',
        status: 'pass',
        message: `Monorepo declared with ${packages.length} package(s) defined.`,
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'semantic-monorepo-packages',
        category: 'semantic',
        label: 'Monorepo Has Packages',
        status: 'fail',
        message: 'project.repoType is "monorepo" but packages[] is empty. Monorepos must define at least one shared package.',
        severity: 'error',
        field: 'packages',
      });
    }
  }

  // --- payment integration requires secret scanning ---
  const integrations = data.integrations || [];
  const hasPayment = integrations.some(i => i.type === 'payment');
  const secretScanEnabled = data.security?.secretScanningEnabled === true;

  if (hasPayment) {
    if (secretScanEnabled) {
      checks.push({
        id: 'semantic-payment-secret-scan',
        category: 'semantic',
        label: 'Payment Integration: Secret Scanning',
        status: 'pass',
        message: 'Payment integration detected and security.secretScanningEnabled is true.',
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'semantic-payment-secret-scan',
        category: 'semantic',
        label: 'Payment Integration: Secret Scanning',
        status: 'fail',
        message: 'integrations[] contains a payment type but security.secretScanningEnabled is not true. Secret scanning is mandatory when handling payments.',
        severity: 'error',
        field: 'security.secretScanningEnabled',
      });
    }
  }

  return checks;
}
