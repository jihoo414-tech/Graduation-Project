# LUAD AI Clinical Workspace

## Stitch resources

- Project: `projects/8372577013514689715`
- Design system: `assets/1037273483949729113`
- Project title: `LUAD AI - Role Based Clinical Workspace`
- Visibility: private

Use the production screen IDs below when bringing designs into the React application. Earlier screens in the Stitch project are exploration or superseded revisions.

| Flow | Stitch screen ID |
| --- | --- |
| User type selection | `4b6f8d6bec164e12b6505ce8455b3a9a` |
| Patient login | `f66462a9ab4e428e8ca4f6a405b86cd5` |
| Administrator login | `b8b0f4ce53ae4009a5083be3259c981f` |
| Patient dashboard | `15e44d0499754079b1e28dfa2228cc46` |
| Administrator dashboard | `3ae5821dad0b484c8a159f7b1dea1267` |
| Analysis patient selection | `3606210cc0dc475ebf4329a3ed1e700c` |
| Analysis clinical input | `15bd64ac70fa4dfd85b8e7ce76c4e4cc` |
| Analysis file upload | `c3352753d4034b4ca12ac9fb967105bf` |
| Analysis in progress | `fc77f8f9ec6344d2add6be715a8f6ed1` |
| Patient result detail | `7ac163c233c2478ba5081b5b1614fe65` |
| Administrator result detail | `2c932750b572494bb28c00b69c1e31cb` |

## Foundation

- Appearance: light
- Primary: `#1D4ED8`
- Secondary accent: `#0F766E`
- Neutral seed: `#F4F5F7`
- Font: Noto Sans with Korean-compatible system fallbacks
- Radius: 8px maximum for standard controls and surfaces
- Page background: light neutral gray
- Main surfaces: solid white with thin neutral borders
- Primary text: dark charcoal
- Risk colors: restrained red for High and green for Low, always paired with text

## Product rules

- This is an operational clinical analysis application, not a marketing site.
- Do not add gradients, glass effects, decorative imagery, oversized hero text, or nested cards.
- Do not add features that are absent from the React application.
- User type selection chooses a portal and never grants a role.
- Patient signup is public; administrator signup is not available.
- Patients only see results assigned to their account and cannot run analyses.
- Doctors and administrators see the staff dashboard, select a registered patient, and run analyses.
- Staff analysis follows patient selection, clinical information, then file upload.
- Risk scores are model scores, not probabilities, accuracy, or confirmed diagnoses.
- The Kaplan-Meier chart is a cohort reference and not an individual prognosis.
- Backend error codes, field names, tokens, paths, and database details are never displayed.

## Implementation guidance

Retain the current React feature structure and API behavior. Translate Stitch HTML into existing components and design tokens rather than replacing application state, authentication, authorization, API calls, or tests. Implement one flow at a time and verify desktop and 390px mobile layouts before moving to the next flow.
