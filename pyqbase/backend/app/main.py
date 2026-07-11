from fastapi import FastAPI

app = FastAPI(title="PYQBase API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def read_root():
    return {"message": "Hello PYQBASE"}
