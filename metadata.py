import base64
from mutagen.id3 import ID3, TIT2, TPE1, TPE2, TALB, TCON, TDRC, TCOM, APIC, TXXX, TRCK, TCMP, TPOS
from mutagen.mp3 import MP3

# ------------------------
# Estrazione metadati
# ------------------------
def extract_metadata(file_path: str):
    audio = MP3(file_path, ID3=ID3)
    
    # Extract track number (TRCK can be "5" or "5/12" format)
    track_num_raw = str(audio.get("TRCK", [""])[0])
    track_number = None
    if track_num_raw:
        # Handle "5/12" format - take just the track number
        track_number = int(track_num_raw.split("/")[0]) if track_num_raw.split("/")[0].isdigit() else None

    metadata = {
        "title": str(audio.get("TIT2", [""])[0]),
        "artist": str(audio.get("TPE1", [""])[0]),
        "album": str(audio.get("TALB", [""])[0]),
        "duration": int(audio.info.length),
        "genre": str(audio.get("TCON", [""])[0]),
        "release_date": str(audio.get("TDRC", [""])[0]),
        "track_number": track_number,
        "cover": None
    }

    # Estrazione e codifica in base64 della copertina (se presente)
    if audio.tags:
        for tag in audio.tags.values():
            if isinstance(tag, APIC):
                img_data = tag.data
                mime = tag.mime
                metadata["cover"] = (
                    f"data:{mime};base64,"
                    f"{base64.b64encode(img_data).decode()}"
                )
                break
        
    
    return metadata

# ------------------------
# Aggiornamento metadati
# ------------------------

def update_metadata(file_path, data, cover_data=None):
    # Carica il file MP3 con ID3
    audio = MP3(file_path, ID3=ID3)

    # Aggiungi o aggiorna i metadati ID3
    audio.tags = audio.tags or ID3()
    
    artist = data.get("artist")
    album = data.get("album")
    
    # Rimozione campi esistenti
    for tag in [
        "TPE1", "TPE2", "TCOM",
        "TALB", "TIT2", "TCON",
        "TDRC", "TRCK", "TCMP"
    ]:
        audio.tags.delall(tag)

    audio.tags.delall("TXXX")
    audio.tags.delall("APIC")

    # Titolo (TIT2)
    if data.get("title"):
        audio["TIT2"] = TIT2(encoding=3, text=data["title"])

    # Artisti
    if artist:
        audio["TPE1"] = TPE1(encoding=3, text=artist)  # artista brano
        audio["TPE2"] = TPE2(encoding=3, text=artist)  # artista album
        audio["TCOM"] = TCOM(encoding=3, text=artist)  # compositore
        audio["TXXX:ALBUMARTIST"] = TXXX(encoding=3, desc="ALBUMARTIST", text=artist)

    # Album (TALB)
    if album:
        audio["TALB"] = TALB(encoding=3, text=album)
    
    # Genere (TCON)
    if data.get("genre"):
        audio["TCON"] = TCON(encoding=3, text=data["genre"])

    # Data di rilascio (TDRC)
    if data.get("release_date"):
        audio["TDRC"] = TDRC(encoding=3, text=data["release_date"])

    # Track number (TRCK)
    if data.get("track_number"):
        audio["TRCK"] = TRCK(encoding=3, text=str(data["track_number"]))

    # Cover (APIC)
    if cover_data:
        audio["APIC"] = APIC(
            encoding=3,  # UTF-8
            mime="image/jpeg",
            type=3,  # Copertina frontale
            desc="Cover",
            data=cover_data
        )

    # Salva i metadati nel file audio
    audio.save()