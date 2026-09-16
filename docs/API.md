# Stride API

Base URL (local): `http://127.0.0.1:8000`  
Interactive docs (authoritative): `http://127.0.0.1:8000/docs`  

Auth: `POST /auth/token` with form fields `username` (email) and `password`.  
Send `Authorization: Bearer <token>` on protected routes.

## Endpoints (summary)

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/health` | public | Service check |
| POST | `/auth/register` | public | Create account (pending email verification) |
| POST | `/auth/verify-otp` | public | Verify email OTP |
| POST | `/auth/resend-otp` | public | Resend email OTP |
| POST | `/auth/forgot-password` | public | Request password reset |
| POST | `/auth/reset-password` | public | Consume reset token |
| POST | `/auth/token` | public | Sign in (JWT + profile) |
| POST | `/auth/google` | public | Stub — returns 501 (not enabled) |
| POST | `/auth/onboarding/patient` | authenticated | Patient invite-code onboarding |
| POST | `/auth/onboarding/therapist` | authenticated | Therapist profile → pending approval |
| GET | `/auth/me` | authenticated | Current profile |
| PATCH | `/auth/me` | active user | Update profile |
| GET | `/auth/my-therapist` | patient | Linked therapist contact |
| POST | `/auth/change-therapist` | patient | Rebind via invite code |
| GET/POST | `/patients` | therapist, admin | List / create patients |
| GET/PATCH/DELETE | `/patients/{id}` | therapist, admin | Read / update / archive |
| GET | `/exercises` | any signed-in | Exercise library |
| POST/PATCH | `/exercises` | therapist | Maintain library (ownership rules for custom) |
| GET/POST | `/plans` | patient own / therapist create | Rehabilitation plans |
| GET | `/plans/{id}` | owner roles | Plan detail |
| GET/POST | `/appointments` | scoped | List / create visits |
| GET | `/appointments/{id}` | scoped | Appointment detail |
| PATCH | `/appointments/{id}` | therapist | Complete or cancel |
| GET/POST | `/sessions` | patient | List / start sessions |
| POST | `/sessions/{id}/complete` | patient | Save reps + observations |
| GET | `/observations` | scoped | Review queue / confirmed progress |
| PATCH | `/observations/{id}` | therapist | Approve, correct, or reject |
| GET/POST | `/consent` | patient | Camera-analysis consent |
| GET | `/admin/users` | administrator | List users |
| GET | `/admin/users/pending` | administrator | Pending therapists |
| POST | `/admin/users/{id}/approve` | administrator | Approve therapist + invite code |
| POST | `/admin/users/{id}/reject` | administrator | Reject application |
| PATCH | `/admin/users/{id}` | administrator | Set account status |
| GET | `/video/consultations/{appointment_id}` | participant | Consultation context |
| POST | `/video/consultations/{appointment_id}/join` | participant | LiveKit join token |
| POST | `/video/consultations/{appointment_id}/end` | therapist | End room; may complete appointment |

## Demo accounts (development)

Password: `StrideClinic1!`  
`riyaz@stride.clinic` · `therapist@stride.clinic` · `admin@stride.clinic`

See also: [Project documentation](PROJECT_DOCUMENTATION.md) · [README](../README.md)
