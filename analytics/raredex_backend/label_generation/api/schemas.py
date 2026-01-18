from __future__ import annotations

from pydantic import BaseModel, Field


class LabelsResponse(BaseModel):
    labels: list[str] = Field(..., description="Exactly 3 label strings")
