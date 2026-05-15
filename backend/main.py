from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, migrate_schema, db_path
from routers import device_types, devices, products, sessions, settings
import logging

logging.basicConfig(level=logging.INFO)

# Create all tables on startup, then apply column migrations
Base.metadata.create_all(bind=engine)
migrate_schema()
print(f"[crazy_game] Database ready: {db_path}")

app = FastAPI(title="Crazy Game Lounge API", version="1.0.0")

# CORS — allow the Vite dev server and Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(device_types.router)
app.include_router(devices.router)
app.include_router(products.router)
app.include_router(sessions.router)
app.include_router(settings.router)


@app.get("/")
def root():
    return {"message": "Crazy Game Lounge API Running", "api_version": "1.1.0"}


@app.get("/health")
def health():
    from sqlalchemy import text
    from database import _column_exists

    with engine.connect() as conn:
        inventory = _column_exists(conn, "products", "quantity")
    return {
        "status": "ok",
        "api_version": "1.1.0",
        "inventory_enabled": inventory,
        "database": db_path,
    }