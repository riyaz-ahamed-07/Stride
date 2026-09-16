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
            week_number=item.week_number,
            day_of_week=item.day_of_week,
            session_type=item.session_type,  # type: ignore[arg-type]
            sort_order=item.sort_order,
            frequency_note=item.frequency_note or "",
            body_region=item.exercise.body_region,
            pose_recipe_key=item.exercise.pose_recipe_key,
            demo_cue=item.exercise.demo_cue or "",
        )
        for item in sorted(plan.items, key=lambda row: (row.week_number, row.day_of_week or -1, row.sort_order))
    ]
    return PlanOut(
        id=plan.id,
        patient_id=plan.patient_id,
        therapist_id=plan.therapist_id,
        title=plan.title,
        start_date=plan.start_date,
        duration_weeks=plan.duration_weeks,
        goal=plan.goal or "",
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
    if not payload.items:
        raise HTTPException(status_code=400, detail="Add at least one exercise to the plan.")
    plan = RehabilitationPlan(
        patient_id=payload.patient_id,
        therapist_id=user.id,
        title=payload.title,
        start_date=payload.start_date,
        duration_weeks=payload.duration_weeks,
        goal=payload.goal,
    )
    db.add(plan)
    db.flush()
    for index, item in enumerate(payload.items):
        db.add(
            PlanExercise(
                plan_id=plan.id,
                exercise_id=item.exercise_id,
                target_sets=item.target_sets,
                target_repetitions=item.target_repetitions,
                week_number=item.week_number,
                day_of_week=item.day_of_week,
                session_type=item.session_type,
                sort_order=item.sort_order if item.sort_order else index,
                frequency_note=item.frequency_note,
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
