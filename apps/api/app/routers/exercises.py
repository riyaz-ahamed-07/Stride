from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, Db, TherapistUser
from app.models import Exercise
from app.schemas import ExerciseCreate, ExerciseOut, ExerciseUpdate

router = APIRouter(prefix="/exercises", tags=["Exercises"])


@router.get("", response_model=list[ExerciseOut])
def list_exercises(db: Db, _: CurrentUser) -> list[Exercise]:
    return list(db.query(Exercise).order_by(Exercise.name))


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(payload: ExerciseCreate, db: Db, user: TherapistUser) -> Exercise:
    if db.query(Exercise).filter(Exercise.name == payload.name).first():
        raise HTTPException(status_code=400, detail="An exercise with this name already exists.")
    exercise = Exercise(**payload.model_dump(), created_by_id=user.id, is_system=False)
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.patch("/{exercise_id}", response_model=ExerciseOut)
def update_exercise(
    exercise_id: str,
    payload: ExerciseUpdate,
    db: Db,
    user: TherapistUser,
) -> Exercise:
    exercise = db.get(Exercise, exercise_id)
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise not found.")
    if exercise.is_system is False and exercise.created_by_id and exercise.created_by_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own custom exercises.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(exercise, key, value)
    db.commit()
    db.refresh(exercise)
    return exercise
