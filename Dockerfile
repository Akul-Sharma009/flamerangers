# Service container (Story 1.3). Serves the fixture until a store exists.
FROM python:3.14-slim
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /bin/uv
RUN useradd -m -u 1000 app && mkdir /app && chown app /app
USER app
WORKDIR /app
ENV UV_NO_CACHE=1 PATH="/app/.venv/bin:$PATH" PORT=7860
COPY --chown=app pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project
COPY --chown=app burncal ./burncal
COPY --chown=app contract ./contract
EXPOSE 7860
CMD ["sh", "-c", "uvicorn burncal.service.app:app --host 0.0.0.0 --port ${PORT}"]
