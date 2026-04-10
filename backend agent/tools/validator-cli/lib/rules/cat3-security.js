/**
 * Category 3 — Security Baseline Checks (Rule 6)
 *
 * For frontend-backend-handoff.json:
 *   - If authFlows is non-empty, it must contain login
 *   - If externalTriggers includes payment-webhook, assumptions must mention signature verification
 *
 * For repo-handoff.json:
 *   - security.secretScanningEnabled must be true → warn if false
 *   - security.securityMdIncluded must be true → warn if false
 *   - security.gitignoreComprehensive must be true → warn if false
 *   - security.ciSecurityScanStep must be true → info if false
 */

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory3(type, data) {
  if (type === 'frontend-backend') return checkFrontendBackendSecurity(data);
  if (type === 'repo') return checkRepoSecurity(data);
  return [];
}

function getAuthFlowType(flow) {
  if (typeof flow === 'string') return flow;
  return (flow.type || flow.name || '').toLowerCase();
}

function getAssumptionText(a) {
  if (typeof a === 'string') return a;
  return a.statement || a.text || a.description || '';
}

function checkFrontendBackendSecurity(data) {
  const checks = [];
  const authFlowTypes = (data.authFlows || []).map(a => getAuthFlowType(a));

  // Auth flows must include login
  if (authFlowTypes.length > 0) {
    if (authFlowTypes.includes('login')) {
      checks.push({
        id: 'security-auth-has-login',
        category: 'security',
        label: 'Auth Flows Include Login',
        status: 'pass',
        message: 'authFlows is non-empty and includes a "login" flow.',
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'security-auth-has-login',
        category: 'security',
        label: 'Auth Flows Include Login',
        status: 'fail',
        message: 'authFlows is non-empty but does not include a "login" type. Every authenticated system must define a login flow.',
        severity: 'error',
        field: 'authFlows',
      });
    }
  }

  // Payment webhook requires signature verification assumption
  const triggers = data.externalTriggers || [];
  const hasPaymentWebhook = triggers.some(t => t.type === 'payment-webhook');
  const assumptions = data.assumptions || [];

  if (hasPaymentWebhook) {
    const signatureVerified = assumptions.some(a =>
      ['signature', 'hmac', 'webhook secret'].some(kw => getAssumptionText(a).toLowerCase().includes(kw))
    );
    if (signatureVerified) {
      checks.push({
        id: 'security-webhook-signature',
        category: 'security',
        label: 'Payment Webhook Signature Verification',
        status: 'pass',
        message: 'Payment webhook detected and assumptions reference signature verification.',
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'security-webhook-signature',
        category: 'security',
        label: 'Payment Webhook Signature Verification',
        status: 'fail',
        message: 'externalTriggers includes "payment-webhook" but assumptions do not mention signature verification (HMAC). Add an assumption referencing webhook signature validation.',
        severity: 'error',
        field: 'assumptions',
      });
    }
  }

  return checks;
}

function checkRepoSecurity(data) {
  const checks = [];
  const sec = data.security || {};

  // secretScanningEnabled → warn
  checks.push({
    id: 'security-secret-scanning',
    category: 'security',
    label: 'Secret Scanning Enabled',
    status: sec.secretScanningEnabled === true ? 'pass' : 'warn',
    message: sec.secretScanningEnabled === true
      ? 'security.secretScanningEnabled is true (.gitleaks.toml or equivalent present).'
      : 'security.secretScanningEnabled is not true. Add .gitleaks.toml or a secret scanning step to CI.',
    severity: 'warning',
    field: sec.secretScanningEnabled === true ? undefined : 'security.secretScanningEnabled',
  });

  // securityMdIncluded → warn
  checks.push({
    id: 'security-md-included',
    category: 'security',
    label: 'SECURITY.md Included',
    status: sec.securityMdIncluded === true ? 'pass' : 'warn',
    message: sec.securityMdIncluded === true
      ? 'security.securityMdIncluded is true (SECURITY.md present in repo).'
      : 'security.securityMdIncluded is not true. Add a SECURITY.md file documenting the vulnerability disclosure process.',
    severity: 'warning',
    field: sec.securityMdIncluded === true ? undefined : 'security.securityMdIncluded',
  });

  // gitignoreComprehensive → warn
  checks.push({
    id: 'security-gitignore',
    category: 'security',
    label: '.gitignore Comprehensive',
    status: sec.gitignoreComprehensive === true ? 'pass' : 'warn',
    message: sec.gitignoreComprehensive === true
      ? 'security.gitignoreComprehensive is true.'
      : 'security.gitignoreComprehensive is not true. Ensure .gitignore covers .env, node_modules, dist, build artifacts.',
    severity: 'warning',
    field: sec.gitignoreComprehensive === true ? undefined : 'security.gitignoreComprehensive',
  });

  // ciSecurityScanStep → info
  checks.push({
    id: 'security-ci-scan',
    category: 'security',
    label: 'CI Security Scan Step',
    status: sec.ciSecurityScanStep === true ? 'pass' : 'warn',
    message: sec.ciSecurityScanStep === true
      ? 'security.ciSecurityScanStep is true (npm audit / pip-audit step in CI).'
      : 'security.ciSecurityScanStep is not set. Consider adding npm audit or pip-audit to your CI pipeline.',
    severity: sec.ciSecurityScanStep === true ? 'info' : 'info',
    field: sec.ciSecurityScanStep === true ? undefined : 'security.ciSecurityScanStep',
  });

  return checks;
}
