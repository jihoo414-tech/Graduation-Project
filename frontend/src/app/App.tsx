import { AuthenticatedLayout } from './layout/AuthenticatedLayout';
import { AuthPage } from '../features/auth/pages/AuthPage';
import { AuthLoadingPage } from '../features/auth/components/AuthLoadingPage';
import { AuthSetupPage } from '../features/auth/components/AuthSetupPage';
import { useAuthSession } from '../features/auth/hooks/useAuthSession';
import { isSupabaseConfigured } from '../features/auth/api/supabase';
import { useAnalysisWorkflow } from '../features/analysis/hooks/useAnalysisWorkflow';
import { AnalysisInputPage } from '../features/analysis/pages/AnalysisInputPage';
import { AnalysisListPage } from '../features/analysis/pages/AnalysisListPage';
import { AnalyzingPage } from '../features/analysis/pages/AnalyzingPage';
import { ResultPage } from '../features/analysis/pages/ResultPage';

export default function App() {
  const { session, authLoading, signOut } = useAuthSession();
  const workflow = useAnalysisWorkflow(session?.access_token);
  const { phase, result, resultBackTarget, resetAnalysis, showDashboard, openSavedResult } = workflow;

  const handleSignOut = async () => {
    await signOut();
    resetAnalysis();
  };

  if (!isSupabaseConfigured) return <AuthSetupPage />;
  if (authLoading) return <AuthLoadingPage />;
  if (!session) return <AuthPage />;
  if (phase === 'analyzing') return <AnalyzingPage />;

  const showingResult = phase === 'result' && result !== null;
  const active = phase === 'dashboard' || (showingResult && resultBackTarget === 'dashboard')
    ? 'dashboard' : 'analysis';

  return (
    <AuthenticatedLayout
      active={active}
      userEmail={session.user.email}
      onDashboard={showDashboard}
      onStartAnalysis={resetAnalysis}
      onSignOut={handleSignOut}
    >
      {showingResult ? (
        <ResultPage
          result={result}
          onBackToCases={resultBackTarget === 'dashboard' ? showDashboard : resetAnalysis}
          backButtonLabel={resultBackTarget === 'dashboard' ? '대시보드로' : '새 분석'}
        />
      ) : phase === 'dashboard' ? (
        <AnalysisListPage
          accessToken={session.access_token}
          onOpenResult={openSavedResult}
          onStartAnalysis={resetAnalysis}
        />
      ) : (
        <AnalysisInputPage {...workflow.inputProps} onDashboard={showDashboard} />
      )}
    </AuthenticatedLayout>
  );
}
