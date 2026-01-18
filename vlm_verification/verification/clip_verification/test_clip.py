import os
from pathlib import Path

from web_retriever import fetch_and_rank_web_images
from dotenv import load_dotenv
load_dotenv()

def main():
    assert os.environ.get("GOOGLE_CSE_API_KEY"), "Missing GOOGLE_CSE_API_KEY"
    assert os.environ.get("GOOGLE_CSE_CX"), "Missing GOOGLE_CSE_CX"

    query_path = Path("test.jpeg")
    query_bytes = query_path.read_bytes()

    proposed_label = "test"  

    ranked = fetch_and_rank_web_images(
        query_image=query_bytes,
        proposed_label=proposed_label,
        n_web=5,     
        top_k=5      
    )

    print(f"Label: {proposed_label}")
    print(f"Returned {len(ranked)} ranked web images:\n")

    for i, r in enumerate(ranked, 1):
        print(f"[{i}] score={r.score:.4f} type={r.content_type}")
        print(f"    url={r.url}\n")


if __name__ == "__main__":
    main()
