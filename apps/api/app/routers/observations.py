from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, Db, TherapistUser
from app.models import MovementObservation, ReviewStatus, UserRole
from app.schemas import ObservationOut, ObservationReview

router = APIRouter(prefix="/observations", tags=["Movement observations"])


def _out(item: MovementObservation) -> ObservationOut:
    plan = item.session.plan_exercise.plan
    return ObservationOut(
        id=item.id,
        session_id=item.session_id,
        metric=item.metric,
        value=item.value,
        confidence=item.confidence,
        review_status=item.review_status.value,
        therapist_comment=item.therapist_comment,
        patient_name=plan.patient.full_name if plan.patient else None,
        exercise_name=item.session.plan_exercise.exercise.name,
    )


@router.get("", response_model=list[ObservationOut])
def list_observations(db: Db, user: CurrentUser) -> list[ObservationOut]:
    query = db.query(MovementObservation)
    if user.role == UserRole.physiotherapist:
        items = [item for item in query.all() if item.session.plan_exercise.plan.therapist_id == user.id]
    elif user.role == UserRole.patient:
        items = [
            item
            for item in query.all()
            if item.session.plan_exercise.plan.patient_id == user.id and item.review_status == ReviewStatus.approved
        ]
    else:
        items = list(query.all())
    return [_out(item) for item in items]


@router.patch("/{observation_id}", response_model=ObservationOut)
def review_observation(observation_id: str, payload: ObservationReview, db: Db, user: TherapistUser) -> ObservationOut:
    item = db.get(MovementObservation, observation_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Observation not found.")
    if user.role == UserRole.physiotherapist and item.session.plan_exercise.plan.therapist_id != user.id:
        raise HTTPException(status_code=403, detail="This observation is not on your list.")
    item.review_status = ReviewStatus(payload.review_status)
    item.therapist_comment = payload.therapist_comment
    db.commit()
    db.refresh(item)
    return _out(item)
