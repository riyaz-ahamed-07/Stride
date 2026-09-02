from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, Db
from app.models import ExerciseSession, MovementObservation, PlanExercise, RehabilitationPlan, SessionStatus, UserRole
from app.schemas import SessionComplete, SessionCreate, SessionOut

router = APIRouter(prefix="/sessions", tags=["Exercise sessions"])


def _out(session: ExerciseSession) -> SessionOut:
    return SessionOut(
        id=session.id,
        plan_exercise_id=session.plan_exercise_id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        status=session.status.value,
        reported_repetitions=session.reported_repetitions,
        patient_notes=session.patient_notes,
    )


@router.get("", response_model=list[SessionOut])
def list_sessions(db: Db, user: CurrentUser) -> list[SessionOut]:
    query = db.query(ExerciseSession)
    if user.role == UserRole.patient:
        query = (
            db.query(ExerciseSession)
            .join(PlanExercise, ExerciseSession.plan_exercise_id == PlanExercise.id)
            .join(RehabilitationPlan, PlanExercise.plan_id == RehabilitationPlan.id)
            .filter(RehabilitationPlan.patient_id == user.id)
        )
        return [_out(item) for item in query.order_by(ExerciseSession.started_at.desc())]
    sessions = query.order_by(ExerciseSession.started_at.desc()).all()
    return [_out(item) for item in sessions]


@router.post("", response_model=SessionOut, status_code=201)
def start_session(payload: SessionCreate, db: Db, user: CurrentUser) -> SessionOut:
    item = db.get(PlanExercise, payload.plan_exercise_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Assigned exercise not found.")
    if user.role == UserRole.patient and item.plan.patient_id != user.id:
        raise HTTPException(status_code=403, detail="This exercise is not on your plan.")
    session = ExerciseSession(plan_exercise_id=item.id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return _out(session)


@router.post("/{session_id}/complete", response_model=SessionOut)
def complete_session(session_id: str, payload: SessionComplete, db: Db, user: CurrentUser) -> SessionOut:
    session = db.get(ExerciseSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if user.role == UserRole.patient and session.plan_exercise.plan.patient_id != user.id:
        raise HTTPException(status_code=403, detail="You cannot finish this session.")
    session.status = SessionStatus.completed
    session.ended_at = datetime.now(timezone.utc)
    session.reported_repetitions = payload.reported_repetitions
    session.patient_notes = payload.patient_notes
    if payload.observations:
        for row in payload.observations:
            db.add(
                MovementObservation(
                    session_id=session.id,
                    metric=row.metric,
                    value=row.value,
                    confidence=row.confidence,
                )
            )
    else:
        db.add(
            MovementObservation(
                session_id=session.id,
                metric=payload.metric,
                value=payload.value,
                confidence=payload.confidence,
            )
        )
    db.commit()
    db.refresh(session)
    return _out(session)
