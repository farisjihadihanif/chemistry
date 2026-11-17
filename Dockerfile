FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir fastapi uvicorn pydantic
COPY backend ./backend
COPY web ./web
EXPOSE 8087
ENV PORT=8087
CMD ["python", "backend/main.py"]
