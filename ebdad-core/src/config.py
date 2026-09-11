import os

POSTGRES_USER = os.getenv("POSTGRES_USER", "ebdad_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "ebdad_password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "ebdad_db")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
DATABASE_URL = "sqlite:///./ebdad.db"


REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
