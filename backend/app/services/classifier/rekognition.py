import boto3
import os
from typing import Any

from app.services.classifier.base import ClassifierService, ClassificationResult

# Mapping from common AWS Rekognition labels to our IncidentType enum values
REKOGNITION_TO_INCIDENT_TYPE = {
    "Fire": "fire",
    "Flame": "fire",
    "Smoke": "fire",
    "Wildfire": "fire",
    "Flood": "flood",
    "Water": "flood",
    "Storm": "cyclone",
    "Hurricane": "cyclone",
    "Cyclone": "cyclone",
    "Typhoon": "cyclone",
    "Tornado": "tornado",
    "Earthquake": "earthquake",
    "Tsunami": "tsunami",
    "Structural Damage": "structural_damage",
    "Rubble": "structural_damage",
    "Debris": "structural_damage",
    "Ruin": "structural_damage",
    "Building Collapse": "structural_damage",
}

class RekognitionClassifierService(ClassifierService):
    def __init__(self):
        self.client = boto3.client('rekognition', region_name='ap-south-2')
        self.bucket = "cloudrelief-images-hyderabad-2026"

    def classify_image(self, image_path: str) -> ClassificationResult:
        # image_path is typically the S3 object key (e.g., 'incidents/1234-abcd.jpg')
        # We assume the image is available in the bucket
        try:
            response = self.client.detect_labels(
                Image={
                    'S3Object': {
                        'Bucket': self.bucket,
                        'Name': image_path
                    }
                },
                MaxLabels=10,
                MinConfidence=50.0
            )
        except Exception as e:
            print(f"AWS Rekognition Error: {e}")
            return ClassificationResult(label="normal", confidence=0.0)

        highest_confidence_disaster = "normal"
        highest_confidence_score = 0.0

        for label in response.get('Labels', []):
            name = label.get('Name')
            confidence = label.get('Confidence', 0.0)
            
            if name in REKOGNITION_TO_INCIDENT_TYPE:
                # We found a matching disaster label
                mapped_type = REKOGNITION_TO_INCIDENT_TYPE[name]
                if confidence > highest_confidence_score:
                    highest_confidence_score = confidence
                    highest_confidence_disaster = mapped_type

        # Convert AWS percentage score (0-100) to our score (0.0-1.0)
        final_score = highest_confidence_score / 100.0

        return ClassificationResult(
            label=highest_confidence_disaster,
            confidence=final_score
        )
