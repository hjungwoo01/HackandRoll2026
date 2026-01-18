def feature_extraction_prompt() -> str:
    return """
You are a strict visual cue extractor for verification.

ATTENTION SCOPE:
Focus ONLY on the PRIMARY SUBJECT: the foreground item the user intended to submit.
Ignore background, containers, surfaces, hands, and surrounding objects unless they contain identifying information printed on the primary subject itself.

Task:
Extract directly observable cues about the primary subject. Do NOT name the object.

Return ONLY valid JSON:
{
  "primary_subject_cues": ["..."],        // 6-12 short factual cues
  "quality_flags": ["too_far","too_blurry","occluded","glare","low_light","cropped","multiple_objects"]
}

Rules:
- Cues must be directly observable (shape, material, markings/text, parts, texture, distinctive patterns).
- No speculation. No object naming.
- quality_flags should include any that apply; otherwise [].
""".strip()


def claim_verification_prompt(proposed_label: str, cues: list[str], flags: list[str]) -> str:
    return f"""
You are a deep verification module for a crowdsourced real-world object collection app.

Context:
- Upstream steps already filtered obvious issues (e.g., photo-of-screen, extreme low quality).
- This step is used only for controversial submissions after community disagreement.

Task:
Verify the proposed label as a HYPOTHESIS.
Your job is NOT to re-classify freely; your job is to decide whether the image provides enough visual evidence to support the proposed label.

ATTENTION SCOPE:
Use ONLY the provided primary_subject_cues. Do NOT introduce background details.

Proposed label (hypothesis): "{proposed_label}"
primary_subject_cues: {cues}
quality_flags: {flags}

Return ONLY valid JSON:
{{
  "verdict": "likely_correct" | "uncertain" | "likely_incorrect",
  "confidence": 0.0-1.0,
  "contradictions": ["..."],                // 0-6 items, must refer to cues above
  "reject_reason": ""                       // If rejecting/uncertain, short actionable instruction (<=160 chars)
}}

Decision rules:
- Choose verdict=likely_correct only if there are at least 2 concrete supporting cues and no strong contradictions.
- If evidence is insufficient or ambiguous for this label, choose verdict=uncertain.
- If any quality_flags make verification unreliable, set verdict=uncertain and provide reject_reason requesting a better photo (closer, better lighting, readable markings, different angle, both sides, include scale).
- If verdict is likely_incorrect or uncertain, reject_reason must be a short, actionable user-facing instruction (max 160 chars).
""".strip()
