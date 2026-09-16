# Stride API (Review 3)

Base URL (local): `http://127.0.0.1:8000`  
Interactive docs: `http://127.0.0.1:8000/docs`  
Auth: `POST /auth/token` with form fields `username` (email) and `password`. Send `Authorization: Bearer <token>` on all other routes.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/health` | public | Service check |
| POST | `/auth/token` | public | Sign in, returns JWT + role |
| GET | `/auth/me` | any signed-in user | Current profile |
| GET/POST | `/patients` | therapist, admin | List / create patients |
| GET/PATCH/DELETE | `/patients/{id}` | therapist, admin | Read / update / archive |
| GET | `/exercises` | any | Exercise library |
| POST/PATCH | `/exercises` | therapist, admin | Maintain library |
| GET/POST | `/plans` | patient sees own; therapist creates | Rehabilitation plans |
| GET | `/plans/{id}` | owner roles | Plan detail with items |
| GET/POST | `/appointments` | patient sees own; therapist creates | Visits |
| GET/POST | `/sessions` | patient starts | Exercise sessions |
| POST | `/sessions/{id}/complete` | patient | Save reps + observation |
| GET | `/observations` | therapist all pending; patient approved only | Review queue / progress |
| PATCH | `/observations/{id}` | therapist, admin | Approve, correct, or reject |
| GET/POST | `/consent` | patient | Camera-analysis consent |
| GET/PATCH | `/admin/users` | administrator | Account status |
| GET | `/video/room` | public (demo) | HTML WebRTC room page |
| WS | `/video/ws` | public (demo) | SDP / ICE signaling |
| GET | `/video/debug` | public (demo) | Active rooms (debug) |

Demo password: `StrideClinic1!`  
`riyaz@stride.clinic` · `therapist@stride.clinic` · `admin@stride.clinic`
