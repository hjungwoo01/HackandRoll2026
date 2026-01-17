import io
from PIL import Image

from .config import VerificationConfig
from .types import Decision
from .client_gemini import GeminiVLMClient
from .prompts import feature_extraction_prompt, claim_verification_prompt
from .parsers import extract_first_json, normalize_list
from .policies import decide


def _load_jpeg(jpeg_bytes: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(jpeg_bytes))
    if img.format != "JPEG":
        raise ValueError(f"Expected JPEG, got {img.format}")
    return img.convert("RGB")


class DeepVerifier:
    """
    Public API:
      - verify(jpeg_bytes, proposed_label) -> Decision
    """

    def __init__(self, config: VerificationConfig | None = None):
        self.config = config or VerificationConfig()
        self.vlm = GeminiVLMClient(model_name=self.config.model_name)

    def verify(self, jpeg_bytes: bytes, proposed_label: str) -> Decision:
        img = _load_jpeg(jpeg_bytes)

        last_err = None
        for _ in range(self.config.max_retries + 1):
            try:
                feat_txt = self.vlm.generate_json(feature_extraction_prompt(), img)
                feat = extract_first_json(feat_txt)
                cues = normalize_list(feat.get("primary_subject_cues"))
                flags = normalize_list(feat.get("quality_flags"))

                ver_prompt = claim_verification_prompt(proposed_label, cues, flags)
                ver_txt = self.vlm.generate_json(ver_prompt, img)
                ver = extract_first_json(ver_txt)

                verdict = str(ver.get("verdict", "uncertain")).strip()
                confidence = float(ver.get("confidence", 0.0))
                contradictions = normalize_list(ver.get("contradictions"))
                reject_reason = str(ver.get("reject_reason", "")).strip()

                ok, reason = decide(
                    verdict=verdict,
                    confidence=confidence,
                    flags=flags,
                    contradictions=contradictions,
                    reject_reason=reject_reason,
                    min_accept_conf=self.config.min_accept_confidence,
                )

                return Decision(
                    action="accept" if ok else "reject",
                    reason=reason,
                    verdict=verdict if verdict in ("likely_correct", "uncertain", "likely_incorrect") else "uncertain",
                    confidence=confidence,
                    flags=flags,
                    cues=cues,
                    contradictions=contradictions,
                )
            except Exception as e:
                last_err = e

        # Fail closed to protect dataset
        return Decision(
            action="reject",
            reason=f"Rejected: verification error ({last_err}). Please try again.",
            verdict="uncertain",
            confidence=0.0,
            flags=["verification_error"],
            cues=[],
            contradictions=[],
        )
