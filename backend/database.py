from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Set up a persistent directory in the user's AppData/Home folder
app_data_dir = os.path.join(os.path.expanduser('~'), '.crazy_game_app')
os.makedirs(app_data_dir, exist_ok=True)
db_path = os.path.join(app_data_dir, 'crazy_game.db')

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},  # Required for SQLite
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
