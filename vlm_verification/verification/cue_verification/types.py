from dataclasses import dataclass
from typing import List, Literal

Verdict = Literal["likely_correct", "uncertain", "likely_incorrect"]
Action = Literal["accept", "reject"]

@dataclass
class Decision:
    action: Action
    reason: str

    # Optional debug fields (useful for logging; safe to ignore)
    verdict: Verdict = "uncertain"
    confidence: float = 0.0
    flags: List[str] = None
    cues: List[str] = None
    contradictions: List[str] = None