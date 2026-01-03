from flask import Flask, render_template, jsonify, request, Response
import csv
import os
import sys
import subprocess
import base64
import uuid
import threading
import time
from datetime import datetime
import cv2
import numpy as np

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from models.insightface_model import load_model
from utils import (
    load_embeddings, 
    cosine_similarity, 
    save_embeddings, 
    save_student_to_csv,
    remove_student_from_embeddings,
    remove_student_from_csv
)

app = Flask(__name__)

# Camera and face recognition globals
camera = None
camera_lock = threading.Lock()
is_streaming = False
is_recognition_active = False
marked_attendance = set()
THRESHOLD = 0.5
face_model = None
embeddings_db = None

# Allow large file uploads (16MB max)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Enable CORS for all routes
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

# Paths
BASE_DIR = os.path.join(os.path.dirname(__file__), "..")
ATTENDANCE_CSV = os.path.join(BASE_DIR, "attendance", "attendance.csv")
STUDENTS_CSV = os.path.join(BASE_DIR, "database", "students.csv")
ADD_STUDENT_SCRIPT = os.path.join(BASE_DIR, "add_student.py")
REMOVE_STUDENT_SCRIPT = os.path.join(BASE_DIR, "remove_student.py")
ATTENDANCE_SCRIPT = os.path.join(BASE_DIR, "recognize_attendance.py")
CAPTURED_IMAGES_DIR = os.path.join(BASE_DIR, "captured_images")

# Track if attendance is running
attendance_process = None


def get_camera():
    """Initialize camera if not already initialized"""
    global camera
    with camera_lock:
        if camera is None:
            camera = cv2.VideoCapture(0)
            camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        return camera


def release_camera():
    """Release camera resource"""
    global camera
    with camera_lock:
        if camera is not None:
            camera.release()
            camera = None


def load_face_recognition():
    """Load face recognition model and embeddings"""
    global face_model, embeddings_db
    if face_model is None:
        print("Loading face recognition model...")
        face_model = load_model()
    if embeddings_db is None:
        print("Loading embeddings database...")
        embeddings_db = load_embeddings()
    return face_model, embeddings_db


def generate_frames():
    """Generator function for video streaming"""
    global is_streaming, is_recognition_active, marked_attendance, embeddings_db
    
    while is_streaming:
        cam = get_camera()
        if cam is None:
            break
            
        success, frame = cam.read()
        if not success:
            break
        
        # If recognition is active, process face recognition
        if is_recognition_active:
            try:
                model, db = load_face_recognition()
                # Reload embeddings in case new students were added
                embeddings_db = load_embeddings()
                db = embeddings_db
                
                faces = model.get(frame)
                
                for face in faces:
                    # Draw bounding box
                    bbox = face.bbox.astype(int)
                    cv2.rectangle(frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
                    
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
                        label = f"{name} ({best_score:.2f})"
                        color = (0, 255, 0)  # Green for recognized
                        
                        # Mark attendance if not already marked
                        if best_match not in marked_attendance:
                            time_now = datetime.now().strftime("%H:%M:%S")
                            
                            # Save to CSV
                            with open(ATTENDANCE_CSV, "a", newline="", encoding="utf-8") as f:
                                writer = csv.writer(f)
                                writer.writerow([best_match, name, time_now])
                            
                            marked_attendance.add(best_match)
                            print(f"Attendance marked: {name}")
                    else:
                        label = "Unknown"
                        color = (0, 0, 255)  # Red for unknown
                    
                    # Draw label
                    cv2.putText(frame, label, (bbox[0], bbox[1] - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    
            except Exception as e:
                print(f"Face recognition error: {e}")
                # Draw error message on frame
                cv2.putText(frame, "Recognition Error", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Add status text
        status_text = "RECORDING ATTENDANCE" if is_recognition_active else "CAMERA PREVIEW"
        color = (0, 255, 0) if is_recognition_active else (255, 165, 0)
        cv2.putText(frame, status_text, (10, frame.shape[0] - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        # Encode frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/attendance")
def get_attendance():
    """API endpoint to get attendance data"""
    attendance = []
    
    if os.path.exists(ATTENDANCE_CSV) and os.path.getsize(ATTENDANCE_CSV) > 0:
        with open(ATTENDANCE_CSV, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 3:
                    attendance.append({
                        "id": row[0],
                        "name": row[1],
                        "time": row[2]
                    })
    
    return jsonify(attendance)

@app.route("/api/students")
def get_students():
    """API endpoint to get registered students"""
    students = []
    
    if os.path.exists(STUDENTS_CSV) and os.path.getsize(STUDENTS_CSV) > 0:
        with open(STUDENTS_CSV, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                students.append({
                    "student_id": row.get("student_id", ""),
                    "name": row.get("name", "")
                })
    
    return jsonify(students)

@app.route("/api/stats")
def get_stats():
    """API endpoint to get attendance statistics"""
    total_students = 0
    total_attendance = 0
    
    # Count students
    if os.path.exists(STUDENTS_CSV) and os.path.getsize(STUDENTS_CSV) > 0:
        with open(STUDENTS_CSV, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            total_students = sum(1 for _ in reader)
    
    # Count attendance records
    if os.path.exists(ATTENDANCE_CSV) and os.path.getsize(ATTENDANCE_CSV) > 0:
        with open(ATTENDANCE_CSV, mode="r", newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            total_attendance = sum(1 for _ in reader)
    
    return jsonify({
        "total_students": total_students,
        "total_attendance": total_attendance,
        "date": datetime.now().strftime("%Y-%m-%d")
    })

@app.route("/api/register", methods=["POST", "OPTIONS"])
def register_student():
    """API endpoint to register a new student directly (without subprocess)"""
    global embeddings_db
    
    # Handle preflight request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({"success": False, "message": f"Invalid request data: {str(e)}"}), 400
    
    if not data:
        return jsonify({"success": False, "message": "No data received"}), 400
    
    student_id = data.get("student_id", "").strip()
    name = data.get("name", "").strip()
    image_path = data.get("image_path", "").strip()
    image_data = data.get("image_data", "")  # Base64 image from camera
    
    if not student_id or not name:
        return jsonify({"success": False, "message": "Student ID and Name are required"}), 400
    
    if not image_path and not image_data:
        return jsonify({"success": False, "message": "Image is required (capture from camera or provide path)"}), 400
    
    try:
        # Load model if not loaded
        model, _ = load_face_recognition()
        
        # Process image
        if image_data:
            # Decode base64 image
            try:
                image_bytes = base64.b64decode(image_data.split(",")[1] if "," in image_data else image_data)
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                # Also save the image
                os.makedirs(CAPTURED_IMAGES_DIR, exist_ok=True)
                filename = f"{student_id}_{uuid.uuid4().hex[:8]}.jpg"
                full_image_path = os.path.join(CAPTURED_IMAGES_DIR, filename)
                cv2.imwrite(full_image_path, img)
            except Exception as e:
                return jsonify({"success": False, "message": f"Failed to decode image: {str(e)}"}), 400
        else:
            # Read from path
            full_image_path = os.path.join(BASE_DIR, image_path) if not os.path.isabs(image_path) else image_path
            if not os.path.exists(full_image_path):
                return jsonify({"success": False, "message": f"Image not found: {image_path}"}), 400
            img = cv2.imread(full_image_path)
        
        if img is None:
            return jsonify({"success": False, "message": "Failed to read image"}), 400
        
        # Detect face and get embedding
        faces = model.get(img)
        
        if len(faces) == 0:
            return jsonify({"success": False, "message": "No face detected in the image"}), 400
        
        # Get embedding from first detected face
        embedding = faces[0].embedding
        
        # Load current embeddings and add new student
        db = load_embeddings()
        db[student_id] = {
            "name": name,
            "embedding": embedding
        }
        save_embeddings(db)
        save_student_to_csv(student_id, name)
        
        # Refresh the cached embeddings
        embeddings_db = db
        
        return jsonify({
            "success": True, 
            "message": "Student registered successfully",
            "student_id": student_id,
            "name": name
        })
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Registration error: {str(e)}"}), 500

@app.route("/api/remove", methods=["POST", "OPTIONS"])
def remove_student():
    """API endpoint to remove a student directly (without subprocess)"""
    global embeddings_db
    
    # Handle preflight request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        data = request.get_json(force=True)
    except Exception as e:
        return jsonify({"success": False, "message": f"Invalid request data: {str(e)}"}), 400
    
    if not data:
        return jsonify({"success": False, "message": "No data received"}), 400
    
    student_id = data.get("student_id", "").strip()
    
    if not student_id:
        return jsonify({"success": False, "message": "Student ID is required"}), 400
    
    try:
        removed_db = remove_student_from_embeddings(student_id)
        removed_csv = remove_student_from_csv(student_id)
        
        if removed_db or removed_csv:
            # Refresh the cached embeddings
            embeddings_db = load_embeddings()
            return jsonify({
                "success": True, 
                "message": f"Student {student_id} removed successfully"
            })
        else:
            return jsonify({
                "success": False, 
                "message": "Student ID not found"
            }), 404
            
    except Exception as e:
        return jsonify({"success": False, "message": f"Removal error: {str(e)}"}), 500
            
    except subprocess.TimeoutExpired:
        process.kill()
        return jsonify({"success": False, "message": "Process timed out"}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/start-attendance", methods=["POST", "OPTIONS"])
def start_attendance():
    """API endpoint to start attendance recognition on the server"""
    global attendance_process, is_recognition_active, is_streaming, marked_attendance
    
    # Handle preflight request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    # Use web-based streaming
    is_streaming = True
    get_camera()
    
    # Load face recognition model
    try:
        load_face_recognition()
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to load model: {str(e)}"}), 500
    
    # Clear previous session's marked attendance
    marked_attendance.clear()
    
    is_recognition_active = True
    
    return jsonify({
        "success": True, 
        "message": "Attendance system started! Camera feed is now live on the webpage."
    })

@app.route("/api/stop-attendance", methods=["POST", "OPTIONS"])
def stop_attendance():
    """API endpoint to stop attendance recognition"""
    global attendance_process, is_recognition_active, marked_attendance
    
    # Handle preflight request
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    # Stop recognition mode
    is_recognition_active = False
    
    # Clear marked attendance for next session (optional)
    # marked_attendance.clear()
    
    if attendance_process is not None and attendance_process.poll() is None:
        try:
            attendance_process.terminate()
            attendance_process = None
        except:
            pass
    
    return jsonify({"success": True, "message": "Attendance recognition stopped"})


@app.route("/api/video-feed")
def video_feed():
    """Video streaming route for the camera feed"""
    global is_streaming
    is_streaming = True
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route("/api/start-camera", methods=["POST", "OPTIONS"])
def start_camera():
    """Start camera streaming"""
    global is_streaming
    
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    is_streaming = True
    get_camera()  # Initialize camera
    return jsonify({"success": True, "message": "Camera started"})


@app.route("/api/stop-camera", methods=["POST", "OPTIONS"])
def stop_camera():
    """Stop camera streaming"""
    global is_streaming
    
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    is_streaming = False
    release_camera()
    return jsonify({"success": True, "message": "Camera stopped"})


@app.route("/api/start-recognition", methods=["POST", "OPTIONS"])
def start_recognition():
    """Start face recognition mode"""
    global is_recognition_active, is_streaming, marked_attendance
    
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    # Ensure camera is streaming
    is_streaming = True
    get_camera()
    
    # Load face recognition model
    try:
        load_face_recognition()
    except Exception as e:
        return jsonify({"success": False, "message": f"Failed to load model: {str(e)}"}), 500
    
    # Clear previous session's marked attendance
    marked_attendance.clear()
    
    is_recognition_active = True
    return jsonify({"success": True, "message": "Face recognition started"})


@app.route("/api/stop-recognition", methods=["POST", "OPTIONS"])
def stop_recognition():
    """Stop face recognition mode (keep camera streaming)"""
    global is_recognition_active
    
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    is_recognition_active = False
    return jsonify({"success": True, "message": "Face recognition stopped"})


@app.route("/api/camera-status")
def camera_status():
    """Get current camera and recognition status"""
    global is_streaming, is_recognition_active
    return jsonify({
        "camera_active": is_streaming,
        "recognition_active": is_recognition_active,
        "marked_count": len(marked_attendance)
    })


@app.route("/api/clear-attendance", methods=["POST", "OPTIONS"])
def clear_attendance():
    """Clear today's attendance records"""
    global marked_attendance
    
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    
    try:
        # Clear the in-memory marked attendance set
        marked_attendance.clear()
        
        # Optionally clear the CSV file (create backup first)
        if os.path.exists(ATTENDANCE_CSV):
            # Create backup
            backup_path = ATTENDANCE_CSV.replace(".csv", f"_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv")
            os.rename(ATTENDANCE_CSV, backup_path)
            
            # Create new empty file with header
            with open(ATTENDANCE_CSV, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                # Don't write header as original file didn't have one
        
        return jsonify({
            "success": True,
            "message": "Attendance cleared successfully"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error clearing attendance: {str(e)}"
        }), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
