from typing import Tuple

def decide(
    verdict: str,
    confidence: float,
    flags: list[str],
    contradictions: list[str],
    reject_reason: str,
    min_accept_conf: float,
) -> Tuple[bool, str]:
    hard_flags = {"photo_of_screen", "not_live_photo"}
    if any(f in hard_flags for f in flags):
        return False, "Rejected: image appears to be a photo of a screen/another photo. Please take a live picture of the object."

    quality_flags = {"too_far", "too_blurry", "occluded", "low_light", "glare", "cropped"}
    if verdict == "uncertain" and any(f in quality_flags for f in flags):
        return False, "Rejected: photo quality is too low to verify. Move closer, improve lighting, and keep the object centered."

    if verdict == "likely_incorrect":
        return False, reject_reason or "Rejected: visible features contradict the proposed label."

    if verdict == "uncertain":
        return False, reject_reason or "Rejected: cannot confidently verify this label from the image. Try a clearer close-up."

    # likely_correct
    if confidence >= min_accept_conf and len(contradictions) == 0:
        return True, "Accepted: label is consistent with the image."
    return False, "Rejected: verification confidence is too low. Please retake a clearer photo."
