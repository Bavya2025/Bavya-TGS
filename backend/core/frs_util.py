import base64
import numpy as np
import cv2
import os
from django.core.files.base import ContentFile
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Load OpenCV HAAR cascades for face detection
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def get_face_encoding_from_image(image_file):
    """
    Detects face and returns a base64 encoded string of the face region (cropped and grayscale)
    """
    try:
        # Read image from file object
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if img is None:
            logger.error("Could not decode image")
            return None
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Apply Histogram Equalization
        gray = cv2.equalizeHist(gray)
        faces = FACE_CASCADE.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            logger.warning("No face detected in enrollment")
            return None
            
        # Take the largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        face_roi = gray[y:y+h, x:x+w]
        
        # Resize to fixed size for consistency
        face_roi = cv2.resize(face_roi, (200, 200))
        
        # Encode as base64 string
        _, buffer = cv2.imencode('.jpg', face_roi)
        return base64.b64encode(buffer).decode('utf-8')
        
    except Exception as e:
        logger.error(f"Error in face encoding: {e}")
        return None

def compare_faces(stored_face_b64, current_image_file, threshold=40):
    """
    Compares current image with stored face using Template Matching or LBPH-like distance.
    Including multi-pass detection for robustness.
    """
    try:
        if not stored_face_b64:
            return False, 1.0, "No enrolled face found"
            
        # Decode stored face
        stored_bytes = base64.b64decode(stored_face_b64)
        stored_arr = np.frombuffer(stored_bytes, dtype=np.uint8)
        stored_face = cv2.imdecode(stored_arr, cv2.IMREAD_GRAYSCALE)
        
        # Process current image
        current_bytes = np.frombuffer(current_image_file.read(), np.uint8)
        current_img = cv2.imdecode(current_bytes, cv2.IMREAD_COLOR)
        
        if current_img is None:
            return False, 1.0, "Could not decode image"
            
        gray = cv2.cvtColor(current_img, cv2.COLOR_BGR2GRAY)
        
        # Multi-pass detection for robustness
        faces = []
        # Pass 1: Standard thorough detection
        faces = FACE_CASCADE.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        
        # Pass 2: If failed, try more tolerant parameters
        if len(faces) == 0:
            faces = FACE_CASCADE.detectMultiScale(gray, 1.05, 3, minSize=(30, 30))
            
        # Pass 3: If still failed, try strict but smaller scale
        if len(faces) == 0:
            faces = FACE_CASCADE.detectMultiScale(gray, 1.2, 2, minSize=(20, 20))
        
        if len(faces) == 0:
            logger.warning("No face detected in verification capture after all passes")
            return False, 1.0, "No face detected. Please ensure you are in a well-lit area and look directly at the camera."
            
        # Get the largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        current_face = gray[y:y+h, x:x+w]
        current_face = cv2.resize(current_face, (200, 200))
        
        # Pre-processing
        current_face = cv2.equalizeHist(current_face)
        current_face = cv2.GaussianBlur(current_face, (5, 5), 0)
        stored_face_blurred = cv2.GaussianBlur(stored_face, (5, 5), 0)
        
        # Template Matching
        result = cv2.matchTemplate(current_face, stored_face_blurred, cv2.TM_CCOEFF_NORMED)
        _, match_val, _, _ = cv2.minMaxLoc(result)
        
        logger.info(f"FRS Match Value: {match_val:.4f}")
        
        # Match threshold
        is_match = match_val > 0.55
        
        return is_match, float(1.0 - match_val), None
        
    except Exception as e:
        logger.error(f"Error in face comparison: {e}")
        return False, 1.0, str(e)

def base64_to_file(base64_string, filename):
    """
    Converts a base64 string to a ContentFile.
    """
    try:
        if 'base64,' in base64_string:
            format, imgstr = base64_string.split('base64,')
        else:
            imgstr = base64_string
        
        data = ContentFile(base64.b64decode(imgstr), name=filename)
        return data
    except Exception as e:
        logger.error(f"Error converting base64 to file: {e}")
        return None
