'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClientProfile, ClientPortalUser, ClientPortalSession } from '@/types';
import { repository } from '@/lib/db/repository';
import { authenticateClientUser } from '@/lib/engines/clientPortalEngine';

interface ClientPortalAuthContextType {
  session: ClientPortalSession | null;
  currentClient: ClientProfile | null;
  portalUser: ClientPortalUser | null;
  currentUser: ClientPortalUser | null; // Compatibility alias
  isAuthenticated: boolean;
  isLoading: boolean;
  allClients: ClientProfile[];
  login: (email: string, passwordOrToken?: string) => Promise<boolean>;
  logout: () => void;
  switchClientSimulation: (clientId: string) => Promise<void>;
}

const ClientPortalAuthContext = createContext<ClientPortalAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'watech_portal_session_v1';

export function ClientPortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ClientPortalSession | null>(null);
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session and clients
  useEffect(() => {
    async function initAuth() {
      try {
        setIsLoading(true);
        const clients = await repository.getClients();
        setAllClients(clients);

        // Check stored session
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored) {
          try {
            const parsedSession: ClientPortalSession = JSON.parse(stored);
            // Verify client still exists in db
            const verifiedClient = clients.find((c) => c.id === parsedSession.client.id);
            if (verifiedClient) {
              setSession({
                ...parsedSession,
                client: verifiedClient,
              });
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing stored portal session:', e);
          }
        }

        // Default to first client (Apex Mechanical) for seamless demo evaluation
        if (clients.length > 0) {
          const defaultClient = clients[0];
          const users = await repository.getClientPortalUsers(defaultClient.id);
          const defaultUser: ClientPortalUser = users[0] || {
            id: `usr-${defaultClient.id}`,
            clientId: defaultClient.id,
            email: defaultClient.email || 'marcus.vance@apexmechanicaltx.com',
            fullName: defaultClient.primaryContact?.name || 'Marcus Vance',
            role: 'owner',
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          const defaultSession: ClientPortalSession = {
            portalUser: defaultUser,
            client: defaultClient,
            token: `demo_token_${Date.now()}`,
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          };

          setSession(defaultSession);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSession));
          }
        }
      } catch (err) {
        console.error('Error initializing portal auth:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email: string, passwordOrToken?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const authSession = await authenticateClientUser(email, passwordOrToken);
      if (authSession) {
        setSession(authSession);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(authSession));
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Portal login error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const switchClientSimulation = async (clientId: string) => {
    try {
      setIsLoading(true);
      const client = allClients.find((c) => c.id === clientId);
      if (!client) return;

      const users = await repository.getClientPortalUsers(clientId);
      const user: ClientPortalUser = users[0] || {
        id: `usr-${client.id}`,
        clientId: client.id,
        email: client.email || `admin@${client.website || 'client.com'}`,
        fullName: client.primaryContact?.name || `${client.companyName} Executive`,
        role: 'owner',
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      const newSession: ClientPortalSession = {
        portalUser: user,
        client,
        token: `sim_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };

      setSession(newSession);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      }
    } catch (err) {
      console.error('Error switching client simulation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ClientPortalAuthContext.Provider
      value={{
        session,
        currentClient: session?.client || null,
        portalUser: session?.portalUser || null,
        currentUser: session?.portalUser || null,
        isAuthenticated: !!session,
        isLoading,
        allClients,
        login,
        logout,
        switchClientSimulation,
      }}
    >
      {children}
    </ClientPortalAuthContext.Provider>
  );
}

export function useClientPortalAuth() {
  const context = useContext(ClientPortalAuthContext);
  if (!context) {
    throw new Error('useClientPortalAuth must be used within a ClientPortalAuthProvider');
  }
  return context;
}
