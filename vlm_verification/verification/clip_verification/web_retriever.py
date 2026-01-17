from __future__ import annotations

import mimetypes
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union
from urllib.parse import urlencode
from dotenv import load_dotenv
load_dotenv()

import numpy as np
import requests
from PIL import Image

from .clip_similarity import ClipTFEmbedder


ImageLike = Union[str, bytes, Image.Image]  # path | bytes | PIL


@dataclass
class WebImage:
    url: str
    content_type: str
    data: bytes


@dataclass
class RankedWebImage:
    url: str
    content_type: str
    score: float
    data: bytes


class GoogleCSEImageFetcher:

    def __init__(
        self,
        api_key: Optional[str] = os.environ.get("GOOGLE_CSE_API_KEY"),
        cx: Optional[str] = os.environ.get("GOOGLE_CSE_CX"),
        timeout_sec: int = 10,
        max_bytes: int = 4_000_000,  # 4MB
        safe: str = "active",
    ):
        self.api_key = api_key or os.environ.get("GOOGLE_CSE_API_KEY")
        self.cx = cx or os.environ.get("GOOGLE_CSE_CX")
        if not self.api_key or not self.cx:
            raise RuntimeError("Missing GOOGLE_CSE_API_KEY or GOOGLE_CSE_CX env vars.")
        self.timeout_sec = timeout_sec
        self.max_bytes = max_bytes
        self.safe = safe

        self.sess = requests.Session()
        self.sess.headers.update(
            {
                "User-Agent": "RareDexCSEFetcher/1.0",
                "Accept": "application/json",
            }
        )

    def search_image_urls(self, query: str, num: int = 5) -> List[str]:
        num = max(1, min(num, 10))
        params = {
            "key": self.api_key,
            "cx": self.cx,
            "q": query,
            "searchType": "image",
            "num": num,
            "safe": self.safe,
        }
        url = "https://www.googleapis.com/customsearch/v1?" + urlencode(params)
        r = self.sess.get(url, timeout=self.timeout_sec)
        r.raise_for_status()
        data = r.json()
        items = data.get("items", []) or []
        return [it.get("link") for it in items if it.get("link")]

    def _download(self, url: str) -> Optional[WebImage]:
        try:
            r = self.sess.get(url, stream=True, timeout=self.timeout_sec, headers={"Accept": "image/*,*/*"})
            r.raise_for_status()

            ctype = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()

            # fallback if missing
            if not ctype:
                guess, _ = mimetypes.guess_type(url)
                ctype = (guess or "").lower()

            if not ctype.startswith("image/"):
                return None

            buf = b""
            for chunk in r.iter_content(chunk_size=64 * 1024):
                if not chunk:
                    continue
                buf += chunk
                if len(buf) > self.max_bytes:
                    return None

            return WebImage(url=url, content_type=ctype, data=buf)
        except Exception:
            return None

    def fetch_top_images(self, query: str, n: int = 10, oversample: int = 2) -> List[WebImage]:

        urls = self.search_image_urls(query, num=min(10, max(n * oversample, n)))
        out: List[WebImage] = []
        seen = set()

        for u in urls:
            if u in seen:
                continue
            seen.add(u)

            img = self._download(u)
            if img is None:
                continue

            out.append(img)
            if len(out) >= n:
                break

        return out

def fetch_and_rank_web_images(
    query_image: ImageLike,
    proposed_label: str,
    n_web: int = 10,
    top_k: int = 5,
    fetcher: Optional[GoogleCSEImageFetcher] = None,
    clip: Optional[ClipTFEmbedder] = None,
) -> List[RankedWebImage]:
    
    fetcher = fetcher or GoogleCSEImageFetcher()
    clip = clip or ClipTFEmbedder()

    web_imgs = fetcher.fetch_top_images(proposed_label, n=n_web)
    if not web_imgs:
        return []

    ref_bytes = [w.data for w in web_imgs]
    scores = clip.similarity(query_image, ref_bytes)

    # rank
    idx = np.argsort(-scores)[: min(top_k, len(scores))]
    ranked: List[RankedWebImage] = []
    for i in idx:
        w = web_imgs[int(i)]
        ranked.append(
            RankedWebImage(
                url=w.url,
                content_type=w.content_type,
                score=float(scores[int(i)]),
                data=w.data,
            )
        )
    return ranked