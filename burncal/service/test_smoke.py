"""Stack smoke test: FastAPI + TestClient work on this Python. Not a real service."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel


class Pair(BaseModel):
    name: str
    count: int


def test_two_field_route() -> None:
    app = FastAPI()

    @app.get("/pair", response_model=Pair)
    def pair() -> Pair:
        return Pair(name="x", count=2)

    response = TestClient(app).get("/pair")
    assert response.status_code == 200
    assert response.json() == {"name": "x", "count": 2}
