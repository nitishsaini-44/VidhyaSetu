import cv2

from models.insightface_model import load_model
from utils import load_embeddings, cosine_similarity

THRESHOLD = 0.5

import numpy as np

# Load model and db at module level
model = load_model()
db = load_embeddings()

def recognize_face(image_bytes):
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return {"status": "error", "message": "Failed to decode image"}
            
        faces = model.get(frame)
        if len(faces) == 0:
             return {"status": "success", "match": False, "message": "No face detected"}

        # Process the largest face if multiple
        face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)[0]
        
        emb = face.embedding
        best_match = None
        best_score = 0

        for sid, data in db.items():
            score = cosine_similarity(emb, data["embedding"])
            if score > best_score:
                best_score = score
                best_match = sid

        if best_score > THRESHOLD:
            name = db[best_match]["name"]
            # Optional: Mark attendance here if desired, or let caller handle it
            # time_now = datetime.now().strftime("%H:%M:%S")
            # We will just return the data
            
            return {
                "status": "success",
                "match": True,
                "student_id": best_match,
                "name": name,
                "confidence": float(best_score)
            }
        else:
            return {
                "status": "success",
                "match": False, 
                "message": "Face not recognized",
                "confidence": float(best_score)
            }

    except Exception as e:
        return {"status": "error", "message": str(e)}

