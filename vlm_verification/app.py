from __future__ import annotations

from fastapi import FastAPI, File, Form, UploadFile, HTTPException

from verification.entrypoint import verify_submission  # adjust import if needed

app = FastAPI()

@app.post("/verify-submission")
async def verify_submission_route(
    file: UploadFile = File(...),
    proposed_label: str = Form(...),
):
    if file.content_type != "image/jpeg":
        raise HTTPException(status_code=400, detail="Only JPEG is supported")

    proposed_label = (proposed_label or "").strip()
    if not proposed_label:
        raise HTTPException(status_code=400, detail="proposed_label is required")
    if len(proposed_label) > 200:
        raise HTTPException(status_code=400, detail="proposed_label is too long")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")
    
    try:
        result = verify_submission(
            image_bytes=image_bytes,
            proposed_label=proposed_label,
            is_controversial=True,  
            options={"use_web": True, "n_web": 10, "top_k": 2, "include_debug": False},
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal verification error")

    return result