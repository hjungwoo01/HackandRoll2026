import os
from pathlib import Path

from web_retriever import fetch_and_rank_web_images
from dotenv import load_dotenv
load_dotenv()

def main():
    # 1) Make sure env vars exist
    assert os.environ.get("GOOGLE_CSE_API_KEY"), "Missing GOOGLE_CSE_API_KEY"
    assert os.environ.get("GOOGLE_CSE_CX"), "Missing GOOGLE_CSE_CX"

    # 2) Query image (local)
    query_path = Path("C:\\Users\\cms07\\Hack&Roll\\test_images\\lip_balm.jpg")
    query_bytes = query_path.read_bytes()

    # 3) Proposed label for CSE search
    proposed_label = "NIVEA Moisture lip balm stick"  # change to your label

    # 4) Fetch + CLIP rank
    ranked = fetch_and_rank_web_images(
        query_image=query_bytes,
        proposed_label=proposed_label,
        n_web=5,     # fetch up to 5 web images
        top_k=5      # rank/return up to 5
    )

    print(f"Label: {proposed_label}")
    print(f"Returned {len(ranked)} ranked web images:\n")

    for i, r in enumerate(ranked, 1):
        print(f"[{i}] score={r.score:.4f} type={r.content_type}")
        print(f"    url={r.url}\n")


if __name__ == "__main__":
    main()
