# raredex/core/config.py
from __future__ import annotations

import os
from dataclasses import dataclass
import dotenv

dotenv.load_dotenv()
def _env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    # Gemini
    gemini_api_key: str
    gemini_vlm_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"

    # Supabase core tables (match your schema)
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_storage_bucket: str = "submissions"
    supabase_submissions_table: str = "submissions"

    # Labels table in schema
    supabase_labels_table: str = "labels"
    labels_id_col: str = "id"
    labels_name_col: str = "name"
    labels_parent_id_col: str = "parent_id"

    # NEW: embeddings table (separate from labels)
    supabase_label_embeddings_table: str = "label_embeddings"
    label_embeddings_label_id_col: str = "label_id"
    label_embeddings_embedding_col: str = "embedding"

    # Label snapping (vector similarity) - toggleable
    enable_label_snap: bool = False
    snap_coarse_only: bool = True  # treat "coarse" as parent_id IS NULL
    similarity_threshold: float = 0.88
    match_count: int = 1
    match_rpc_name: str = "match_label_embeddings"


def get_settings() -> Settings:
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY is not set.")

    # Keep backward compatibility with your existing env var names
    supabase_url = os.getenv("SUPABASE_URL", os.getenv("supabase_api", "")).strip()
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("supabase_key", "")).strip()
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL/SUPABASE_SERVICE_KEY (or supabase_api/supabase_key) is not set.")

    return Settings(
        gemini_api_key=gemini_api_key,
        gemini_vlm_model=os.getenv("GEMINI_VLM_MODEL", "gemini-2.5-flash").strip(),
        gemini_embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001").strip(),
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        supabase_storage_bucket=os.getenv("SUPABASE_STORAGE_BUCKET", "submissions").strip(),
        supabase_submissions_table=os.getenv("SUPABASE_SUBMISSIONS_TABLE", "submissions").strip(),
        supabase_labels_table=os.getenv("SUPABASE_LABELS_TABLE", "labels").strip(),

        # optional overrides
        supabase_label_embeddings_table=os.getenv("SUPABASE_LABEL_EMBEDDINGS_TABLE", "label_embeddings").strip(),
        enable_label_snap=_env_bool("ENABLE_LABEL_SNAP", False),
        snap_coarse_only=_env_bool("SNAP_COARSE_ONLY", True),
        similarity_threshold=float(os.getenv("LABEL_SIMILARITY_THRESHOLD", "0.88")),
        match_count=int(os.getenv("LABEL_MATCH_COUNT", "1")),
        match_rpc_name=os.getenv("LABEL_MATCH_RPC", "match_label_embeddings").strip(),
    )
