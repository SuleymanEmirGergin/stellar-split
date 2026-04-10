/**
 * Category 5 — Security Playbook Baseline (Rule 13)
 *
 * For frontend-backend-handoff.json:
 *   - PII fields (email, phone, ssn, card, national_id, dob, address) → encryption assumption required
 *   - Auth flows (login/register) → CORS assumption required
 *   - Public page with user-submitted data → rate limiting assumption
 *
 * For repo-handoff.json:
 *   - security.securityMdIncluded must be true → blocking failure if false
 *   - security.ciSecurityScanStep → warning if false
 *   - payment or auth integration → secretScanningEnabled must be true → blocking if false
 *   - admin route → assumptions should reference IpBlockerService → warning
 */

const PII_FIELD_TYPES = ['email', 'phone'];
const PII_FIELD_NAMES = ['ssn', 'national_id', 'dob', 'address', 'card', 'creditcard', 'cardnumber'];

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory5(type, data) {
  if (type === 'frontend-backend') return checkFrontendBackendPlaybook(data);
  if (type === 'repo') return checkRepoPlaybook(data);
  return [];
}

function checkFrontendBackendPlaybook(data) {
  const checks = [];
  const assumptions = data.assumptions || [];
  const assumptionText = assumptions.map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  // --- PII field detection → encryption assumption ---
  const allFields = (data.forms || []).flatMap(f => f.fields || []);
  const hasPiiType = allFields.some(f => PII_FIELD_TYPES.includes((f.type || '').toLowerCase()));
  const hasPiiName = allFields.some(f =>
    PII_FIELD_NAMES.some(pii => (f.name || '').toLowerCase().includes(pii))
  );
  const hasPii = hasPiiType || hasPiiName;

  if (hasPii) {
    const hasEncryptionAssumption = assumptionText.includes('encrypt') ||
      assumptionText.includes('aes') || assumptionText.includes('field-level');

    checks.push({
      id: 'playbook-pii-encryption-assumption',
      category: 'security',
      label: 'PII Fields: Encryption Assumption',
      status: hasEncryptionAssumption ? 'pass' : 'warn',
      message: hasEncryptionAssumption
        ? 'PII fields detected and an encryption assumption is declared.'
        : 'PII fields detected (email/phone/address etc.) but no encryption assumption found in assumptions[]. Add an assumption referencing field-level encryption (e.g. AES-256-GCM).',
      severity: 'warning',
      field: hasEncryptionAssumption ? undefined : 'assumptions',
    });
  }

  // --- Auth flows → CORS assumption ---
  const authFlowTypes = (data.authFlows || []).map(a => a.type);
  const hasLoginOrRegister = authFlowTypes.includes('login') || authFlowTypes.includes('register');

  if (hasLoginOrRegister) {
    const hasCorsAssumption = assumptionText.includes('cors') || assumptionText.includes('origin');
    checks.push({
      id: 'playbook-cors-assumption',
      category: 'security',
      label: 'Auth Flows: CORS Assumption',
      status: hasCorsAssumption ? 'pass' : 'warn',
      message: hasCorsAssumption
        ? 'Auth flows detected and a CORS assumption is declared.'
        : 'Auth flows (login/register) detected but no CORS assumption found. Add an assumption referencing CORS allowlist configuration.',
      severity: 'warning',
      field: hasCorsAssumption ? undefined : 'assumptions',
    });
  }

  // --- Public page that accepts data → rate limiting assumption ---
  const publicPagesWithForms = (data.pages || []).filter(p => {
    const isPublic = p.requiresAuth !== true;
    const hasForm = (data.forms || []).some(f => f.page === p.name);
    return isPublic && hasForm;
  });

  if (publicPagesWithForms.length > 0) {
    const hasRateLimitAssumption = assumptionText.includes('rate limit') ||
      assumptionText.includes('rate-limit') || assumptionText.includes('throttle');
    checks.push({
      id: 'playbook-public-rate-limiting',
      category: 'security',
      label: 'Public Pages: Rate Limiting Assumption',
      status: hasRateLimitAssumption ? 'pass' : 'warn',
      message: hasRateLimitAssumption
        ? `${publicPagesWithForms.length} public page(s) accept user data and rate limiting is referenced in assumptions.`
        : `${publicPagesWithForms.length} public page(s) accept user-submitted data but no rate limiting assumption found. Add an assumption about rate limiting on unauthenticated endpoints.`,
      severity: 'warning',
      field: hasRateLimitAssumption ? undefined : 'assumptions',
    });
  }

  return checks;
}

function checkRepoPlaybook(data) {
  const checks = [];
  const sec = data.security || {};
  const integrations = data.integrations || [];
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  // securityMdIncluded → BLOCKING failure if false (Rule 13)
  if (sec.securityMdIncluded === true) {
    checks.push({
      id: 'playbook-security-md',
      category: 'security',
      label: 'Security Playbook: SECURITY.md',
      status: 'pass',
      message: 'security.securityMdIncluded is true. SECURITY.md file will be scaffolded.',
      severity: 'error',
    });
  } else {
    checks.push({
      id: 'playbook-security-md',
      category: 'security',
      label: 'Security Playbook: SECURITY.md',
      status: 'fail',
      message: 'security.securityMdIncluded is not true. SECURITY.md is mandatory for every production repository (Rule 13). This is a blocking failure.',
      severity: 'error',
      field: 'security.securityMdIncluded',
    });
  }

  // payment or auth integration → secretScanningEnabled must be true (BLOCKING)
  const hasSensitiveIntegration = integrations.some(i => i.type === 'payment' || i.type === 'auth');
  if (hasSensitiveIntegration) {
    if (sec.secretScanningEnabled === true) {
      checks.push({
        id: 'playbook-secret-scanning-sensitive',
        category: 'security',
        label: 'Security Playbook: Secret Scanning for Payment/Auth',
        status: 'pass',
        message: 'Payment/auth integration found and secret scanning is enabled.',
        severity: 'error',
      });
    } else {
      checks.push({
        id: 'playbook-secret-scanning-sensitive',
        category: 'security',
        label: 'Security Playbook: Secret Scanning for Payment/Auth',
        status: 'fail',
        message: 'integrations[] contains a payment or auth type but security.secretScanningEnabled is not true. Secret scanning is mandatory when handling payments or auth secrets (Rule 13).',
        severity: 'error',
        field: 'security.secretScanningEnabled',
      });
    }
  }

  // admin route → IpBlockerService/SecurityAlertService assumption → warning
  const services = data.backend?.services || [];
  const hasAdminRoute = services.some(s => (s.path || '').toLowerCase().includes('admin')) ||
    assumptions.includes('admin');

  if (hasAdminRoute) {
    const hasSecurityService = assumptions.includes('ipblockerservice') ||
      assumptions.includes('securityalertservice') ||
      assumptions.includes('ip block') ||
      assumptions.includes('anomaly');

    checks.push({
      id: 'playbook-admin-security-service',
      category: 'security',
      label: 'Security Playbook: Admin Security Service',
      status: hasSecurityService ? 'pass' : 'warn',
      message: hasSecurityService
        ? 'Admin routes detected and IpBlockerService/SecurityAlertService is referenced in assumptions.'
        : 'Admin routes detected but assumptions do not reference IpBlockerService or SecurityAlertService. Admin endpoints should have IP-level anomaly detection.',
      severity: 'warning',
      field: hasSecurityService ? undefined : 'assumptions',
    });
  }

  return checks;
}
