import io
import json
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Load model
try:
    model = tf.keras.models.load_model("fruit_freshness_model.keras")
    print("TensorFlow model loaded successfully.")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Load class names
try:
    with open("class_names.json", "r") as f:
        class_names = json.load(f)
    print("Class names loaded successfully.")
except Exception as e:
    print(f"Error loading class names: {e}")
    class_names = []

# Initialize FastAPI app
app = FastAPI(
    title="AI-based Food Quality Checking API",
    description="Backend API for predicting fresh vs. rotten status of fruits and vegetables.",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    if model is None:
        return {"status": "error", "message": "TensorFlow model is not loaded."}
    return {"status": "ok", "message": "API is active and model is loaded."}

@app.post("/api/predict")
async def predict_quality(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, processes it, 
    and predicts whether the food item is fresh or rotten.
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Prediction model is not available.")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        # Read file contents and open image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Preprocessing
        img = image.resize((224, 224))
        img_array = np.array(img)
        img_array = np.expand_dims(img_array, axis=0)

        # Prediction
        predictions = model.predict(img_array, verbose=0)
        predicted_index = np.argmax(predictions)
        confidence = float(np.max(predictions))
        predicted_class = class_names[predicted_index]

        # Parse fresh/rotten status and food name
        parts = predicted_class.split("_", 1)
        quality = parts[0]
        food = parts[1] if len(parts) > 1 else "unknown"

        # Get top 5 predicted classes
        top_indices = np.argsort(predictions[0])[-5:][::-1]
        probabilities = []
        for idx in top_indices:
            probabilities.append({
                "class_name": class_names[idx],
                "display_name": class_names[idx].replace("_", " ").title(),
                "probability": float(predictions[0][idx])
            })

        return {
            "predicted_class": predicted_class,
            "quality": quality,
            "food": food.capitalize(),
            "confidence": confidence,
            "probabilities": probabilities
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
