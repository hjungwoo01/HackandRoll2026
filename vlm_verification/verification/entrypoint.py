from __future__ import annotations

from typing import Any, Dict, Optional

from .hybrid_verify import hybrid_verify, HybridResult
from .cue_verification.verifier import DeepVerifier
from .clip_verification.web_retriever import (
    fetch_and_rank_web_images as fetch_and_rank_web_images,
)


def verify_submission(
    image_bytes: bytes,
    proposed_label: str,
    *,
    is_controversial: bool = True,
    options: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Single entrypoint callable from backend/frontend integration layer.

    - If not controversial, returns a skip decision without invoking ML.
    - Otherwise runs the existing hybrid verification pipeline, optionally
      including web retrieval based on options.
    """

    options = options or {}

    # Fast path: not controversial => skip without ML
    if not is_controversial:
        return {
            "decision": "skip",
            "message": "skipped: not controversial",
            "confidence": None,
        }

    # Options
    use_web: bool = bool(options.get("use_web", True))
    include_debug: bool = bool(options.get("include_debug", False))
    n_web: int = int(options.get("n_web", 10))
    top_k: int = int(options.get("top_k", 2))

    # Instantiate VLM-based verifier and run hybrid pipeline
    verifier = DeepVerifier()

    if use_web:
        result = hybrid_verify(
            image_bytes,
            proposed_label,
            vlm_verify=verifier.verify,  
            fetch_and_rank_web_images=fetch_and_rank_web_images,
            n_web=n_web,
            top_k=top_k,
            enable_web_on_accept=False,  # keep web influence minimal
        )
    else:
        result = hybrid_verify(
            image_bytes,
            proposed_label,
            vlm_verify=verifier.verify,  
            fetch_and_rank_web_images=None,  # disable web retriever
            n_web=n_web,
            top_k=top_k,
            enable_web_on_accept=False,
        )

    return _hybrid_result_to_dict(result, include_debug=include_debug)


def _hybrid_result_to_dict(result: HybridResult, *, include_debug: bool) -> Dict[str, Any]:
    """
    Convert HybridResult into a JSON-serializable dict required by callers.
    Pull VLM confidence from the embedded debug if available.
    """
    decision = "accept" if result.accept else "reject"

    # Extract confidence if available from VLM debug
    confidence: Optional[float] = None
    try:
        conf_val = result.debug.get("vlm", {}).get("confidence", None)
        if conf_val is not None:
            confidence = float(conf_val)
    except Exception:
        confidence = None

    out: Dict[str, Any] = {
        "decision": decision,
        "message": result.reason,
        "confidence": confidence,
    }

    if include_debug:
        out["debug"] = result.debug

    return out
