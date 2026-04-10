/**
 * Category 7 — Observability Baseline (Rule 15)
 *
 * For frontend-backend-handoff.json:
 *   - pages[] count ≥ 3 or actions[] count ≥ 2 → assumptions must reference structured logging or health checks
 *
 * For repo-handoff.json:
 *   - API service present → observability.healthEndpointsPlanned should be true → warning
 *   - healthEndpointsPlanned true → both healthLive and healthReady must be defined → warning
 *   - backend.services[] count ≥ 2 → observability.distributedTracing should be true → warning
 *   - deploymentTarget set → observability.structuredLogging should be true → warning (info)
 */

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory7(type, data) {
  if (type === 'frontend-backend') return checkFrontendBackendObservability(data);
  if (type === 'repo') return checkRepoObservability(data);
  return [];
}

function checkFrontendBackendObservability(data) {
  const checks = [];
  const pages = data.pages || [];
  const actions = data.actions || [];
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  const isNonTrivial = pages.length >= 3 || actions.length >= 2;

  if (isNonTrivial) {
    const hasObservabilityAssumption = assumptions.includes('log') ||
      assumptions.includes('health') || assumptions.includes('observ') ||
      assumptions.includes('monitor') || assumptions.includes('tracing');

    checks.push({
      id: 'observability-logging-assumption',
      category: 'completeness',
      label: 'Observability: Logging / Health Assumption',
      status: hasObservabilityAssumption ? 'pass' : 'warn',
      message: hasObservabilityAssumption
        ? `Non-trivial system (${pages.length} pages, ${actions.length} actions) and observability assumption is declared.`
        : `Non-trivial system (${pages.length} pages, ${actions.length} actions) but no structured logging or health check assumption found in assumptions[].`,
      severity: 'warning',
      field: hasObservabilityAssumption ? undefined : 'assumptions',
    });
  }

  return checks;
}

function checkRepoObservability(data) {
  const checks = [];
  const obs = data.observability || {};
  const services = data.backend?.services || [];
  const apiServices = services.filter(s => s.type === 'api');
  const deploymentTarget = data.project?.deploymentTarget;

  // API service → healthEndpointsPlanned
  if (apiServices.length > 0) {
    if (obs.healthEndpointsPlanned === true) {
      checks.push({
        id: 'observability-health-endpoints-planned',
        category: 'completeness',
        label: 'Observability: Health Endpoints Planned',
        status: 'pass',
        message: `API service(s) detected and observability.healthEndpointsPlanned is true.`,
        severity: 'warning',
      });

      // Both healthLive and healthReady must be defined
      const hasLive = !!obs.healthLive;
      const hasReady = !!obs.healthReady;

      if (hasLive && hasReady) {
        checks.push({
          id: 'observability-health-routes',
          category: 'completeness',
          label: 'Observability: Health Routes Defined',
          status: 'pass',
          message: `Health routes defined: live="${obs.healthLive}", ready="${obs.healthReady}".`,
          severity: 'warning',
        });
      } else {
        checks.push({
          id: 'observability-health-routes',
          category: 'completeness',
          label: 'Observability: Health Routes Defined',
          status: 'warn',
          message: `healthEndpointsPlanned is true but ${!hasLive ? 'healthLive' : ''}${!hasLive && !hasReady ? ' and ' : ''}${!hasReady ? 'healthReady' : ''} is not defined. Both routes are required for deployment health probes.`,
          severity: 'warning',
          field: !hasLive ? 'observability.healthLive' : 'observability.healthReady',
        });
      }
    } else {
      checks.push({
        id: 'observability-health-endpoints-planned',
        category: 'completeness',
        label: 'Observability: Health Endpoints Planned',
        status: 'warn',
        message: `API service(s) detected but observability.healthEndpointsPlanned is not true. All API services must expose /health/live and /health/ready endpoints.`,
        severity: 'warning',
        field: 'observability.healthEndpointsPlanned',
      });
    }
  }

  // 2+ services → distributedTracing
  if (services.length >= 2) {
    if (obs.distributedTracing === true) {
      checks.push({
        id: 'observability-distributed-tracing',
        category: 'completeness',
        label: 'Observability: Distributed Tracing',
        status: 'pass',
        message: `${services.length} services detected and observability.distributedTracing is true (OpenTelemetry).`,
        severity: 'warning',
      });
    } else {
      const deferralNote = obs.distributedTracingNote
        ? ` Deferral rationale: "${obs.distributedTracingNote}".`
        : '';
      checks.push({
        id: 'observability-distributed-tracing',
        category: 'completeness',
        label: 'Observability: Distributed Tracing',
        status: 'warn',
        message: `${services.length} services detected but observability.distributedTracing is not true. Add OTel SDK with OTLPTraceExporter across all services.${deferralNote}`,
        severity: 'warning',
        field: 'observability.distributedTracing',
      });
    }
  }

  // structuredLogging → info/warning
  if (deploymentTarget && deploymentTarget !== 'unknown') {
    if (obs.structuredLogging === true) {
      checks.push({
        id: 'observability-structured-logging',
        category: 'completeness',
        label: 'Observability: Structured Logging',
        status: 'pass',
        message: `Deployment target "${deploymentTarget}" set and observability.structuredLogging is true (${obs.loggingLibrary || 'library not specified'}).`,
        severity: 'info',
      });
    } else {
      checks.push({
        id: 'observability-structured-logging',
        category: 'completeness',
        label: 'Observability: Structured Logging',
        status: 'warn',
        message: `Deployment target "${deploymentTarget}" is set but observability.structuredLogging is not true. Production deployments require structured JSON logging (Pino, structlog, winston).`,
        severity: 'info',
        field: 'observability.structuredLogging',
      });
    }
  }

  return checks;
}
