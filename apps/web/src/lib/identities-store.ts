import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedIdentity {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastActive: string;
  encryptedSession?: string | null;
}

interface IdentitiesState {
  identities: SavedIdentity[];
  addIdentity: (identity: Omit<SavedIdentity, 'lastActive' | 'encryptedSession'>) => boolean;
  setEncryptedSession: (id: string, encrypted: string | null) => void;
  removeIdentity: (id: string) => void;
  clearIdentities: () => void;
  updateLastActive: (id: string) => void;
  updateIdentity: (id: string, updates: Partial<SavedIdentity>) => void;
  validateIdentities: (validIds: string[]) => void;
}

export const useIdentitiesStore = create<IdentitiesState>()(
  persist(
    (set, get) => ({
      identities: [],
      
      addIdentity: (identity) => {
        const state = get();
        const existingIndex = state.identities.findIndex(i => i.id === identity.id);
        
        // If it's a new identity and we're at the limit of 3
        if (existingIndex === -1 && state.identities.length >= 3) {
          return false;
        }

        const newIdentity = { 
          ...identity, 
          lastActive: new Date().toISOString(),
          encryptedSession: existingIndex > -1 ? state.identities[existingIndex].encryptedSession : null
        };
        
        set((state) => {
            if (existingIndex > -1) {
                const updated = [...state.identities];
                updated[existingIndex] = newIdentity;
                return { identities: updated };
            }
            return { identities: [newIdentity, ...state.identities] };
        });
        
        return true;
      },

      setEncryptedSession: (id, encrypted) => set((state) => ({
        identities: state.identities.map(i => 
          i.id === id ? { ...i, encryptedSession: encrypted } : i
        )
      })),

      updateIdentity: (id, updates) => set((state) => ({
        identities: state.identities.map(i => 
          i.id === id ? { ...i, ...updates } : i
        )
      })),
      
      removeIdentity: (id) => set((state) => ({
        identities: state.identities.filter(i => i.id !== id)
      })),
      
      clearIdentities: () => set({ identities: [] }),
      
      updateLastActive: (id) => set((state) => ({
        identities: state.identities.map(i => 
          i.id === id ? { ...i, lastActive: new Date().toISOString() } : i
        )
      })),

      validateIdentities: (validIds) => set((state) => ({
        identities: state.identities.filter(i => validIds.includes(i.id))
      })),
    }),
    {
      name: 'verlyn-identities-v2', // Increment version for schema change
    }
  )
);
