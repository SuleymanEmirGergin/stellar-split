/**
 * Category 4 — Completeness Checks (Rule 7, Rule 12)
 *
 * - assumptions[] must not be empty
 * - project.name must be present and meaningful
 * - If forms[] and actions[] are both empty, raise a warning (read-only system?)
 * - For repo: if monorepo and no packages, warn
 */

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory4(type, data) {
  const checks = [];

  // Rule 7: assumptions must not be empty
  const assumptions = data.assumptions || [];
  if (assumptions.length > 0) {
    checks.push({
      id: 'completeness-assumptions-declared',
      category: 'completeness',
      label: 'Assumptions Declared',
      status: 'pass',
      message: `${assumptions.length} assumption(s) declared by the producing agent.`,
      severity: 'warning',
    });
  } else {
    checks.push({
      id: 'completeness-assumptions-declared',
      category: 'completeness',
      label: 'Assumptions Declared',
      status: 'warn',
      message: 'assumptions[] is empty. The producing agent did not document any assumptions. Missing assumptions may hide implicit decisions from downstream agents.',
      severity: 'warning',
      field: 'assumptions',
    });
  }

  // project.name meaningful check
  const projectName = data.project?.name || '';
  if (projectName.length >= 2) {
    checks.push({
      id: 'completeness-project-name',
      category: 'completeness',
      label: 'Project Name Meaningful',
      status: 'pass',
      message: `project.name is "${projectName}".`,
      severity: 'warning',
    });
  } else {
    checks.push({
      id: 'completeness-project-name',
      category: 'completeness',
      label: 'Project Name Meaningful',
      status: 'warn',
      message: 'project.name is missing or too short (< 2 chars). Provide a meaningful project identifier.',
      severity: 'warning',
      field: 'project.name',
    });
  }

  // frontend-backend specific: warn if no forms AND no actions (read-only?)
  if (type === 'frontend-backend') {
    const forms = data.forms || [];
    const actions = data.actions || [];
    if (forms.length === 0 && actions.length === 0) {
      checks.push({
        id: 'completeness-forms-or-actions',
        category: 'completeness',
        label: 'System Has Interactive Elements',
        status: 'warn',
        message: 'Both forms[] and actions[] are empty. Is this a read-only system? If so, declare an assumption confirming intent.',
        severity: 'warning',
        field: 'forms / actions',
      });
    } else {
      checks.push({
        id: 'completeness-forms-or-actions',
        category: 'completeness',
        label: 'System Has Interactive Elements',
        status: 'pass',
        message: `${forms.length} form(s) and ${actions.length} action(s) defined.`,
        severity: 'warning',
      });
    }
  }

  // repo specific: if monorepo, packages should not be empty (belt-and-suspenders — also checked in cat2)
  if (type === 'repo') {
    const services = data.backend?.services || [];
    const apiServices = services.filter(s => s.type === 'api');
    const workerServices = services.filter(s => s.type === 'worker');

    checks.push({
      id: 'completeness-services-declared',
      category: 'completeness',
      label: 'Backend Services Declared',
      status: services.length > 0 ? 'pass' : 'warn',
      message: services.length > 0
        ? `${services.length} service(s) declared: ${apiServices.length} API, ${workerServices.length} worker.`
        : 'backend.services[] is empty. At minimum one API service should be declared.',
      severity: 'warning',
      field: services.length === 0 ? 'backend.services' : undefined,
    });
  }

  return checks;
}
