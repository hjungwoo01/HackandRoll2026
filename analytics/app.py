import uvicorn

from fastapi import FastAPI
from label_generation import generate_labels_for_image_uuid

app = FastAPI()


@app.get("/labels/{image_uuid}")
def get_labels(image_uuid: str) -> list[str]:
  return generate_labels_for_image_uuid(image_uuid)


@app.get("/feed/{user_id}")
def get_feed(user_id: str) -> list[str]:
  # Placeholder for external DB lookup.
  return ["uuid_one", "uuid_two", "uuid_three"]

if __name__ == "__main__":
  uvicorn.run(app, host="0.0.0.0", port=8000)