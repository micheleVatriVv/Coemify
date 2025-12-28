import base64
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TCON, TDRC, APIC
from mutagen.mp3 import MP3

# ------------------------
# Estrazione metadati
# ------------------------
def extract_metadata(file_path: str):
    audio = MP3(file_path, ID3=ID3)
    metadata = {
        "title": str(audio.get("TIT2", [""])[0]),
        "artist": str(audio.get("TPE1", [""])[0]),
        "album": str(audio.get("TALB", [""])[0]),
        "duration": int(audio.info.length),
        "genre": str(audio.get("TCON", [""])[0]),
        "release_date": str(audio.get("TDRC", [""])[0]),
    }

    # Estrazione e codifica in base64 della copertina (se presente)
    metadata["cover"] = None
    tags = audio.tags
    for tag in tags.values():
        if isinstance(tag, APIC):
            img_data = tag.data  # qui hai i bytes dell'immagine
            mime = tag.mime    # es: 'image/jpeg'
            metadata["cover"] = f"data:{mime};base64,{base64.b64encode(img_data).decode()}"
            break
        else:
            metadata["cover"] = None
            mime = None
        
    
    return metadata

# ------------------------
# Aggiornamento metadati
# ------------------------

def update_metadata(file_path, data, cover_data=None):
    # Carica il file MP3 con ID3
    audio = MP3(file_path, ID3=ID3)

    # Aggiungi o aggiorna i metadati ID3
    audio.tags = audio.tags or ID3()

    # Titolo (TIT2)
    if data.get("title"):
        audio["TIT2"] = TIT2(encoding=3, text=data["title"])

    # Artista (TPE1)
    if data.get("artist"):
        audio["TPE1"] = TPE1(encoding=3, text=data["artist"])

    # Album (TALB)
    if data.get("album"):
        audio["TALB"] = TALB(encoding=3, text=data["album"])

    # Genere (TCON)
    if data.get("genre"):
        audio["TCON"] = TCON(encoding=3, text=data["genre"])

    # Data di rilascio (TDRC)
    if data.get("release_date"):
        audio["TDRC"] = TDRC(encoding=3, text=data["release_date"])

    # Se la copertura è presente, aggiungi la copertura
    if cover_data:
        audio["APIC"] = APIC(
            encoding=3,  # UTF-8
            mime="image/jpeg",  # Tipo immagine (JPEG)
            type=3,  # Copertina frontale
            desc="Cover",
            data=cover_data  # Dati immagine
        )

    # Salva i metadati nel file audio
    audio.save()