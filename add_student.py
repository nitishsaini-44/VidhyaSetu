import cv2
from models.insightface_model import load_model
from utils import load_embeddings, save_embeddings, save_student_to_csv

model = load_model()
db = load_embeddings()

student_id = input("Enter Student ID: ")
name = input("Enter Name: ")
img_path = input("Image Path: ")

img = cv2.imread(img_path)
faces = model.get(img)

if len(faces) == 0:
    print("No face detected")
else:
    embedding = faces[0].embedding
    db[student_id] = {
        "name": name,
        "embedding": embedding
    }
    save_embeddings(db)
    save_student_to_csv(student_id, name)
    print("Student added successfully")
