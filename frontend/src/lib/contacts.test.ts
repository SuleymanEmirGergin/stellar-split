import { addressBook } from './contacts';

beforeEach(() => {
  localStorage.clear();
});

describe('addressBook.getAll', () => {
  it('returns empty object when nothing saved', () => {
    expect(addressBook.getAll()).toEqual({});
  });

  it('returns saved contacts', () => {
    addressBook.save('GABC', 'Alice');
    expect(addressBook.getAll()).toEqual({ GABC: 'Alice' });
  });
});

describe('addressBook.getName', () => {
  it('returns null for unknown address', () => {
    expect(addressBook.getName('GABC')).toBeNull();
  });

  it('returns name for known address', () => {
    addressBook.save('GABC', 'Bob');
    expect(addressBook.getName('GABC')).toBe('Bob');
  });
});

describe('addressBook.save', () => {
  it('persists to localStorage', () => {
    addressBook.save('GABC', 'Charlie');
    const raw = localStorage.getItem('stellarsplit_contacts');
    expect(JSON.parse(raw!)).toEqual({ GABC: 'Charlie' });
  });

  it('overwrites existing name', () => {
    addressBook.save('GABC', 'Old');
    addressBook.save('GABC', 'New');
    expect(addressBook.getName('GABC')).toBe('New');
  });

  it('saves multiple contacts', () => {
    addressBook.save('GA', 'Alice');
    addressBook.save('GB', 'Bob');
    const all = addressBook.getAll();
    expect(all['GA']).toBe('Alice');
    expect(all['GB']).toBe('Bob');
  });

  it('dispatches stellarsplit:contacts-updated event', () => {
    const listener = vi.fn();
    window.addEventListener('stellarsplit:contacts-updated', listener);
    addressBook.save('GABC', 'Dave');
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('stellarsplit:contacts-updated', listener);
  });
});

describe('addressBook.delete', () => {
  it('removes a contact', () => {
    addressBook.save('GABC', 'Alice');
    addressBook.delete('GABC');
    expect(addressBook.getName('GABC')).toBeNull();
  });

  it('does nothing for non-existent address', () => {
    expect(() => addressBook.delete('GXXX')).not.toThrow();
  });

  it('dispatches stellarsplit:contacts-updated event', () => {
    const listener = vi.fn();
    addressBook.save('GABC', 'Alice');
    window.addEventListener('stellarsplit:contacts-updated', listener);
    addressBook.delete('GABC');
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('stellarsplit:contacts-updated', listener);
  });
});
