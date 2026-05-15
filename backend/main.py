from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import device_types, devices, products, sessions, settings

# Create all tables on startup
Base.metadata.create_all(bind=engine)

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
    return {"message": "Crazy Game Lounge API Running 🎮"}