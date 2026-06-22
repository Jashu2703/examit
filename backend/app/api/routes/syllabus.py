from fastapi import APIRouter, HTTPException
from app.services.exam.syllabus import SYLLABUS, get_exam_config, get_subjects, get_chapters

router = APIRouter(prefix="/syllabus", tags=["Syllabus"])

@router.get("/exams")
def list_exams():
    return [
        {
            "exam_type":       k,
            "full_name":       v["full_name"],
            "total_questions": v["total_questions"],
            "duration_mins":   v["duration_mins"],
            "subjects":        list(v["subjects"].keys())
        }
        for k, v in SYLLABUS.items()
    ]

@router.get("/{exam_type}")
def get_syllabus(exam_type: str):
    config = get_exam_config(exam_type.upper())
    if not config:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"exam_type": exam_type.upper(), **config}

@router.get("/{exam_type}/subjects")
def get_exam_subjects(exam_type: str):
    subjects = get_subjects(exam_type.upper())
    if not subjects:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"exam_type": exam_type.upper(), "subjects": subjects}

@router.get("/{exam_type}/{subject}/chapters")
def get_subject_chapters(exam_type: str, subject: str):
    chapters = get_chapters(exam_type.upper(), subject)
    return {"exam_type": exam_type.upper(), "subject": subject, "chapters": chapters}
