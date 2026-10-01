# Railway deployment

Deploy the existing application as two services from the same GitHub repository.
The Dockerfiles pin runtime versions without changing local development commands.
No railway.json or TypeScript IaC migration is required.

| Setting | Backend | Frontend |
| --- | --- | --- |
| Root Directory | /backend | /frontend |
| Builder | Dockerfile (automatic detection) | Dockerfile (automatic detection) |
| Custom build/start commands | Leave empty | Leave empty |
| Railway Config File | Leave empty | Leave empty |
| Healthcheck Path | /api/v1/health | / |

Backend variables:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-key
MODEL_ARTIFACT_DIR=/model-artifacts
INFERENCE_ADAPTER=real_ensemble
BACKEND_CORS_ORIGINS=https://graduation-project-frontend.up.railway.app
```

Attach a volume to the backend at /model-artifacts. Upload deepsurv_model.pt,
rsf.model.pkl, ensemble_stats.json, gene_coef.csv, and km_data.csv into the volume
root. For example, from the local model folder after railway login and railway link:

```powershell
railway volume files upload .\deepsurv_model.pt /deepsurv_model.pt
railway volume files list /
```

Frontend variables (set before building; redeploy after changes):

```text
VITE_API_BASE_URL=https://your-backend.up.railway.app
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-key
```

Generate public domains for both services. Use the listening port shown in each
service's deploy logs. Set BACKEND_CORS_ORIGINS to the frontend domain, then apply
changes. The Vite preview configuration allows the existing frontend domain and
the service's RAILWAY_PUBLIC_DOMAIN at runtime.

Keep the current Supabase schema and role policies. Add the frontend URL to
Supabase Auth Site URL and Redirect URLs. Verify backend health, login, CSV
analysis, and saved results. Health success alone does not validate model files.

Local development remains npm run dev and uvicorn app.main:app --reload.
