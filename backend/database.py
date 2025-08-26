import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Use backend/app.db by default (file named app.db inside backend folder)
default_db_file = os.path.join(BASE_DIR, 'app.db')
DB_PATH = os.environ.get("DATABASE_URL") or f"sqlite:///{default_db_file}"

# SQLite requires check_same_thread=False
engine = create_engine(DB_PATH, connect_args={"check_same_thread": False} if DB_PATH.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
