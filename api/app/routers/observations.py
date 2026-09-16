from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import joinedload

from app.deps import CurrentUser, Db, TherapistUser
from app.models import (
    ExerciseSession,
    MovementObservation,
    PlanExercise,
    RehabilitationPlan,
    ReviewStatus,
    UserRole,
)
from app.schemas import ObservationOut, ObservationReview

router = APIRouter(prefix="/observations", tags=["Movement observations"])

CONFIRMED_STATUSES = {ReviewStatus.approved, ReviewStatus.corrected}


def _out(item: MovementObservation) -> ObservationOut:
    plan_exercise = item.session.plan_exercise
    plan = plan_exercise.plan
    patient = getattr(plan, "patient", None)
    return ObservationOut(
        id=item.id,
        session_id=item.session_id,
        metric=item.metric,
        value=item.value,
        confidence=item.confidence,
        review_status=item.review_status.value,  # type: ignore[arg-type]
        therapist_comment=item.therapist_comment,
        original_value=item.original_value,
        patient_id=plan.patient_id if plan else None,
        patient_name=patient.full_name if patient else None,
        exercise_name=plan_exercise.exercise.name if plan_exercise.exercise else None,
        plan_title=plan.title if plan else None,
        started_at=item.session.started_at,
        ended_at=item.session.ended_at,
        reported_repetitions=item.session.reported_repetitions,
        patient_notes=item.session.patient_notes,
        target_sets=plan_exercise.target_sets,
        target_repetitions=plan_exercise.target_repetitions,
        created_at=item.created_at,
    )


def _observation_query(db: Db):
    return db.query(MovementObservation).options(
        joinedload(MovementObservation.session)
        .joinedload(ExerciseSession.plan_exercise)
        .joinedload(PlanExercise.exercise),
        joinedload(MovementObservation.session)
        .joinedload(ExerciseSession.plan_exercise)
        .joinedload(PlanExercise.plan)
        .joinedload(RehabilitationPlan.patient),
    )


@router.get("", response_model=list[ObservationOut])
def list_observations(db: Db, user: CurrentUser) -> list[ObservationOut]:
    query = _observation_query(db)
    if user.role == UserRole.physiotherapist:
        items = [
            item
            for item in query.all()
            if item.session.plan_exercise.plan.therapist_id == user.id
        ]
    elif user.role == UserRole.patient:
        items = [
            item
            for item in query.all()
            if item.session.plan_exercise.plan.patient_id == user.id
            and item.review_status in CONFIRMED_STATUSES
        ]
    else:
        items = list(query.all())
    items.sort(
        key=lambda row: row.created_at.timestamp() if row.created_at else 0.0,
        reverse=True,
    )
    return [_out(item) for item in items]


@router.patch("/{observation_id}", response_model=ObservationOut)
def review_observation(
    observation_id: str, payload: ObservationReview, db: Db, user: TherapistUser
) -> ObservationOut:
    item = _observation_query(db).filter(MovementObservation.id == observation_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Observation not found.")
    if user.role == UserRole.physiotherapist and item.session.plan_exercise.plan.therapist_id != user.id:
        raise HTTPException(status_code=403, detail="This observation is not on your list.")

    next_status = ReviewStatus(payload.review_status)
    same_status = item.review_status == next_status
    same_comment = (payload.therapist_comment or None) == (item.therapist_comment or None)
    same_value = payload.value is None or payload.value == item.value
    if same_status and same_comment and same_value:
        return _out(item)

    if next_status == ReviewStatus.corrected:
        if payload.value is None:
            raise HTTPException(status_code=400, detail="Corrected observations require an updated value.")
        if item.original_value is None and payload.value != item.value:
            item.original_value = item.value
        item.value = payload.value
    elif payload.value is not None and payload.value != item.value:
        raise HTTPException(
            status_code=400,
            detail="Value can only be changed when marking an observation as corrected.",
        )

    if next_status == ReviewStatus.rejected and not (payload.therapist_comment or "").strip():
        raise HTTPException(status_code=400, detail="Add a short note when rejecting an observation.")

    item.review_status = next_status
    if payload.therapist_comment is not None:
        item.therapist_comment = payload.therapist_comment.strip() or None
    db.commit()
    db.refresh(item)
    return _out(item)
