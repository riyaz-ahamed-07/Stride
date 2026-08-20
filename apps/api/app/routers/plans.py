from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, Db, PhysioUser
from app.models import PlanExercise, RehabilitationPlan, User, UserRole
from app.schemas import PlanCreate, PlanItemOut, PlanOut

router = APIRouter(prefix="/plans", tags=["Rehabilitation plans"])


def _to_out(plan: RehabilitationPlan) -> PlanOut:
    items = [
        PlanItemOut(
            id=item.id,
            exercise_id=item.exercise_id,
            exercise_name=item.exercise.name,
            target_sets=item.target_sets,
            target_repetitions=item.target_repetitions,
            instructions=item.exercise.instructions,
            safety_notes=item.exercise.safety_notes,
        )
        for item in plan.items
    ]
    return PlanOut(
        id=plan.id,
        patient_id=plan.patient_id,
        therapist_id=plan.therapist_id,
        title=plan.title,
        start_date=plan.start_date,
        status=plan.status.value,
        items=items,
    )


def _can_see(user: User, plan: RehabilitationPlan) -> bool:
    if user.role == UserRole.administrator:
        return True
    if user.role == UserRole.physiotherapist:
        return plan.therapist_id == user.id
    return plan.patient_id == user.id


@router.get("", response_model=list[PlanOut])
def list_plans(db: Db, user: CurrentUser) -> list[PlanOut]:
    query = db.query(RehabilitationPlan)
    if user.role == UserRole.physiotherapist:
        query = query.filter(RehabilitationPlan.therapist_id == user.id)
    elif user.role == UserRole.patient:
        query = query.filter(RehabilitationPlan.patient_id == user.id)
    return [_to_out(plan) for plan in query.order_by(RehabilitationPlan.created_at.desc())]


@router.post("", response_model=PlanOut, status_code=201)
def create_plan(payload: PlanCreate, db: Db, user: PhysioUser) -> PlanOut:
    patient = db.get(User, payload.patient_id)
    if patient is None or patient.role != UserRole.patient or patient.therapist_id != user.id:
        raise HTTPException(status_code=400, detail="Choose a patient from your list.")
    plan = RehabilitationPlan(
        patient_id=payload.patient_id,
        therapist_id=user.id,
        title=payload.title,
        start_date=payload.start_date,
    )
    db.add(plan)
    db.flush()
    for item in payload.items:
        db.add(
            PlanExercise(
                plan_id=plan.id,
                exercise_id=item.exercise_id,
                target_sets=item.target_sets,
                target_repetitions=item.target_repetitions,
            )
        )
    db.commit()
    db.refresh(plan)
    return _to_out(plan)


@router.get("/{plan_id}", response_model=PlanOut)
def get_plan(plan_id: str, db: Db, user: CurrentUser) -> PlanOut:
    plan = db.get(RehabilitationPlan, plan_id)
    if plan is None or not _can_see(user, plan):
        raise HTTPException(status_code=404, detail="Plan not found.")
    return _to_out(plan)
