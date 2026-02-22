/**
 * Receipt storage for StellarSplit.
 * Supports multiple backends (priority order):
 * 1. Pinata (VITE_PINATA_JWT)
 * 2. Infura IPFS (VITE_INFURA_IPFS_PROJECT_ID + VITE_INFURA_IPFS_PROJECT_SECRET)
 * 3. Custom endpoint (VITE_IPFS_UPLOAD_URL + optional VITE_IPFS_UPLOAD_AUTH_HEADER)
 * 4. Fallback: Base64 data URL (no external service)
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;
const INFURA_PROJECT_ID = import.meta.env.VITE_INFURA_IPFS_PROJECT_ID as string | undefined;
const INFURA_PROJECT_SECRET = import.meta.env.VITE_INFURA_IPFS_PROJECT_SECRET as string | undefined;
const CUSTOM_UPLOAD_URL = import.meta.env.VITE_IPFS_UPLOAD_URL as string | undefined;
const CUSTOM_AUTH_HEADER = import.meta.env.VITE_IPFS_UPLOAD_AUTH_HEADER as string | undefined;
const IPFS_GATEWAY = (import.meta.env.VITE_IPFS_GATEWAY as string) || 'https://ipfs.io/ipfs/';

async function uploadToPinata(file: File): Promise<string> {
  if (!PINATA_JWT) throw new Error('VITE_PINATA_JWT is not set');

  const form = new FormData();
  form.append('file', file);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { IpfsHash?: string };
  const hash = data.IpfsHash;
  if (!hash) throw new Error('Pinata did not return IpfsHash');

  const base = IPFS_GATEWAY.replace(/\/$/, '');
  return `${base}/${hash}`;
}

async function uploadToInfura(file: File): Promise<string> {
  if (!INFURA_PROJECT_ID || !INFURA_PROJECT_SECRET) {
    throw new Error('VITE_INFURA_IPFS_PROJECT_ID and VITE_INFURA_IPFS_PROJECT_SECRET are required');
  }

  const form = new FormData();
  form.append('file', file);

  const auth = btoa(`${INFURA_PROJECT_ID}:${INFURA_PROJECT_SECRET}`);

  const res = await fetch('https://ipfs.infura.io:5001/api/v0/add?pin=true', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Infura IPFS upload failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as { Hash?: string };
  const hash = data.Hash;
  if (!hash) throw new Error('Infura did not return Hash');

  const base = IPFS_GATEWAY.replace(/\/$/, '');
  return `${base}/${hash}`;
}

async function uploadToCustom(file: File): Promise<string> {
  if (!CUSTOM_UPLOAD_URL) throw new Error('VITE_IPFS_UPLOAD_URL is not set');

  const form = new FormData();
  form.append('file', file);

  const headers: Record<string, string> = {};
  if (CUSTOM_AUTH_HEADER) headers['Authorization'] = CUSTOM_AUTH_HEADER;

  const res = await fetch(CUSTOM_UPLOAD_URL, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Custom IPFS upload failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as Record<string, unknown>;
  const hash =
    (data.Hash as string) ??
    (data.IpfsHash as string) ??
    (data.cid as string) ??
    (data.Cid as string);
  if (!hash || typeof hash !== 'string') {
    throw new Error('Custom endpoint did not return Hash, IpfsHash, or cid');
  }

  const base = IPFS_GATEWAY.replace(/\/$/, '');
  return `${base}/${hash}`;
}

async function uploadAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getUploadProvider(): 'pinata' | 'infura' | 'custom' | null {
  if (PINATA_JWT) return 'pinata';
  if (INFURA_PROJECT_ID && INFURA_PROJECT_SECRET) return 'infura';
  if (CUSTOM_UPLOAD_URL) return 'custom';
  return null;
}

export async function uploadReceipt(file: File): Promise<string> {
  const provider = getUploadProvider();

  if (provider === 'pinata') {
    try {
      return await uploadToPinata(file);
    } catch (err) {
      console.warn('Pinata upload failed, falling back to data URL:', err);
      return uploadAsDataUrl(file);
    }
  }

  if (provider === 'infura') {
    try {
      return await uploadToInfura(file);
    } catch (err) {
      console.warn('Infura IPFS upload failed, falling back to data URL:', err);
      return uploadAsDataUrl(file);
    }
  }

  if (provider === 'custom') {
    try {
      return await uploadToCustom(file);
    } catch (err) {
      console.warn('Custom IPFS upload failed, falling back to data URL:', err);
      return uploadAsDataUrl(file);
    }
  }

  await new Promise((r) => setTimeout(r, 300));
  return uploadAsDataUrl(file);
}

export function isValidReceipt(url: string): boolean {
  return (
    url.startsWith('data:image/') ||
    url.startsWith('http') ||
    url.startsWith('ipfs://')
  );
}
