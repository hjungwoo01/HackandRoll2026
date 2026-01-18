from fastapi import FastAPI, File, UploadFile, HTTPException
from foreground_check import check_foreground

app = FastAPI()

@app.post("/foreground-check")
async def foreground_check(file: UploadFile = File(...)):
  if file.content_type != "image/jpeg":
    raise HTTPException(status_code=400, detail="Only JPEG is supported")

  image_bytes = await file.read()
  if not image_bytes:
    raise HTTPException(status_code=400, detail="Empty file")

  try:
    result = check_foreground(image_bytes)
  except ValueError:
    raise HTTPException(status_code=400, detail="Invalid JPEG data")

  return result

