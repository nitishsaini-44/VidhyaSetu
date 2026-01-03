from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
import uvicorn
from recognize_attendance import recognize_face

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Recognition Service")

@app.post("/recognize")
async def recognize(image: UploadFile = File(...)):
    try:
        # Read file as bytes
        image_bytes = await image.read()
        
        # Call the logic
        # Note: recognize_face is synchronous. 
        # For high load, might want to run in threadpool, but for now simple call is fine.
        result = recognize_face(image_bytes)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        # Return 500 but also the error message structure
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

if __name__ == '__main__':
    uvicorn.run(app, host="127.0.0.1", port=5001)
