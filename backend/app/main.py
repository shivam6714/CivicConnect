from fastapi import FastAPI

app = FastAPI(title="CivicConnect API")


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "CivicConnect API is running"}


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
