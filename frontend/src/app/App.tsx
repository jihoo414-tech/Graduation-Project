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
import { StaffDashboardPage } from '../features/analysis/pages/StaffDashboardPage';
import { isStaffRole } from '../shared/types/auth';

export default function App() {
  const { session, currentUser, authLoading, authError, signOut } = useAuthSession();
  const workflow = useAnalysisWorkflow(session?.access_token);
  const {
    phase,
    result,
    resultBackTarget,
    resetAnalysis,
    startAnalysis,
    showDashboard,
    openSavedResult,
  } = workflow;

  const handleSignOut = async () => {
    await signOut();
    resetAnalysis();
  };

  if (!isSupabaseConfigured) return <AuthSetupPage />;
  if (authLoading) return <AuthLoadingPage />;
  if (!session || !currentUser) {
    return <AuthPage initialMessage={authError} />;
  }
  if (phase === 'analyzing') return <AnalyzingPage />;

  const showingResult = phase === 'result' && result !== null;
  const staffWorkspace = isStaffRole(currentUser.role);
  const active = phase === 'dashboard' || (showingResult && resultBackTarget === 'dashboard')
    ? 'dashboard' : 'analysis';

  if (staffWorkspace) {
    return (
      <AuthenticatedLayout
        active={active}
        userEmail={currentUser.email ?? session.user.email}
        userName={currentUser.fullName}
        roleLabel={currentUser.role === 'admin' ? '관리자' : '의사'}
        showAnalysis
        onDashboard={showDashboard}
        onStartAnalysis={() => startAnalysis()}
        onSignOut={handleSignOut}
      >
        {showingResult ? (
          <ResultPage
            result={result}
            onBackToCases={showDashboard}
            backButtonLabel="대시보드로"
          />
        ) : phase === 'input' ? (
          <AnalysisInputPage {...workflow.inputProps} onDashboard={showDashboard} />
        ) : (
          <StaffDashboardPage
            accessToken={session.access_token}
            currentUserId={currentUser.id}
            viewerRole={currentUser.role as 'doctor' | 'admin'}
            onOpenResult={openSavedResult}
            onStartAnalysis={startAnalysis}
          />
        )}
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      active="dashboard"
      userEmail={session.user.email}
      userName={currentUser.fullName}
      roleLabel="환자"
      onDashboard={showDashboard}
      showAnalysis={false}
      onStartAnalysis={showDashboard}
      onSignOut={handleSignOut}
    >
      {showingResult ? (
        <ResultPage
          result={result}
          onBackToCases={showDashboard}
          backButtonLabel="대시보드로"
        />
      ) : (
        <AnalysisListPage
          accessToken={session.access_token}
          onOpenResult={openSavedResult}
          onStartAnalysis={showDashboard}
          canStartAnalysis={false}
        />
      )}
    </AuthenticatedLayout>
  );
}
