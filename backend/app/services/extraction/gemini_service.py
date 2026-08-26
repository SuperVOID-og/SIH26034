import os
from typing import List
from PIL import Image
from google import genai
from pydantic import ValidationError

from app.schemas.extraction import PackageDeclarations
from app.core.config import settings

class GeminiExtractionError(Exception):
    pass

class GeminiExtractionService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def extract_from_images(self, relative_image_paths: List[str]) -> PackageDeclarations:
        if not self.client:
            raise GeminiExtractionError("GEMINI_API_KEY is not configured.")

        if not relative_image_paths:
            raise GeminiExtractionError("No images provided for extraction.")

        # Load images
        pil_images = []
        for rel_path in relative_image_paths:
            # We enforce relative paths in the DB
            abs_path = os.path.join(settings.LOCAL_STORAGE_DIR, rel_path.replace("/", os.sep))
            if not os.path.exists(abs_path):
                raise GeminiExtractionError(f"Image not found on disk: {rel_path}")
            try:
                img = Image.open(abs_path)
                # Keep reference to the relative path so the prompt can map it if we wanted to
                pil_images.append(img)
            except Exception as e:
                raise GeminiExtractionError(f"Failed to load image {rel_path}: {str(e)}")

        prompt = """
        You are a highly accurate Optical Character Recognition (OCR) and structured data extraction assistant.
        Analyze the provided images of a product package and extract the required declarations.
        
        CRITICAL RULES:
        1. Extract ONLY visible declarations exactly as they appear.
        2. Do NOT infer, guess, or hallucinate missing values.
        3. Do NOT determine legal compliance.
        4. Do NOT invent Legal Metrology requirements.
        5. If a field is missing or unreadable, set it to null.
        6. For 'source_images', simply provide an empty list if you cannot determine which image it came from, 
           or you can leave it to the application to populate.
        7. Provide an honest confidence level (HIGH, MEDIUM, LOW, UNKNOWN).
        """

        try:
            # Use structured output
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt, *pil_images],
                config={
                    "response_mime_type": "application/json",
                    "response_schema": PackageDeclarations
                }
            )
            
            # The SDK with response_schema should return the parsed object in response.parsed
            # or a JSON string in response.text. Let's parse it safely.
            if hasattr(response, "parsed") and response.parsed:
                parsed_data = response.parsed
                if isinstance(parsed_data, PackageDeclarations):
                    result = parsed_data
                elif isinstance(parsed_data, dict):
                    result = PackageDeclarations(**parsed_data)
                else:
                    raise GeminiExtractionError("Unexpected parsed type from Gemini.")
            else:
                # Fallback to parsing text
                result = PackageDeclarations.model_validate_json(response.text)
                
            # Post-process: Gemini might not reliably know the relative path strings for `source_images`. 
            # We will conservatively assign all provided relative paths to any field that was found, 
            # unless we ask Gemini to map indices, which is often unreliable. 
            # Per instruction: "If multiple images support the same field, either: support a list... or choose the strongest".
            # We'll just attach all source images to non-null fields to ensure evidence linkage is safe.
            for field_name, field_obj in result.__dict__.items():
                if hasattr(field_obj, "value") and field_obj.value is not None:
                    if not field_obj.source_images:
                        field_obj.source_images = relative_image_paths

            return result

        except ValidationError as ve:
            raise GeminiExtractionError(f"Gemini output failed schema validation: {str(ve)}")
        except Exception as e:
            raise GeminiExtractionError(f"Gemini API error: {str(e)}")
