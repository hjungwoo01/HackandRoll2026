import argparse
from pathlib import Path
import sys

# Ensure repository root is on sys.path so package imports work
sys.path.append(str(Path(__file__).resolve().parents[1]))
from verification import verify

def main() -> int:
    parser = argparse.ArgumentParser(description="Run verifier on a single image")
    parser.add_argument("file", help="Path to the image file (JPEG)")
    parser.add_argument("label", help="Proposed user-confirmed label")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"Error: file not found: {path}")
        return 1

    jpeg_bytes = path.read_bytes()
    res = verify(jpeg_bytes, args.label)

    # Print concise result
    print(f"file: {path}")
    print(f"proposed_label: {args.label}")
    print(f"accept: {getattr(res, 'accept', None)}")
    print(f"reason: {getattr(res, 'reason', '')}")

    debug = getattr(res, 'debug', {}) or {}
    verdict = debug.get("verdict", getattr(res, "verdict", None))
    confidence = debug.get("confidence", getattr(res, "confidence", None))
    flags = ",".join(debug.get("flags", getattr(res, "flags", [])))
    print(f"verdict: {verdict}")
    print(f"confidence: {confidence}")
    print(f"flags: {flags}")
    cues = getattr(res, "cues", [])
    print(f"cues: {cues}")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())