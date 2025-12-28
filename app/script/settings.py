from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    # ===== App =====
    APP_NAME = os.getenv("APP_NAME")
    ENV = os.getenv("ENV")
    DEBUG = os.getenv("DEBUG") == "true"

    # ===== Security =====
    SECRET_KEY = os.getenv("SECRET_KEY")
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME")
    SESSION_MAX_AGE = int(os.getenv("SESSION_MAX_AGE"))
    SESSION_SAMESITE = os.getenv("SESSION_SAMESITE")
    SESSION_HTTPS_ONLY = os.getenv("SESSION_HTTPS_ONLY") == "true"

    # ===== Single User Auth =====
    APP_USER = os.getenv("APP_USER")
    APP_PASS = os.getenv("APP_PASS")

    # ===== Upload =====
    MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB"))
    UPLOAD_DIR = os.getenv("UPLOAD_DIR")
    ALLOWED_MIME_PREFIX = os.getenv("ALLOWED_MIME_PREFIX")

    # ===== Server =====
    HOST = os.getenv("HOST")
    PORT = int(os.getenv("PORT"))
    WORKERS = int(os.getenv("WORKERS"))

    # ===== Rate limiting =====
    LOGIN_RATE_LIMIT = os.getenv("LOGIN_RATE_LIMIT")
    UPLOAD_RATE_LIMIT = os.getenv("UPLOAD_RATE_LIMIT")

    # ===== Navidrome API =====
    NAVIDROME_URL = os.getenv("NAVIDROME_URL")
    NAVIDROME_USER = os.getenv("NAVIDROME_USER")
    NAVIDROME_PASS = os.getenv("NAVIDROME_PASS")
    
    # ===== SFTP Pikapod =====
    SFTP_HOST = os.getenv("SFTP_HOST")
    SFTP_PORT = os.getenv("SFTP_PORT")
    SFTP_USER = os.getenv("SFTP_USER")
    SFTP_PASS = os.getenv("SFTP_PASS")


settings = Settings()
