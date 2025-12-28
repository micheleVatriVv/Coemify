# main.py
import os

from fastapi import FastAPI, Response, Request, File, UploadFile, HTTPException, Form
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import PlainTextResponse, JSONResponse, RedirectResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from app.script.settings import settings
from app.script.ssh_utils import upload_sftp
from app.script.metadata import extract_metadata, update_metadata
from app.script.apis import check_navidrome, get_artists_albums_genres

# ------------------------------
# FastAPI + Middleware
# ------------------------------
app = FastAPI(title=settings.APP_NAME)

# Session cookie
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie=settings.SESSION_COOKIE_NAME,
    max_age=settings.SESSION_MAX_AGE,
    same_site=settings.SESSION_SAMESITE,
    https_only=settings.SESSION_HTTPS_ONLY,
)

# Trusted host
if hasattr(settings, "HOST"):
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=[settings.HOST],
    )

# Middleware per protezione dashboard
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        protected_paths = ["/dashboard", "/search-duplicates", "/upload-temp", "/upload-final"]
        if any(request.url.path.startswith(p) for p in protected_paths):
            cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
            if cookie != "logged_in":
                return RedirectResponse(url='/login', status_code=303)
        response = await call_next(request)
        return response

app.add_middleware(AuthMiddleware)

# ------------------------------
# Rate Limiting
# ------------------------------
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return PlainTextResponse("Too many requests", status_code=429)

# ------------------------------
# Templates e static
# ------------------------------
templates = Jinja2Templates(directory="app/templates")
app_dir = os.path.dirname(__file__)
static_dir = os.path.join(app_dir, "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ------------------------------
# Upload config
# ------------------------------
MAX_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

# ------------------------------
# Login endpoints
# ------------------------------
@app.get("/login")
def login_get(request: Request):
    return templates.TemplateResponse("login.html", {"request": request, "app_name": settings.APP_NAME})

@app.post("/login")
@limiter.limit(settings.LOGIN_RATE_LIMIT or "5/minute")
def login_post(request: Request, response: Response, username: str = Form(...), password: str = Form(...)):
    if username != settings.APP_USER or password != settings.APP_PASS:
        raise HTTPException(status_code=401, detail="Credenziali errate")

    response = RedirectResponse(url='/dashboard', status_code=303)
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value="logged_in",
        httponly=True,
        samesite=settings.SESSION_SAMESITE,
        secure=settings.SESSION_HTTPS_ONLY,
        max_age=settings.SESSION_MAX_AGE,
    )
    return response

# ------------------------------
# Dashboard
# ------------------------------
@app.get("/dashboard")
def dashboard(request: Request):
    # Il middleware garantisce che il cookie sia valido
    return templates.TemplateResponse(
        "dashboard.html",
        {"request": request, "app_name": settings.APP_NAME}
    )

# ------------------------------
# Cerca duplicati su Navidrome
# ------------------------------
@app.get("/search-duplicates")
async def search_duplicates(query: str):
    """Ricerca duplicati per titolo e artista"""
    metadata = {
        "title": query.split(" ")[-1],
        "artist": " ".join(query.split(" ")[:-1]), 
    }

    duplicates = check_navidrome(metadata)
    return {"duplicates": duplicates}


# ------------------------------
# Upload temporaneo + estrazione metadati
# ------------------------------
@app.post("/upload-temp")
async def upload_temp(file: UploadFile, request: Request):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(400, "Tipo file non valido")

    temp_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    contents = await file.read()
    with open(temp_path, "wb") as f:
        f.write(contents)

    metadata = extract_metadata(temp_path)

    duplicates = check_navidrome(metadata)
    
    artists, albums, genres = get_artists_albums_genres()

    return JSONResponse({
        "metadata": metadata,
        "artists": artists,
        "albums": albums,
        "genres": genres,
        "duplicates": duplicates,
        "temp_file": temp_path
    })
    
# ------------------------------
# Upload finale e SFTP
# ------------------------------
# Funzione per caricare il file e metadati
@app.post("/upload-final")
async def upload_final(
    temp_file: str = Form(...),
    title: str = Form(...),
    artist: str = Form(...),
    album: str = Form(...),
    genre: str = Form(...),
    duration: str = Form(...),
    release_date: str = Form(...),
    cover: UploadFile = File(None)
):
    
    # Verifica che il file temporaneo esista
    filepath = os.path.join(app_dir, temp_file) 
    
    # Verifica che il file temporaneo esista
    if not temp_file or not os.path.exists(filepath):
        raise HTTPException(400, f"File temporaneo non trovato: {filepath}")

    # Se è presente una copertura, ottieni i dati dell'immagine
    cover_data = None
    if cover:
        cover_data = await cover.read()

    # Aggiungi i metadati al file
    update_metadata(filepath, {
        "title": title,
        "artist": artist,
        "album": album,
        "genre": genre,
        "duration": duration,
        "release_date": release_date
    }, cover_data)

    # Caricamento del file via SFTP
    try:
        upload_sftp(local_file=filepath, artist=artist, title=title)
    except Exception as e:
        raise HTTPException(500, f"Upload SFTP fallito: {str(e)}")
    finally:
        for file in os.listdir(settings.UPLOAD_DIR):
            file_path = os.path.join(settings.UPLOAD_DIR, file)
            
            # Verifica che sia un file e non una directory
            if os.path.isfile(file_path):
                try:
                    os.remove(file_path)  # Rimuovi il file
                    print(f"File rimosso: {file_path}")
                except Exception as e:
                    print(f"Errore durante la rimozione del file {file_path}: {e}")

    return JSONResponse({"message": "Upload completato con successo!"})