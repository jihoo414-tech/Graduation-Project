import type { UserRole } from '../../../shared/types/auth';
import { useAdminUsers } from '../hooks/useAdminUsers';

type UserManagementPanelProps = {
  accessToken: string;
  currentUserId: string;
};

const roleLabel: Record<UserRole, string> = {
  patient: '환자',
  doctor: '의사',
  admin: '관리자',
};

export function UserManagementPanel({
  accessToken,
  currentUserId,
}: UserManagementPanelProps) {
  const users = useAdminUsers(accessToken, true);
  const changeRole = (userId: string, name: string | null, role: UserRole) => {
    if (window.confirm(`${name ?? '이름 미등록'} 계정의 역할을 ${roleLabel[role]}(으)로 변경하시겠습니까?`)) {
      void users.updateRole(userId, role);
    }
  };

  return (
    <section className="dashboard-main-panel">
      <div className="dashboard-panel-heading">
        <div>
          <p className="workspace-page-kicker">Administration</p>
          <h2>계정 역할 관리</h2>
        </div>
      </div>
      {users.loading ? <p className="workspace-inline-output">사용자 목록을 불러오는 중입니다.</p> : null}
      {users.error ? (
        <div className="workspace-inline-output" role="alert">
          <p>{users.error}</p>
          <button className="secondary-button" type="button" onClick={users.loadUsers}>다시 시도</button>
        </div>
      ) : null}
      {!users.loading && !users.error ? (
        <div className="admin-user-list">
          {users.items.map((user) => (
            <article className="admin-user-row" key={user.id}>
              <div>
                <strong>{user.fullName ?? '이름 미등록'}</strong>
                <p>{roleLabel[user.role]}</p>
              </div>
              <select
                aria-label={`${user.fullName ?? '사용자'} 역할`}
                value={user.role}
                disabled={user.id === currentUserId}
                onChange={(event) => changeRole(user.id, user.fullName, event.target.value as UserRole)}
              >
                <option value="patient">환자</option>
                <option value="doctor">의사</option>
                <option value="admin">관리자</option>
              </select>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
