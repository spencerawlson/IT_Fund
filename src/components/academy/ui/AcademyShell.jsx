import React from 'react';
import { PageContainer } from '@/components/ui-glass';

/**
 * Content column for the Academy pages. Navigation now comes from the app-wide AppShell;
 * this stays as a thin wrapper until the pages move to PageContainer directly (Phase 4).
 */
export default function AcademyShell({ children }) {
  return <PageContainer>{children}</PageContainer>;
}
