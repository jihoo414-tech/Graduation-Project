from app.common import config


def test_env_files_still_resolve_from_project_root(monkeypatch, tmp_path):
    backend = tmp_path / "backend"
    frontend = tmp_path / "frontend"
    backend.mkdir()
    frontend.mkdir()
    (backend / ".env").write_text("SHARED=backend\n", encoding="utf-8")
    (frontend / ".env").write_text("SHARED=frontend\nFALLBACK=local\n", encoding="utf-8")
    monkeypatch.setattr(config, "__file__", str(backend / "app/common/config.py"))
    # Bypass the process cache to avoid reading or altering actual local configuration.
    assert config._env_file_values.__wrapped__() == {"SHARED": "backend", "FALLBACK": "local"}
