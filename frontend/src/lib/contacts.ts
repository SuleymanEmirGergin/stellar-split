/**
 * Simple Address Book for mapping Stellar addresses to Nicknames.
 * Persistent in localStorage.
 */

class AddressBook {
  private key = 'stellarsplit_contacts';

  getAll(): Record<string, string> {
    const saved = localStorage.getItem(this.key);
    return saved ? JSON.parse(saved) : {};
  }

  getName(address: string): string | null {
    const contacts = this.getAll();
    return contacts[address] || null;
  }

  save(address: string, name: string) {
    const contacts = this.getAll();
    contacts[address] = name;
    localStorage.setItem(this.key, JSON.stringify(contacts));
    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('stellarsplit:contacts-updated'));
  }

  delete(address: string) {
    const contacts = this.getAll();
    delete contacts[address];
    localStorage.setItem(this.key, JSON.stringify(contacts));
    window.dispatchEvent(new CustomEvent('stellarsplit:contacts-updated'));
  }
}

export const addressBook = new AddressBook();
