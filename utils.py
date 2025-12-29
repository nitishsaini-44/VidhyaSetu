import pickle
import numpy as np
import os
import csv

DB_PATH = "database/embeddings.pkl"
CSV_PATH = "database/students.csv"

def load_embeddings():
    # Ensure database folder exists
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    # If file does not exist or is empty → return empty DB
    if not os.path.exists(DB_PATH) or os.path.getsize(DB_PATH) == 0:
        return {}

    with open(DB_PATH, "rb") as f:
        try:
            return pickle.load(f)
        except (EOFError, pickle.UnpicklingError):
            return {}

def save_embeddings(data):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with open(DB_PATH, "wb") as f:
        pickle.dump(data, f)

def save_student_to_csv(student_id, name):
    os.makedirs(os.path.dirname(CSV_PATH), exist_ok=True)

    file_exists = os.path.exists(CSV_PATH)

    with open(CSV_PATH, mode="a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        # Write header only once
        if not file_exists:
            writer.writerow(["student_id", "name"])

        writer.writerow([student_id, name])

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def remove_student_from_embeddings(student_id):
    db = load_embeddings()

    if student_id not in db:
        return False

    del db[student_id]
    save_embeddings(db)
    return True

def remove_student_from_csv(student_id):
    if not os.path.exists(CSV_PATH):
        return False

    rows = []
    removed = False

    with open(CSV_PATH, mode="r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        for row in reader:
            if row["student_id"] != student_id:
                rows.append(row)
            else:
                removed = True

    if removed:
        with open(CSV_PATH, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["student_id", "name"]
            )
            writer.writeheader()
            writer.writerows(rows)

    return removed
