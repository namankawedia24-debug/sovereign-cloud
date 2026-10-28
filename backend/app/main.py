from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine
from app.routes.users import router as users_router
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.routes import audit

app = FastAPI(title="Sovereign Cloud")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(auth_router)
app.include_router(files_router)
app.include_router(audit.router)


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/db-test")
def database_test():
    try:
        with engine.connect() as connection:
            return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "details": str(e)}