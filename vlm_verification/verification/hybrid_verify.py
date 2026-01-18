from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class HybridResult:
    accept: bool
    reason: str
    debug: Dict[str, Any]


def hybrid_verify(
    jpeg_bytes: bytes,
    proposed_label: str,
    *,
    vlm_verify,  
    fetch_and_rank_web_images=None,  
    n_web: int = 10,
    top_k: int = 2,
    clip_extreme_mismatch: float = 0.18,
    clip_strong_match: float = 0.70,
    enable_web_on_accept: bool = False,  
) -> HybridResult:
    """
    Hybrid verification:
      - Primary: Gemini VLM verification
      - Secondary: web+CLIP only as weak consistency check
    """

    # ---- A) Primary decision: VLM ----
    vlm_res = vlm_verify(jpeg_bytes, proposed_label)
    vlm_accept = getattr(vlm_res, "action", "reject") == "accept"

    debug: Dict[str, Any] = {
        "vlm": {
            "action": getattr(vlm_res, "action", None),
            "verdict": getattr(vlm_res, "verdict", None),
            "confidence": getattr(vlm_res, "confidence", None),
            "flags": getattr(vlm_res, "flags", None),
            "contradictions": getattr(vlm_res, "contradictions", None),
            "cues": getattr(vlm_res, "cues", None),
            "reason": getattr(vlm_res, "reason", None),
        }
    }

    # If accepted, optionally run web check only to log (not override)
    if vlm_accept:
        if enable_web_on_accept and fetch_and_rank_web_images is not None:
            ranked = fetch_and_rank_web_images(
                query_image=jpeg_bytes,
                proposed_label=proposed_label,
                n_web=n_web,
                top_k=top_k,
            )
            debug["web_clip"] = {
                "top": [{"score": r.score, "url": r.url} for r in ranked],
                "max_score": max([r.score for r in ranked], default=None),
            }
        return HybridResult(accept=True, reason=getattr(vlm_res, "reason", "Accepted."), debug=debug)

    # If rejected and no web module provided, return VLM result as-is
    if fetch_and_rank_web_images is None:
        return HybridResult(accept=False, reason=vlm_res.reason, debug=debug)

    # ---- B) Secondary: weak web+CLIP consistency ----
    ranked = fetch_and_rank_web_images(
        query_image=jpeg_bytes,
        proposed_label=proposed_label,
        n_web=n_web,
        top_k=top_k,
    )
    max_sim = max([r.score for r in ranked], default=0.0)

    debug["web_clip"] = {
        "top": [{"score": r.score, "url": r.url} for r in ranked],
        "max_score": max_sim,
    }

    # Case 1: Extreme mismatch => label likely wrong (stronger reject)
    if max_sim > 0.0 and max_sim < clip_extreme_mismatch:
        reason = (
            "Rejected: the image does not resemble typical examples of the proposed label. "
            "Please choose a different label or submit a clearer photo of the item alone."
        )
        return HybridResult(accept=False, reason=reason, debug=debug)

    # Case 2: Strong match => label plausible but VLM couldn't verify => ask for better evidence
    if max_sim >= clip_strong_match:
        reason = (
            "Rejected: the label seems plausible, but the photo lacks enough verifiable detail. "
            "Please retake a closer image with distinguishing markings/features clearly visible "
            "(e.g., multiple angles, both sides, readable text/marks)."
        )
        return HybridResult(accept=False, reason=reason, debug=debug)

    # Case 3: Middle zone => keep VLM reason (minimal web influence)
    return HybridResult(accept=False, reason=vlm_res.reason, debug=debug)
