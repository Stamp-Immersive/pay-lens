'use client';

import { createContext, useContext, ReactNode } from 'react';

export type Organization = {
  id: string;
  name: string;
  slug: string;
  default_employer_pension_percent: number;
};

export type UserRole = 'owner' | 'admin' | 'employee';

type OrganizationContextType = {
  organization: Organization;
  role: UserRole;
  isAdmin: boolean;
};

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export function OrganizationProvider({
  children,
  organization,
  role,
}: {
  children: ReactNode;
  organization: Organization;
  role: UserRole;
}) {
  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <OrganizationContext.Provider value={{ organization, role, isAdmin }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
