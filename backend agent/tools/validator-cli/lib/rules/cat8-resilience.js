/**
 * Category 8 — Resilience Baseline (Rule 16)
 *
 * For frontend-backend-handoff.json:
 *   - externalTriggers includes payment-webhook / email-send / custom
 *     → at least one assumption must reference timeout, retry, or circuit breaker → warning
 *
 * For repo-handoff.json:
 *   - integrations[] has payment / email / llm
 *     → meta.playbooksApplied must include resilience.md OR assumptions mention resilience → warning
 *   - integrations[] has payment AND assumptions don't mention idempotency key → warning (double-charge risk)
 */

const RESILIENCE_TRIGGER_TYPES = ['payment-webhook', 'email-send', 'custom'];
const RESILIENCE_INTEGRATION_TYPES = ['payment', 'email', 'llm'];
const RESILIENCE_KEYWORDS = [
  'retry', 'circuit breaker', 'timeout', 'backoff', 'fallback',
  'resilience', 'opossum', 'pybreaker', 'tenacity', 'p-retry',
  'bulkhead', 'jitter', 'abort controller',
];
const IDEMPOTENCY_KEYWORDS = [
  'idempotency', 'idempotent', 'idempotency key', 'duplicate charge',
  'stripe idempotency', 'exactly-once',
];

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory8(type, data) {
  if (type === 'frontend-backend') return checkFrontendBackendResilience(data);
  if (type === 'repo') return checkRepoResilience(data);
  return [];
}

// ─── frontend-backend ──────────────────────────────────────────────────────

function checkFrontendBackendResilience(data) {
  const checks = [];
  const triggers = data.externalTriggers || [];
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  // Filter relevant triggers
  const resilienceTriggers = triggers.filter(t =>
    RESILIENCE_TRIGGER_TYPES.includes(t.type)
  );

  if (resilienceTriggers.length === 0) {
    // No external triggers needing resilience — skip
    return [];
  }

  const hasResilienceAssumption = RESILIENCE_KEYWORDS.some(kw =>
    assumptions.includes(kw)
  );

  const triggerNames = resilienceTriggers.map(t => `"${t.name}" (${t.type})`).join(', ');

  checks.push({
    id: 'resilience-external-trigger-patterns',
    category: 'completeness',
    label: 'Resilience: External Trigger Patterns',
    status: hasResilienceAssumption ? 'pass' : 'warn',
    message: hasResilienceAssumption
      ? `${resilienceTriggers.length} resilience-relevant trigger(s) detected and a resilience pattern (retry/timeout/circuit breaker) is referenced in assumptions.`
      : `${resilienceTriggers.length} external trigger(s) require resilience patterns: ${triggerNames}. Add an assumption stating timeout, retry strategy, or circuit breaker for each external integration.`,
    severity: 'warning',
    field: hasResilienceAssumption ? undefined : 'assumptions',
  });

  return checks;
}

// ─── repo ──────────────────────────────────────────────────────────────────

function checkRepoResilience(data) {
  const checks = [];
  const integrations = data.integrations || [];
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();
  const playbooksApplied = (data.meta?.playbooksApplied || []).join(' ').toLowerCase();

  // Which integrations need resilience?
  const resilienceIntegrations = integrations.filter(i =>
    RESILIENCE_INTEGRATION_TYPES.includes(i.type)
  );

  if (resilienceIntegrations.length === 0) {
    return [];
  }

  // Check 1: resilience.md in playbooksApplied OR resilience keyword in assumptions
  const hasPlaybook = playbooksApplied.includes('resilience');
  const hasResilienceAssumption = RESILIENCE_KEYWORDS.some(kw =>
    assumptions.includes(kw)
  );
  const hasResilience = hasPlaybook || hasResilienceAssumption;

  const integrationNames = resilienceIntegrations.map(i => `"${i.name}" (${i.type})`).join(', ');

  checks.push({
    id: 'resilience-integration-patterns',
    category: 'completeness',
    label: 'Resilience: Integration Patterns Declared',
    status: hasResilience ? 'pass' : 'warn',
    message: hasResilience
      ? `${resilienceIntegrations.length} resilience-relevant integration(s) detected and ${hasPlaybook ? 'resilience.md is in playbooksApplied' : 'a resilience pattern is referenced in assumptions'}.`
      : `${resilienceIntegrations.length} integration(s) require resilience patterns: ${integrationNames}. Either add "resilience.md" to meta.playbooksApplied, or add assumptions referencing retry/timeout/circuit breaker for each integration.`,
    severity: 'warning',
    field: hasResilience ? undefined : 'meta.playbooksApplied / assumptions',
  });

  // Check 2: payment integration → idempotency key assumption (double-charge risk)
  const hasPayment = integrations.some(i => i.type === 'payment');
  if (hasPayment) {
    const hasIdempotency = IDEMPOTENCY_KEYWORDS.some(kw => assumptions.includes(kw));

    checks.push({
      id: 'resilience-payment-idempotency',
      category: 'completeness',
      label: 'Resilience: Payment Idempotency Key',
      status: hasIdempotency ? 'pass' : 'warn',
      message: hasIdempotency
        ? 'Payment integration detected and idempotency key is referenced in assumptions (double-charge protection).'
        : 'Payment integration detected but assumptions do not mention idempotency keys for retried payment calls. Without idempotency keys, retried requests risk double-charging customers.',
      severity: 'warning',
      field: hasIdempotency ? undefined : 'assumptions',
    });
  }

  return checks;
}
