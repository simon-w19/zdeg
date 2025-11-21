"""Zwei Doofe, ein Gedanke web application."""

from __future__ import annotations

import json
import random
from pathlib import Path
from threading import Lock
from typing import Final

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
CUSTOM_PROMPTS_FILE = DATA_DIR / "custom_prompts.json"
TIMER_SECONDS: Final[int] = 5

PROMPTS: Final[list[str]] = [
    "Ein Tier, das Du im Zoo siehst",
    "Eine Eissorte, die es fast überall gibt",
    "Ein Song von ABBA",
    "Ein TV-Moderator oder eine Moderatorin",
    "Eine bekannte Biermarke",
    "Ein Körperteil, das oft verletzt wird",
    "Ein Ferienziel in Europa",
    "Ein Küchengerät, das Geräusche macht",
    "Ein Brettspiel-Klassiker",
    "Eine Süßigkeit aus Deiner Kindheit",
    "Ein Gadget, das gerade im Trend liegt",
    "Eine Aktivität bei schlechtem Wetter",
    "Eine Figur aus einem Pixar-Film",
    "Ein Obst, das man schält",
    "Ein Instrument in einer Rockband",
    "Ein Tier, das nachts aktiv ist",
    "Eine Linie aus einem Disney-Song",
    "Ein Emoji, das Du oft nutzt",
    "Ein Sport, den man im Fernsehen schaut",
    "Ein Gericht, das ohne Käse besser ist",
]


class PromptPayload(BaseModel):
    prompt: str = Field(..., min_length=4, max_length=160, description="Neuer Prompt")


class PromptStore:
    def __init__(self, base_prompts: list[str]):
        self._base_prompts = base_prompts
        self._lock = Lock()
        self._last_prompt: str | None = None
        DATA_DIR.mkdir(exist_ok=True)
        if not CUSTOM_PROMPTS_FILE.exists():
            CUSTOM_PROMPTS_FILE.write_text("[]", encoding="utf-8")
        self._custom_prompts = self._load_custom_prompts()

    def _load_custom_prompts(self) -> list[str]:
        try:
            raw = json.loads(CUSTOM_PROMPTS_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []
        if not isinstance(raw, list):
            return []
        return [str(item) for item in raw if isinstance(item, str)]

    def _persist_custom_prompts(self) -> None:
        CUSTOM_PROMPTS_FILE.write_text(
            json.dumps(self._custom_prompts, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _full_pool(self) -> list[str]:
        return self._base_prompts + self._custom_prompts

    def total_prompts(self) -> int:
        with self._lock:
            return len(self._full_pool())

    def get_random_prompt(self) -> str:
        with self._lock:
            pool = self._full_pool()
            if not pool:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Fragen verfügbar.")

            choices = pool.copy()
            if self._last_prompt in choices and len(choices) > 1:
                choices.remove(self._last_prompt)

            selection = random.choice(choices)
            self._last_prompt = selection
            return selection

    def add_prompt(self, prompt: str) -> None:
        normalized = prompt.strip()
        if not normalized:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Prompt darf nicht leer sein.")

        with self._lock:
            if normalized in self._full_pool():
                raise HTTPException(status.HTTP_409_CONFLICT, "Prompt existiert bereits.")

            self._custom_prompts.append(normalized)
            self._persist_custom_prompts()


def _build_app() -> FastAPI:
    app = FastAPI(title="Zwei Doofe, ein Gedanke")

    templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
    app.mount(
        "/static",
        StaticFiles(directory=str(BASE_DIR / "static"), check_dir=False),
        name="static",
    )

    prompt_store = PromptStore(PROMPTS)

    @app.get("/", response_class=HTMLResponse)
    async def index(request: Request) -> HTMLResponse:
        context = {
            "request": request,
            "timer_seconds": TIMER_SECONDS,
            "prompt_pool_size": prompt_store.total_prompts(),
        }
        return templates.TemplateResponse("index.html", context)

    @app.get("/api/prompt")
    async def prompt() -> dict[str, int | str]:
        selected = prompt_store.get_random_prompt()
        return {
            "prompt": selected,
            "timerSeconds": TIMER_SECONDS,
            "totalPrompts": prompt_store.total_prompts(),
        }

    @app.post("/api/prompt", status_code=status.HTTP_201_CREATED)
    async def create_prompt(payload: PromptPayload) -> dict[str, int | str]:
        prompt_store.add_prompt(payload.prompt)
        return {
            "prompt": payload.prompt.strip(),
            "totalPrompts": prompt_store.total_prompts(),
        }

    return app


app = _build_app()


def main() -> None:
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()
