import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { whitelistService } from '../services/whitelistService';

interface PermissionsContextType {
    isAdmin: boolean;
    canEdit: boolean;
    isViewOnly: boolean;
    whitelistLoading: boolean;
    refreshPermissions: () => Promise<void>;
    userRole: 'admin' | 'editor' | 'viewer';
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [isWhitelisted, setIsWhitelisted] = useState(false);
    const [whitelistLoading, setWhitelistLoading] = useState(true);

    const isAdmin = !!(user && user.role === 1);

    const checkWhitelist = useCallback(async () => {
        if (!user || !isAuthenticated) {
            setIsWhitelisted(false);
            setWhitelistLoading(false);
            return;
        }

        // Admins always have full access, no need to check whitelist
        if (user.role === 1) {
            setIsWhitelisted(true);
            setWhitelistLoading(false);
            return;
        }

        try {
            setWhitelistLoading(true);
            const config = await whitelistService.getConfig();
            const whitelistedUsers = config.whitelistedUsers || {};
            const userIsWhitelisted = Object.prototype.hasOwnProperty.call(whitelistedUsers, String(user.id));
            setIsWhitelisted(userIsWhitelisted);
        } catch (err) {
            console.error('Error checking whitelist status:', err);
            setIsWhitelisted(false);
        } finally {
            setWhitelistLoading(false);
        }
    }, [user, isAuthenticated]);

    useEffect(() => {
        checkWhitelist();
    }, [checkWhitelist]);

    const canEdit = isAdmin || isWhitelisted;
    const isViewOnly = !isAdmin && !isWhitelisted;

    const userRole: 'admin' | 'editor' | 'viewer' = isAdmin ? 'admin' : isWhitelisted ? 'editor' : 'viewer';

    const value: PermissionsContextType = {
        isAdmin,
        canEdit,
        isViewOnly,
        whitelistLoading,
        refreshPermissions: checkWhitelist,
        userRole,
    };

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (context === undefined) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
