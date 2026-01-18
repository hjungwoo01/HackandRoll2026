import os
from PIL import Image
from google import genai
from dotenv import load_dotenv
load_dotenv()

class GeminiVLMClient:
    def __init__(self, model_name: str):
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY env var not set.")
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    def generate_json(self, prompt: str, image: Image.Image) -> str:
        resp = self.client.models.generate_content(
            model=self.model_name,
            contents=[prompt, image],
        )
        return (resp.text or "").strip()
