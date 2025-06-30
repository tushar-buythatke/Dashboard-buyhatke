// Pure TypeScript encryption utility using Web Crypto API
// Ensures Vercel build compatibility with ES modules

const AES_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const AES_IV_HEX = 'abcdef9876543210abcdef9876543210';

// Convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
}

// Convert Uint8Array to hex string
function uint8ArrayToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Web Crypto API encryption
async function webCryptoEncrypt(text: string): Promise<string> {
    const keyData = hexToUint8Array(AES_KEY_HEX);
    const ivData = hexToUint8Array(AES_IV_HEX);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-CBC' },
        false,
        ['encrypt']
    );

    const textData = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: ivData },
        key,
        textData
    );

    const ivHex = uint8ArrayToHex(ivData);
    const encryptedHex = uint8ArrayToHex(new Uint8Array(encrypted));
    
    return `${ivHex}:${encryptedHex}`;
}

// Web Crypto API decryption
async function webCryptoDecrypt(encryptedText: string): Promise<string | null> {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 2) return null;

        const [ivHex, encryptedHex] = parts;
        
        const keyData = hexToUint8Array(AES_KEY_HEX);
        const ivData = hexToUint8Array(ivHex);
        const encryptedData = hexToUint8Array(encryptedHex);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv: ivData },
            key,
            encryptedData
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Web Crypto decryption failed:', error);
        return null;
    }
}

// Simple Base64 fallback for environments without crypto.subtle
function simpleEncode(text: string): string {
    return `simple:${btoa(unescape(encodeURIComponent(text)))}`;
}

function simpleDecode(encodedText: string): string | null {
    try {
        if (encodedText.startsWith('simple:')) {
            const base64 = encodedText.replace('simple:', '');
            return decodeURIComponent(escape(atob(base64)));
        }
        return null;
    } catch {
        return null;
    }
}

// Main encryption function
export async function encryptAES(text: string): Promise<string> {
    if (!text || typeof text !== 'string') {
        throw new Error('Input must be a non-empty string');
    }

    try {
        // Use Web Crypto API if available (browser/Node.js 16+)
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            return await webCryptoEncrypt(text);
        }
    } catch (error) {
        console.warn('Web Crypto encryption failed, falling back to simple encoding:', error);
    }

    // Fallback to simple Base64 encoding
    return simpleEncode(text);
}

// Main decryption function
export async function decryptAES(encryptedText: string): Promise<string | null> {
    if (!encryptedText || typeof encryptedText !== 'string') {
        return null;
    }

    try {
        // Handle simple encoding
        if (encryptedText.startsWith('simple:')) {
            return simpleDecode(encryptedText);
        }

        // Handle Web Crypto format (hex with IV)
        if (encryptedText.includes(':') && typeof crypto !== 'undefined' && crypto.subtle) {
            return await webCryptoDecrypt(encryptedText);
        }

        return null;
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
}

// Synchronous versions for backward compatibility (use simple encoding only)
export function encryptAESSync(text: string): string {
    if (!text || typeof text !== 'string') {
        throw new Error('Input must be a non-empty string');
    }
    return simpleEncode(text);
}

export function decryptAESSync(encryptedText: string): string | null {
    if (!encryptedText || typeof encryptedText !== 'string') {
        return null;
    }
    return simpleDecode(encryptedText);
} 