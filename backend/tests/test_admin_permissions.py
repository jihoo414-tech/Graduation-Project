import pytest

from app.common.exceptions import AppError
from app.domains.admin import repository as admin_repository
from app.domains.admin.service import fetch_users, update_user_role
from app.domains.auth.models import SupabaseUser


def test_only_admin_can_list_users(monkeypatch):
    monkeypatch.setattr(
        admin_repository,
        "fetch_users",
        lambda _: [
            {
                "id": "patient-1",
                "full_name": "테스트 환자",
                "role": "patient",
            }
        ],
    )
    response = fetch_users("token", SupabaseUser(id="admin-1", role="admin"))
    assert response.items[0].fullName == "테스트 환자"

    with pytest.raises(AppError) as error:
        fetch_users("token", SupabaseUser(id="doctor-1", role="doctor"))
    assert error.value.status_code == 403


def test_admin_can_change_another_users_role(monkeypatch):
    calls = []
    monkeypatch.setattr(
        admin_repository,
        "update_role",
        lambda token, user_id, role: calls.append((token, user_id, role)) or True,
    )
    update_user_role(
        "token",
        SupabaseUser(id="admin-1", role="admin"),
        "patient-1",
        "doctor",
    )
    assert calls == [("token", "patient-1", "doctor")]


def test_admin_cannot_change_own_role():
    with pytest.raises(AppError) as error:
        update_user_role(
            "token",
            SupabaseUser(id="admin-1", role="admin"),
            "admin-1",
            "patient",
        )
    assert error.value.status_code == 422
