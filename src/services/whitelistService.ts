import { getApiBaseUrl } from '@/config/api';

export interface WhitelistConfig {
    multiplier: number;
    whitelistedUsers: Record<string, string>;
}

export interface WhitelistUser {
    id: number;
    username: string;
    isWhitelisted: boolean;
    canEdit: boolean;
}

const getBaseUrl = () => `${getApiBaseUrl()}/auth`;

export const whitelistService = {
    async getConfig(): Promise<WhitelistConfig> {
        const response = await fetch(`${getBaseUrl()}/whitelist/config`);
        const result = await response.json();
        if (result.status === 1 && result.data) {
            return result.data;
        }
        return { multiplier: 1, whitelistedUsers: {} };
    },

    async getAllUsers(adminUserId: number): Promise<WhitelistUser[]> {
        const response = await fetch(`${getBaseUrl()}/whitelist/allUsers?adminUserId=${adminUserId}`);
        const result = await response.json();
        if (result.status === 1 && result.data) {
            return result.data;
        }
        return [];
    },

    async addToWhitelist(adminUserId: number, userId: number, email?: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${getBaseUrl()}/whitelist/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId, userId, email }),
        });
        const result = await response.json();
        return {
            success: result.status === 1,
            message: result.message || (result.status === 1 ? 'User added to whitelist' : 'Failed to add user'),
        };
    },

    async removeFromWhitelist(adminUserId: number, userId: number): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${getBaseUrl()}/whitelist/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminUserId, userId }),
        });
        const result = await response.json();
        return {
            success: result.status === 1,
            message: result.message || (result.status === 1 ? 'User removed from whitelist' : 'Failed to remove user'),
        };
    },
};
