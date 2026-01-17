import argparse
import csv
from datetime import datetime
from pathlib import Path
import sys

from verification.cue_verification import verify


def _to_list_str(value) -> str:
	if not value:
		return ""
	if isinstance(value, (list, tuple)):
		return ";".join(str(v) for v in value)
	return str(value)


def main() -> int:
	parser = argparse.ArgumentParser(description="Verify a local image and log results to CSV")
	parser.add_argument("--file", "-f", default="test.jpeg", help="Path to the image file (JPEG)")
	parser.add_argument("--label", "-l", default="pork belly", help="Proposed user-confirmed label")
	parser.add_argument("--out", default=str(Path("out") / "verifier_log.csv"), help="CSV log file path")
	args = parser.parse_args()

	path = Path(args.file)
	if not path.exists():
		print(f"Error: file not found: {path}")
		# Still write a log entry indicating the issue
		_write_csv(args.out, {
			"timestamp": datetime.utcnow().isoformat(),
			"file": str(path),
			"label": args.label,
			"action": "error",
			"reason": f"file not found",
			"verdict": "",
			"confidence": "",
			"flags": "",
			"observed_features": "",
			"contradictions": "",
		})
		return 1

	try:
		img_bytes = path.read_bytes()
		res = verify(img_bytes, args.label)
	except Exception as e:
		# Log error case and surface message, do not crash
		print(f"verification error: {e}")
		_write_csv(args.out, {
			"timestamp": datetime.utcnow().isoformat(),
			"file": str(path),
			"label": args.label,
			"action": "error",
			"reason": str(e),
			"verdict": "",
			"confidence": "",
			"flags": "",
			"observed_features": "",
			"contradictions": "",
		})
		return 1

	# Print concise result to console
	print(res.action)
	print(res.reason)
	print("verdict:", getattr(res, "verdict", ""), "conf:", getattr(res, "confidence", ""))
	print("flags:", getattr(res, "flags", []))
	print("cues:", getattr(res, "cues", []))
	print("contradictions:", getattr(res, "contradictions", []))

	# Append to CSV log
	_write_csv(args.out, {
		"timestamp": datetime.utcnow().isoformat(),
		"file": str(path),
		"label": args.label,
		"action": getattr(res, "action", ""),
		"reason": getattr(res, "reason", ""),
		"verdict": getattr(res, "verdict", ""),
		"confidence": getattr(res, "confidence", ""),
		"flags": _to_list_str(getattr(res, "flags", [])),
		"observed_features": _to_list_str(getattr(res, "observed_features", [])),
		"contradictions": _to_list_str(getattr(res, "contradictions", [])),
	})

	return 0


def _write_csv(csv_path: str | Path, row: dict) -> None:
	out_path = Path(csv_path)
	out_path.parent.mkdir(parents=True, exist_ok=True)
	fieldnames = [
		"timestamp",
		"file",
		"label",
		"action",
		"reason",
		"verdict",
		"confidence",
		"flags",
		"observed_features",
		"contradictions",
	]
	write_header = not out_path.exists()
	with out_path.open("a", newline="", encoding="utf-8") as f:
		writer = csv.DictWriter(f, fieldnames=fieldnames)
		if write_header:
			writer.writeheader()
		writer.writerow(row)


if __name__ == "__main__":
	raise SystemExit(main())
