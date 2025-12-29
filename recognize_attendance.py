import cv2
import pandas as pd
from datetime import datetime
from models.insightface_model import load_model
from utils import load_embeddings, cosine_similarity

THRESHOLD = 0.5

model = load_model()
db = load_embeddings()

cap = cv2.VideoCapture(0)
marked = set()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    faces = model.get(frame)

    for face in faces:
        emb = face.embedding
        best_match = None
        best_score = 0

        for sid, data in db.items():
            score = cosine_similarity(emb, data["embedding"])
            if score > best_score:
                best_score = score
                best_match = sid

        if best_score > THRESHOLD and best_match not in marked:
            name = db[best_match]["name"]
            time_now = datetime.now().strftime("%H:%M:%S")

            df = pd.DataFrame([[best_match, name, time_now]],
                              columns=["ID", "Name", "Time"])
            df.to_csv("attendance/attendance.csv",
                      mode="a", header=False, index=False)

            marked.add(best_match)
            print(f"Attendance marked: {name}")

    cv2.imshow("Attendance System", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
