import json
import os
from typing import Any

from google import genai
from google.genai import types
from supabase import create_client

try:
  from dotenv import load_dotenv
  load_dotenv()
except Exception:
  pass

MODEL_NAME = "gemini-1.5-flash"

SPECIFICITY_PROMPT = """
You are labeling an image for a recommendation system.
Return exactly 3 labels as a JSON array of strings.
Labels should be specific enough to identify unique items, but not so specific
that every object becomes a unique label.
Include key distinguishing attributes (type, style, material, color, brand if
clearly visible). Avoid serial numbers, timestamps, and overly long descriptions.
Each label should be 2-6 words.
""".strip()

_model = None
_supabase = None


def generate_labels_for_image_uuid(image_uuid: str) -> list[str]:
  image = _fetch_image_for_uuid(image_uuid)
  client = _get_model()
  contents = [
    SPECIFICITY_PROMPT,
    types.Part.from_bytes(data=image, mime_type="image/jpeg"),
  ]
  response = client.models.generate_content(
    model=MODEL_NAME,
    contents=contents,
  )
  return _parse_labels(response.text or "")


def _get_model() -> genai.Client:
  global _model
  if _model is None:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
      raise ValueError("GEMINI_API_KEY is not set.")
    _model = genai.Client(api_key=api_key)
  return _model


def _fetch_image_for_uuid(image_uuid: str) -> Any:
  client = _get_supabase_client()
  record = (
    client.table("submissions")
    .select("image_path")
    .eq("id", image_uuid)
    .single()
    .execute()
  )
  data = record.data or {}
  image_path = data.get("image_path")
  if not image_path:
    raise ValueError(f"No image_path found for {image_uuid}.")
  storage = client.storage.from_("submissions")
  return storage.download(image_path)


def _get_supabase_client():
  global _supabase
  if _supabase is None:
    supabase_url = os.getenv("supabase_api")
    supabase_key = os.getenv("supabase_key")
    if not supabase_url or not supabase_key:
      raise ValueError("supabase_api or supabase_key is not set.")
    _supabase = create_client(supabase_url, supabase_key)
  return _supabase


def _parse_labels(text: str) -> list[str]:
  try:
    labels = json.loads(text)
    if isinstance(labels, list):
      return [str(label).strip() for label in labels][:3]
  except json.JSONDecodeError:
    pass
  cleaned = [label.strip() for label in text.replace("\n", ",").split(",")]
  return [label for label in cleaned if label][:3]
