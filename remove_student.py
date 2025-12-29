from utils import (
    remove_student_from_csv,
    remove_student_from_embeddings
)

student_id = input("Enter Student ID to remove: ")

removed_db = remove_student_from_embeddings(student_id)
removed_csv = remove_student_from_csv(student_id)

if removed_db or removed_csv:
    print(f"Student {student_id} removed successfully")
else:
    print("Student ID not found")
