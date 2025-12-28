import requests

from app.script.settings import settings

# ------------------------
# Navidrome API
# ------------------------
def check_navidrome(metadata: dict):
    duplicates = []
    query = f"{metadata.get('artist','')} {metadata.get('title','')}"
    try:
        r = requests.get(
            f"{settings.NAVIDROME_URL}/rest/search3",
            params={
                "u": settings.NAVIDROME_USER,
                "p": settings.NAVIDROME_PASS,
                "v": "1.16.1",
                "c": "dup-check",
                "f": "json",
                "query": query
            },
            timeout=5
        )
        r.raise_for_status()
        response_json = r.json()
        
        songs = response_json.get("subsonic-response", {}).get("searchResult3", {}).get("song", [])

        for s in songs:
            duplicates.append({
                "title": s.get("title"),
                "artist": s.get("artist"),
                "album": s.get("album"),
                "year": s.get("year"),
                "cover": None
            })
        return duplicates
    except Exception:
        return []
    
def get_artists_albums_genres():
    try:
        # Chiamata API per ottenere tutti gli artisti, album e generi
        response = requests.get(
            f"{settings.NAVIDROME_URL}/rest/search3",
            params={
                "u": settings.NAVIDROME_USER,
                "p": settings.NAVIDROME_PASS,
                "v": "1.16.1",
                "c": "autocomplete",
                "f": "json",
                "query": "",  # Query vuota per ottenere tutte le informazioni
            },
            timeout=5
        )
        response.raise_for_status()
        data = response.json()
        
        # Estrai lista di artisti, album e generi
        artists = set()
        albums = set()
        genres = set()

        if "subsonic-response" in data and "searchResult3" in data["subsonic-response"]:
            for song in data["subsonic-response"]["searchResult3"]["song"]:
                artist = song.get("artist")
                album = song.get("album")
                genre = song.get("genre")  # aggiunto
                
                if artist:
                    artists.add(artist)
                if album:
                    albums.add(album)
                if genre:
                    genres.add(genre)
        
        return sorted(list(artists)), sorted(list(albums)), sorted(list(genres))
    
    except Exception as e:
        print(f"Errore nel recuperare artisti, album e generi: {e}")
        return [], [], []
