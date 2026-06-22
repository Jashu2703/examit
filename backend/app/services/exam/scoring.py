from app.services.exam.syllabus import get_exam_config

def calculate_score(
    exam_type: str,
    questions: list,
    answers: dict,
    time_per_q: dict
) -> dict:
    config = get_exam_config(exam_type)
    marks_correct = config.get("marks_per_correct", 1)
    marks_wrong   = config.get("negative_marking", 0)

    correct     = 0
    incorrect   = 0
    unattempted = 0
    raw_score   = 0.0
    topic_map   = {}  # {chapter: {correct, total}}

    for i, q in enumerate(questions):
        chapter = q.get("chapter", "General")
        subject = q.get("subject", "General")
        key     = f"{subject} — {chapter}"

        if key not in topic_map:
            topic_map[key] = {"subject": subject, "chapter": chapter, "correct": 0, "total": 0}

        topic_map[key]["total"] += 1
        user_ans = answers.get(str(i))

        if user_ans is None:
            unattempted += 1
        elif user_ans == q["correct_answer"]:
            correct   += 1
            raw_score += marks_correct
            topic_map[key]["correct"] += 1
        else:
            incorrect += 1
            raw_score += marks_wrong

    max_score  = len(questions) * marks_correct
    percentage = (raw_score / max_score * 100) if max_score > 0 else 0
    percentage = max(0, percentage)  # can't go below 0

    # Topic accuracy
    topic_accuracy = {}
    for key, data in topic_map.items():
        pct = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0
        topic_accuracy[key] = {
            "subject": data["subject"],
            "chapter": data["chapter"],
            "correct": data["correct"],
            "total":   data["total"],
            "pct":     round(pct, 1)
        }

    # Weak topics — sorted by accuracy ascending
    weak_topics = sorted(
        [
            {
                "topic":    key,
                "subject":  data["subject"],
                "chapter":  data["chapter"],
                "score":    round(data["correct"] / data["total"] * 100, 1) if data["total"] > 0 else 0,
                "priority": "high" if (data["correct"] / data["total"] < 0.4 if data["total"] > 0 else True) else "medium"
            }
            for key, data in topic_map.items()
        ],
        key=lambda x: x["score"]
    )

    # Time analysis
    times = [float(v) for v in time_per_q.values() if v is not None]
    avg_time = sum(times) / len(times) if times else 0
    slow_qs  = [i for i, t in time_per_q.items() if t and float(t) > avg_time * 1.8]
    fast_qs  = [i for i, t in time_per_q.items() if t and float(t) < 15]

    time_analysis = {
        "avg_time_secs": round(avg_time, 1),
        "total_time_secs": sum(times),
        "slow_questions": slow_qs[:5],
        "fast_questions": fast_qs[:5],
        "time_flag": (
            "too_slow" if avg_time > 120 else
            "too_fast" if avg_time < 20 else
            "optimal"
        )
    }

    return {
        "raw_score":      round(raw_score, 2),
        "max_score":      max_score,
        "percentage":     round(percentage, 2),
        "correct":        correct,
        "incorrect":      incorrect,
        "unattempted":    unattempted,
        "topic_accuracy": topic_accuracy,
        "weak_topics":    weak_topics,
        "time_analysis":  time_analysis,
    }

def calculate_percentile(user_score: float, all_scores: list[float]) -> float:
    if not all_scores:
        return 100.0
    below = sum(1 for s in all_scores if s < user_score)
    return round((below / len(all_scores)) * 100, 1)
