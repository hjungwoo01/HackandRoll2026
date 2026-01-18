from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from verification.entrypoint import verify_submission


def main():
    img = Path("test.jpeg").read_bytes()
    label = "cooked pork jowl"

    res = verify_submission(
        image_bytes=img,
        proposed_label=label,
        is_controversial=True,
        options={"include_debug": True, "n_web": 5, "top_k": 2},
    )

    print(res)


if __name__ == "__main__":
    main()
