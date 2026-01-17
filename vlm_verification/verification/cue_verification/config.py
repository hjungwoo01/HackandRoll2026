from dataclasses import dataclass
import os

@dataclass
class VerificationConfig:
    model_name: str = os.environ.get("GEMINI_VLM_MODEL", "gemini-2.5-flash")
    min_accept_confidence: float = float(os.environ.get("VERIFY_MIN_CONF", "0.75"))
    max_retries: int = int(os.environ.get("VERIFY_MAX_RETRIES", "1"))
