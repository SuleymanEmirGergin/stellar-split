/**
 * Category 6 — Data Classification (Rule 14)
 *
 * For frontend-backend-handoff.json:
 *   - PII fields (email, phone, address, dateOfBirth, nationalId, ssn, diagnosis, medication, cardNumber)
 *     → at least one assumption must state data classification tier (Confidential/Restricted)
 *   - Health/medical fields → assumptions must reference PHI handling and HIPAA → warning
 *
 * For repo-handoff.json:
 *   - Entity names containing Medical, Health, Patient, Prescription, PHI
 *     → compliance assumption must be present → BLOCKING failure
 *   - compliance.hipaaCompliant, phiEntitiesEncrypted, phiAuditLogging must all be true → BLOCKING
 *   - Financial PII (CreditCard, CardNumber) → PCI-DSS assumption → warning
 *   - PHI entity names detected but compliance.scope not set → BLOCKING
 */

const PHI_FIELD_NAMES = ['diagnosis', 'medication', 'prescription', 'medicalrecord', 'healthrecord', 'patientrecord'];
const PHI_ENTITY_KEYWORDS = ['medical', 'health', 'patient', 'prescription', 'phi', 'diagnosis', 'healthrecord'];
const PCI_ENTITY_KEYWORDS = ['creditcard', 'paymentcard', 'cardnumber'];

/**
 * @param {'frontend-backend'|'repo'} type
 * @param {object} data
 * @returns {object[]} checks
 */
export function runCategory6(type, data) {
  if (type === 'frontend-backend') return checkFrontendBackendDataClass(data);
  if (type === 'repo') return checkRepoDataClass(data);
  return [];
}

function checkFrontendBackendDataClass(data) {
  const checks = [];
  const allFields = (data.forms || []).flatMap(f => f.fields || []);
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  // PII field detection → data classification tier assumption
  const piiFields = allFields.filter(f => {
    const nameLc = (f.name || '').toLowerCase().replace(/[_-]/g, '');
    const typeLc = (f.type || '').toLowerCase();
    return typeLc === 'email' || typeLc === 'phone' ||
      ['ssn', 'nationalid', 'dateofbirth', 'dob', 'address', 'cardnumber'].some(p => nameLc.includes(p));
  });

  if (piiFields.length > 0) {
    const hasClassificationAssumption = assumptions.includes('confidential') ||
      assumptions.includes('restricted') || assumptions.includes('classification');

    checks.push({
      id: 'data-class-pii-tier',
      category: 'completeness',
      label: 'Data Classification: PII Tier Declared',
      status: hasClassificationAssumption ? 'pass' : 'warn',
      message: hasClassificationAssumption
        ? `${piiFields.length} PII field(s) detected and a data classification tier assumption is present.`
        : `${piiFields.length} PII field(s) detected (${piiFields.map(f => f.name).join(', ')}) but no data classification tier (Confidential/Restricted) found in assumptions[].`,
      severity: 'warning',
      field: hasClassificationAssumption ? undefined : 'assumptions',
    });
  }

  // Medical/health field detection → PHI + HIPAA assumption
  const healthFields = allFields.filter(f => {
    const nameLc = (f.name || '').toLowerCase().replace(/[_-]/g, '');
    return PHI_FIELD_NAMES.some(phi => nameLc.includes(phi));
  });

  if (healthFields.length > 0) {
    const hasHipaaAssumption = assumptions.includes('hipaa') || assumptions.includes('phi') ||
      assumptions.includes('protected health');

    checks.push({
      id: 'data-class-phi-assumption',
      category: 'completeness',
      label: 'Data Classification: PHI / HIPAA Assumption',
      status: hasHipaaAssumption ? 'pass' : 'warn',
      message: hasHipaaAssumption
        ? 'Health/medical fields detected and PHI/HIPAA compliance assumption is declared.'
        : `${healthFields.length} health/medical field(s) detected but no PHI handling or HIPAA assumption found. Declare PHI handling intent and compliance scope.`,
      severity: 'warning',
      field: hasHipaaAssumption ? undefined : 'assumptions',
    });
  }

  return checks;
}

function checkRepoDataClass(data) {
  const checks = [];
  const entities = data.backend?.entities || [];
  const entityNames = entities.map(e => (e.name || e || '').toLowerCase().replace(/[_-]/g, ''));
  const compliance = data.compliance || {};
  const assumptions = (data.assumptions || []).map(a => typeof a === "string" ? a : (a.statement || a.text || "")).join(' ').toLowerCase();

  // PHI entity detection
  const phiEntities = entityNames.filter(name =>
    PHI_ENTITY_KEYWORDS.some(kw => name.includes(kw))
  );

  if (phiEntities.length > 0 || compliance.scope === 'HIPAA') {
    // compliance.scope must be set if PHI detected
    if (!compliance.scope || compliance.scope === 'none') {
      checks.push({
        id: 'data-class-phi-scope',
        category: 'completeness',
        label: 'Data Classification: PHI Compliance Scope',
        status: 'fail',
        message: `PHI entity name(s) detected (${phiEntities.join(', ')}) but compliance.scope is not set or is "none". Declare compliance.scope: "HIPAA" explicitly.`,
        severity: 'error',
        field: 'compliance.scope',
      });
    } else {
      checks.push({
        id: 'data-class-phi-scope',
        category: 'completeness',
        label: 'Data Classification: PHI Compliance Scope',
        status: 'pass',
        message: `PHI entities detected and compliance.scope is "${compliance.scope}".`,
        severity: 'error',
      });
    }

    // hipaaCompliant must be true → BLOCKING
    if (compliance.hipaaCompliant !== true) {
      checks.push({
        id: 'data-class-hipaa-compliant',
        category: 'completeness',
        label: 'Data Classification: HIPAA Compliant',
        status: 'fail',
        message: 'PHI entities detected but compliance.hipaaCompliant is not true. All HIPAA technical safeguards must be applied.',
        severity: 'error',
        field: 'compliance.hipaaCompliant',
      });
    } else {
      checks.push({
        id: 'data-class-hipaa-compliant',
        category: 'completeness',
        label: 'Data Classification: HIPAA Compliant',
        status: 'pass',
        message: 'compliance.hipaaCompliant is true.',
        severity: 'error',
      });
    }

    // phiEntitiesEncrypted → BLOCKING
    if (compliance.phiEntitiesEncrypted !== true) {
      checks.push({
        id: 'data-class-phi-encrypted',
        category: 'completeness',
        label: 'Data Classification: PHI Entities Encrypted',
        status: 'fail',
        message: 'PHI entities detected but compliance.phiEntitiesEncrypted is not true. PHI fields must be encrypted at rest.',
        severity: 'error',
        field: 'compliance.phiEntitiesEncrypted',
      });
    } else {
      checks.push({
        id: 'data-class-phi-encrypted',
        category: 'completeness',
        label: 'Data Classification: PHI Entities Encrypted',
        status: 'pass',
        message: 'compliance.phiEntitiesEncrypted is true.',
        severity: 'error',
      });
    }

    // phiAuditLogging → BLOCKING
    if (compliance.phiAuditLogging !== true) {
      checks.push({
        id: 'data-class-phi-audit',
        category: 'completeness',
        label: 'Data Classification: PHI Audit Logging',
        status: 'fail',
        message: 'PHI entities detected but compliance.phiAuditLogging is not true. All PHI access must be audit-logged.',
        severity: 'error',
        field: 'compliance.phiAuditLogging',
      });
    } else {
      checks.push({
        id: 'data-class-phi-audit',
        category: 'completeness',
        label: 'Data Classification: PHI Audit Logging',
        status: 'pass',
        message: 'compliance.phiAuditLogging is true.',
        severity: 'error',
      });
    }
  }

  // PCI / financial PII detection → warning
  const pciEntities = entityNames.filter(name =>
    PCI_ENTITY_KEYWORDS.some(kw => name.includes(kw))
  );

  if (pciEntities.length > 0) {
    const hasPciAssumption = assumptions.includes('pci') || assumptions.includes('tokeniz') ||
      assumptions.includes('no raw card') || assumptions.includes('stripe');

    checks.push({
      id: 'data-class-pci-scope',
      category: 'completeness',
      label: 'Data Classification: PCI-DSS Scope',
      status: hasPciAssumption ? 'pass' : 'warn',
      message: hasPciAssumption
        ? `Financial PII entity/entities detected (${pciEntities.join(', ')}) and PCI scope reduction (tokenization) is referenced in assumptions.`
        : `Financial PII entity/entities detected (${pciEntities.join(', ')}) but no PCI-DSS scope reduction assumption found. Add an assumption about tokenization and no raw card storage.`,
      severity: 'warning',
      field: hasPciAssumption ? undefined : 'assumptions',
    });
  }

  return checks;
}
