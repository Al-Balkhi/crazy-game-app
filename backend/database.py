from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
import logging

logger = logging.getLogger(__name__)

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


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _column_exists(conn, table: str, column: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return any(row[1] == column for row in rows)


def migrate_schema():
    """Add columns introduced after initial release (SQLite)."""
    migrations = [
        ("sessions", "actual_minutes", "INTEGER"),
        ("sessions", "booked_session_price", "REAL"),
        ("sessions", "is_open_session", "BOOLEAN DEFAULT 0"),
        ("products", "quantity", "INTEGER DEFAULT 0"),
        ("products", "initial_quantity", "INTEGER DEFAULT 0"),
        ("products", "refill_count", "INTEGER DEFAULT 0"),
    ]
    with engine.connect() as conn:
        for table, column, col_def in migrations:
            if _column_exists(conn, table, column):
                continue
            sql = f"ALTER TABLE {table} ADD COLUMN {column} {col_def}"
            conn.execute(text(sql))
            conn.commit()
            logger.info("Applied migration: %s.%s", table, column)
            print(f"[crazy_game] Database migration: added {table}.{column}")
