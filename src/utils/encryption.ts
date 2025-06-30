import CryptoJS from 'crypto-js';

// Match the backend configuration exactly
const AES_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 chars = 256-bit key
const AES_IV = "abcdef9876543210abcdef9876543210"; // Fixed IV to match backend

export function encryptAES(text: string): string {
    // Parse the key and IV from hex strings (to match backend Buffer.from(key, 'hex'))
    const key = CryptoJS.enc.Hex.parse(AES_ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Hex.parse(AES_IV);

    // Encrypt using AES-256-CBC (to match backend createCipheriv('aes-256-cbc'))
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Convert IV and ciphertext to hex (to match backend toString('hex'))
    const ivHex = iv.toString(CryptoJS.enc.Hex);
    const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);

    // Return in same format as backend: ivHex:encryptedHex
    return `${ivHex}:${encryptedHex}`;
}

// Helper function to decrypt (for testing purposes)
export function decryptAES(encryptedText: string): string | null {
    try {
        const [ivHex, encryptedHex] = encryptedText.split(':');
        
        const key = CryptoJS.enc.Hex.parse(AES_ENCRYPTION_KEY);
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const ciphertext = CryptoJS.enc.Hex.parse(encryptedHex);

        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: ciphertext
        });

        const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null;
    }
} 