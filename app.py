import streamlit as st
import tensorflow as tf
import numpy as np
import json
from PIL import Image

# Page configuration
st.set_page_config(
    page_title="AI-based Food Quality Checking",
    page_icon="🍎",
    layout="centered"
)

# Load model
@st.cache_resource
def load_model():
    try:
        return tf.keras.models.load_model("fruit_freshness_model.keras")
    except Exception as e:
        st.error(f"Error loading TensorFlow model: {e}")
        return None

model = load_model()

# Load class names
try:
    with open("class_names.json", "r") as f:
        class_names = json.load(f)
except Exception as e:
    st.error(f"Error loading class names: {e}")
    class_names = []

st.title("🍎 AI-based Food Quality Checking")
st.write(
    "Upload an image of a fruit or vegetable to determine "
    "whether it is **fresh** or **rotten**."
)

if model is None or not class_names:
    st.warning("Application is not fully loaded. Please check that model and class names files exist.")
else:
    uploaded_file = st.file_uploader(
        "Choose an image...",
        type=["jpg", "jpeg", "png"]
    )

    if uploaded_file is not None:
        try:
            image = Image.open(uploaded_file).convert("RGB")

            st.image(image, caption="Uploaded Image", use_container_width=True)

            # Preprocessing
            img = image.resize((224, 224))
            img_array = np.array(img)
            img_array = np.expand_dims(img_array, axis=0)

            # Prediction
            predictions = model.predict(img_array, verbose=0)

            predicted_index = np.argmax(predictions)
            confidence = np.max(predictions)

            predicted_class = class_names[predicted_index]

            quality, food = predicted_class.split("_", 1)

            st.subheader("Prediction")

            if quality == "fresh":
                st.success(
                    f"✅ Fresh {food.capitalize()}\n\n"
                    f"Confidence: {confidence:.2%}"
                )
            else:
                st.error(
                    f"❌ Rotten {food.capitalize()}\n\n"
                    f"Confidence: {confidence:.2%}"
                )

            st.subheader("Class Probabilities")

            top_indices = np.argsort(predictions[0])[-5:][::-1]

            for idx in top_indices:
                st.write(
                    f"**{class_names[idx].replace('_', ' ').title()}**: "
                    f"{predictions[0][idx]:.2%}"
                )
        except Exception as e:
            st.error(f"Error processing image: {e}")

st.markdown("---")
st.markdown(
    "Developed using **TensorFlow**, **MobileNetV2**, "
    "and **Streamlit**."
)
