import {
  saveGuardians,
  loadAllGuardians,
  getGuardiansForUser,
  initiateRecovery,
  loadRecoveryRequest,
  approveRecovery,
} from './recovery';

beforeEach(() => {
  localStorage.clear();
});

describe('saveGuardians / loadAllGuardians', () => {
  it('saves and loads guardian config', () => {
    saveGuardians(1, 'GABC', ['G1', 'G2', 'G3']);
    const all = loadAllGuardians(1);
    expect(all['GABC']).toEqual({
      userAddress: 'GABC',
      guardians: ['G1', 'G2', 'G3'],
      threshold: 2, // ceil(3/2)
    });
  });

  it('returns empty object when no guardians saved', () => {
    expect(loadAllGuardians(99)).toEqual({});
  });

  it('threshold is ceil(guardians.length / 2)', () => {
    saveGuardians(1, 'G', ['A', 'B', 'C']);
    expect(loadAllGuardians(1)['G'].threshold).toBe(2);
  });

  it('threshold is 1 for single guardian', () => {
    saveGuardians(1, 'G', ['A']);
    expect(loadAllGuardians(1)['G'].threshold).toBe(1);
  });

  it('threshold is 1 for two guardians (ceil(2/2)=1)', () => {
    saveGuardians(1, 'G', ['A', 'B']);
    expect(loadAllGuardians(1)['G'].threshold).toBe(1);
  });

  it('saves multiple users in the same group', () => {
    saveGuardians(1, 'GA', ['G1']);
    saveGuardians(1, 'GB', ['G2']);
    const all = loadAllGuardians(1);
    expect(Object.keys(all)).toContain('GA');
    expect(Object.keys(all)).toContain('GB');
  });

  it('isolates data between groups', () => {
    saveGuardians(1, 'GA', ['G1']);
    saveGuardians(2, 'GB', ['G2']);
    expect(loadAllGuardians(1)['GB']).toBeUndefined();
    expect(loadAllGuardians(2)['GA']).toBeUndefined();
  });
});

describe('getGuardiansForUser', () => {
  it('returns guardians for existing user', () => {
    saveGuardians(1, 'GABC', ['G1', 'G2']);
    expect(getGuardiansForUser(1, 'GABC')).toEqual(['G1', 'G2']);
  });

  it('returns empty array for unknown user', () => {
    expect(getGuardiansForUser(1, 'GXXX')).toEqual([]);
  });

  it('returns empty array when group has no guardians', () => {
    expect(getGuardiansForUser(99, 'GA')).toEqual([]);
  });
});

describe('initiateRecovery', () => {
  it('creates a pending recovery request', () => {
    const req = initiateRecovery(1, 'GOLD', 'GNEW');
    expect(req.status).toBe('pending');
    expect(req.targetAddress).toBe('GOLD');
    expect(req.newAddress).toBe('GNEW');
    expect(req.approvals).toEqual([]);
  });

  it('persists the request in localStorage', () => {
    initiateRecovery(1, 'GOLD', 'GNEW');
    const loaded = loadRecoveryRequest(1);
    expect(loaded?.targetAddress).toBe('GOLD');
    expect(loaded?.newAddress).toBe('GNEW');
  });
});

describe('loadRecoveryRequest', () => {
  it('returns null when no request exists', () => {
    expect(loadRecoveryRequest(99)).toBeNull();
  });
});

describe('approveRecovery', () => {
  beforeEach(() => {
    // 2 guardians → threshold = ceil(2/2) = 1
    saveGuardians(1, 'GOLD', ['G1', 'G2']);
    initiateRecovery(1, 'GOLD', 'GNEW');
  });

  it('adds an approval from a guardian', () => {
    const req = approveRecovery(1, 'GOLD', 'G1');
    expect(req?.approvals).toContain('G1');
  });

  it('completes when threshold is reached (1 of 2 guardians)', () => {
    const req = approveRecovery(1, 'GOLD', 'G1');
    expect(req?.status).toBe('completed');
  });

  it('does not add duplicate approvals', () => {
    // Use a 3-guardian group (threshold=2) so first approval keeps status 'pending'
    saveGuardians(5, 'GOLD', ['G1', 'G2', 'G3']);
    initiateRecovery(5, 'GOLD', 'GNEW');
    approveRecovery(5, 'GOLD', 'G1');
    const req = approveRecovery(5, 'GOLD', 'G1'); // duplicate G1
    expect(req?.approvals.length).toBe(1); // still 1, not 2
  });

  it('stays pending when threshold not reached (3-guardian, need 2)', () => {
    saveGuardians(2, 'GOLD', ['G1', 'G2', 'G3']); // threshold = 2
    initiateRecovery(2, 'GOLD', 'GNEW');
    const req = approveRecovery(2, 'GOLD', 'G1');
    expect(req?.status).toBe('pending');
    const req2 = approveRecovery(2, 'GOLD', 'G2');
    expect(req2?.status).toBe('completed');
  });

  it('returns null for wrong target address', () => {
    expect(approveRecovery(1, 'GWRONG', 'G1')).toBeNull();
  });

  it('returns null when no request exists for group', () => {
    expect(approveRecovery(99, 'GOLD', 'G1')).toBeNull();
  });

  it('persists the updated approval state', () => {
    approveRecovery(1, 'GOLD', 'G1');
    const loaded = loadRecoveryRequest(1);
    expect(loaded?.approvals).toContain('G1');
    expect(loaded?.status).toBe('completed');
  });
});
