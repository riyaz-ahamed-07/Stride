from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, Db, TherapistUser
from app.models import Exercise
from app.schemas import ExerciseCreate, ExerciseOut

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(db: Db, _: CurrentUser) -> list[Exercise]:
    return list(db.query(Exercise).order_by(Exercise.name))


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(payload: ExerciseCreate, db: Db, _: TherapistUser) -> Exercise:
    if db.query(Exercise).filter(Exercise.name == payload.name).first():
        raise HTTPException(status_code=400, detail="An exercise with this name already exists.")
    exercise = Exercise(**payload.model_dump())
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(
    exercise_id: str,
    payload: ExerciseCreate,
    db: Db,
    _: TherapistUser,
) -> Exercise:
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    for key, value in payload.model_dump().items():
        setattr(exercise, key, value)
    db.commit()
    db.refresh(exercise)
    return exercise
