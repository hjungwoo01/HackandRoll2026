from __future__ import annotations

import io
from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple, Union

import numpy as np
from PIL import Image

import torch
from transformers import CLIPModel, CLIPProcessor


ImageLike = Union[str, bytes, Image.Image]  # path | bytes | PIL


@dataclass
class ClipTFConfig:
    model_id: str = "openai/clip-vit-base-patch32"  # good default, small-ish
    device: Optional[str] = None  # "cuda" | "cpu" | None(auto)
    batch_size: int = 16
    use_fp16: bool = True  # if cuda available, speed up


class ClipTFEmbedder:
    """
    Transformers-based CLIP image embedding + similarity.

    Public API:
      - embed_images(images) -> (N, D) L2-normalized embeddings (numpy float32)
      - similarity(query, refs) -> (N,) cosine similarities
      - rank(query, refs, top_k) -> list[(index, score)] sorted desc
    """

    def __init__(self, cfg: ClipTFConfig = ClipTFConfig()):
        self.cfg = cfg
        self.device = self._resolve_device(cfg.device)

        self.processor = CLIPProcessor.from_pretrained(cfg.model_id)
        self.model = CLIPModel.from_pretrained(cfg.model_id)
        self.model.eval()
        self.model.to(self.device)

        # Use fp16 only on CUDA; keep fp32 on CPU
        self.use_fp16 = bool(cfg.use_fp16 and self.device.startswith("cuda"))

    @staticmethod
    def _resolve_device(device: Optional[str]) -> str:
        if device:
            return device
        return "cuda" if torch.cuda.is_available() else "cpu"

    @staticmethod
    def _load_image(img: ImageLike) -> Image.Image:
        if isinstance(img, Image.Image):
            return img.convert("RGB")
        if isinstance(img, bytes):
            return Image.open(io.BytesIO(img)).convert("RGB")
        if isinstance(img, str):
            return Image.open(img).convert("RGB")
        raise TypeError(f"Unsupported image type: {type(img)}")

    @torch.no_grad()
    def embed_images(self, images: Sequence[ImageLike]) -> np.ndarray:
        """
        Returns L2-normalized CLIP image embeddings: (N, D).
        """
        bs = self.cfg.batch_size
        out_chunks = []

        for i in range(0, len(images), bs):
            batch_imgs = [self._load_image(x) for x in images[i : i + bs]]
            inputs = self.processor(images=batch_imgs, return_tensors="pt")

            pixel_values = inputs["pixel_values"].to(self.device)

            if self.use_fp16:
                pixel_values = pixel_values.half()

            feats = self.model.get_image_features(pixel_values=pixel_values)  # (B, D)

            # L2 normalize => cosine similarity becomes dot product
            feats = feats / feats.norm(dim=-1, keepdim=True)

            out_chunks.append(feats.detach().cpu().float().numpy())

        return np.concatenate(out_chunks, axis=0).astype(np.float32)

    def similarity(self, query: ImageLike, refs: Sequence[ImageLike]) -> np.ndarray:
        """
        Cosine similarity between query and each ref: (len(refs),).
        """
        q = self.embed_images([query])[0]          # (D,)
        r = self.embed_images(list(refs))          # (N, D)
        return (r @ q).astype(np.float32)          # dot product = cosine

    def rank(self, query: ImageLike, refs: Sequence[ImageLike], top_k: int = 10) -> List[Tuple[int, float]]:
        scores = self.similarity(query, refs)
        idx = np.argsort(-scores)[: min(top_k, len(refs))]
        return [(int(i), float(scores[i])) for i in idx]
