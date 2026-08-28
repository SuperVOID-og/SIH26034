import logging
import os
import mimetypes
from typing import List
from google import genai
from google.genai import types
from pydantic import ValidationError

from app.schemas.extraction import PackageDeclarations
from app.core.config import settings

logger = logging.getLogger(__name__)

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

        # Load images from disk as raw bytes. Never fetch via HTTP.
        image_parts: List[types.Part] = []
        for rel_path in relative_image_paths:
            # Enforce relative path — resolve against storage root only.
            # Strip any leading slash to prevent traversal attacks.
            safe_rel = rel_path.lstrip("/").lstrip("\\")
            abs_path = os.path.normpath(
                os.path.join(settings.LOCAL_STORAGE_DIR, safe_rel.replace("/", os.sep))
            )
            # Guard against path traversal escaping the storage root
            storage_root = os.path.normpath(settings.LOCAL_STORAGE_DIR)
            if not abs_path.startswith(storage_root):
                raise GeminiExtractionError(f"Path traversal detected: {rel_path}")
            if not os.path.exists(abs_path):
                raise GeminiExtractionError(f"Image not found on disk: {rel_path}")
            try:
                # Detect MIME type from extension; default to jpeg
                mime_type = mimetypes.guess_type(abs_path)[0] or "image/jpeg"
                with open(abs_path, "rb") as f:
                    image_bytes = f.read()
                image_parts.append(
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                )
            except GeminiExtractionError:
                raise
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
        5. If a field is missing or unreadable, set value to null and confidence to UNKNOWN.
        6. For 'source_images', provide an empty list — the application will populate it.
        7. Provide an honest confidence level: HIGH, MEDIUM, LOW, or UNKNOWN.
        """

        try:
            # Use response_json_schema with the config dict form.
            # response_json_schema accepts a standard JSON Schema dict and does NOT
            # trigger automatic function calling (AFC) detection in google-genai v2.x.
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt, *image_parts],
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": PackageDeclarations.model_json_schema(),
                }
            )

            # Parse the returned JSON text
            if not response.text:
                raise GeminiExtractionError("Gemini returned an empty response.")

            result = PackageDeclarations.model_validate_json(response.text)

            # Attach all relative source paths to fields that returned a value
            # (Gemini cannot reliably identify which image each value came from)
            for field_name in result.model_fields:
                field_obj = getattr(result, field_name, None)
                if field_obj is not None and hasattr(field_obj, "value") and field_obj.value is not None:
                    if not field_obj.source_images:
                        field_obj.source_images = relative_image_paths

            return result

        except ValidationError as ve:
            raise GeminiExtractionError(f"Gemini output failed schema validation: {str(ve)}")
        except GeminiExtractionError:
            raise
        except Exception as e:
            # Log class and message for server-side diagnostics.
            # Never log the API key or secrets.
            logger.error("Gemini extraction failed: %s: %s", type(e).__name__, str(e))
            raise GeminiExtractionError(f"Gemini API error ({type(e).__name__}): {str(e)}")
