import type { CaseDraft, DemoSession, RecentCase, ReportStage } from './demoJourney';
import type { ResultEnvelope } from './types';

type PersistedWorkspaceState = {
  session?: DemoSession;
  caseDraft?: CaseDraft;
  caseBuilderStep?: number;
  recentCases?: RecentCase[];
  result?: ResultEnvelope | null;
  reportStage?: ReportStage;
};

const STORAGE_KEY = 'graduation-project:workspace-state:v1';

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window;

const safeParse = (value: string | null): PersistedWorkspaceState | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as PersistedWorkspaceState;
  } catch {
    return null;
  }
};

export const loadPersistedWorkspaceState = (): PersistedWorkspaceState => {
  if (!canUseStorage()) {
    return {};
  }

  return safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? {};
};

export const persistWorkspaceState = (state: PersistedWorkspaceState) => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearPersistedWorkspaceState = () => {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};
