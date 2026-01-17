from .verifier import DeepVerifier
from .types import Decision

_default = DeepVerifier()

def verify(jpeg_bytes: bytes, proposed_label: str) -> Decision:
    return _default.verify(jpeg_bytes, proposed_label)
