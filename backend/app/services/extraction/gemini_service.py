from app.schemas.extraction import ExtractionResult

class GeminiExtractionService:
    def __init__(self):
        # Initialize Gemini API client here
        pass

    def extract_from_image(self, image_path: str) -> ExtractionResult:
        """
        Placeholder for AI extraction logic.
        Will take an image, pass to Gemini Vision, and return structured Pydantic object.
        """
        raise NotImplementedError("Extraction logic not yet implemented")
