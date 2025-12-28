document.addEventListener("DOMContentLoaded", () => {

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("audioFile");

    /* CLICK → file picker */
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    /* ⚠️ BLOCCO COMPORTAMENTO DEFAULT DEL BROWSER */
    ["dragenter", "dragover", "dragleave", "drop"].forEach(event => {
        document.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    /* EFFETTI VISIVI */
    dropZone.addEventListener("dragover", () => {
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    /* DROP FILE AUDIO */
    dropZone.addEventListener("drop", (e) => {
        dropZone.cimg_datalassList.remove("dragover");

        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;

            // Mostra all’utente il nome del file
            const file = e.dataTransfer.files[0];
            const fileInfo = document.getElementById("fileInfo");
            fileInfo.textContent = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileInfo = document.getElementById("fileInfo");
            fileInfo.textContent = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
        }
    });

});

async function loadArtistsAndAlbums(data) {
    try {
        const artists = data.artists || [];
        const albums = data.albums || [];
        const genres = data.genres || []; // nuova lista dei generi

        // Popola i datalist per artisti
        const artistList = document.getElementById("artists");
        artistList.innerHTML = ""; // svuota prima di popolare
        artists.forEach(artist => {
            const option = document.createElement("option");
            option.value = artist;
            artistList.appendChild(option);
        });

        // Popola i datalist per album
        const albumList = document.getElementById("albums");
        albumList.innerHTML = "";
        albums.forEach(album => {
            const option = document.createElement("option");
            option.value = album;
            albumList.appendChild(option);
        });

        // Popola i datalist per generi
        const genreList = document.getElementById("genres");
        genreList.innerHTML = "";
        genres.forEach(genre => {
            const option = document.createElement("option");
            option.value = genre;
            genreList.appendChild(option);
        });

    } catch (error) {
        console.error('Errore nella richiesta di artisti, album e generi:', error);
    }
}


async function handleUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById("audioFile");
    if (!fileInput.files.length) return alert("Seleziona un file!");

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    // Mostra lo spinner di caricamento
    const spinner = document.getElementById("uploadSpinner");
    spinner.style.display = "inline-block";

    const response = await fetch("/upload-temp", {
        method: "POST",
        body: formData
    });

    // Nascondi lo spinner dopo la risposta
    spinner.style.display = "none";

    if (!response.ok) {
        const error = await response.json();
        return alert(error.detail || "Errore caricamento");
    }

    const data = await response.json();

    // Carica artisti e album
    loadArtistsAndAlbums(data);

    // Mostra la dashboard
    document.getElementById("uploadSection").style.display = "none";
    document.getElementById("dashboardContent").style.display = "flex";

    // Popola i metadati
    const md = data.metadata;
    document.getElementById("title").value = md.title || "";
    document.getElementById("artist").value = md.artist || "";
    document.getElementById("album").value = md.album || "";
    document.getElementById("genre").value = md.genre || "";
    document.getElementById("duration").value = md.duration || "";
    document.getElementById("release_date").value = md.release_date || "";

    if (md.cover) {
        document.getElementById("coverImg").src = md.cover;
    }

    // Popola la lista dei duplicati
    const list = document.getElementById("duplicatesList");
    list.innerHTML = "";

    if (data.duplicates.length === 0) {
        const noDuplicates = document.createElement("li");
        noDuplicates.className = "list-group-item text-center bg-transparent border-0";
        noDuplicates.textContent = "Nessun duplicato trovato.";
        list.appendChild(noDuplicates);
    } else {
        data.duplicates.forEach(d => {
            const li = document.createElement("li");
            li.className = "list-group-item bg-transparent border-0 border-bottom d-flex align-items-center";

            const info = document.createElement("div");
            info.innerHTML = `<strong>${d.title}</strong><br>${d.artist} - ${d.album} (${d.year || "?"})`;

            li.appendChild(info);
            list.appendChild(li);
        });
    }

    // Salva il path temporaneo
    document.getElementById("tempFile").value = data.temp_file;
}

function openCoverDialog() {
    document.getElementById("coverFile").click();  // Trigger il click sul file input
}

function previewCover(event) {
    const file = event.target.files[0];  // Recupera il file selezionato
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("coverImg").src = e.target.result;  // Imposta l'anteprima dell'immagine
        };
        reader.readAsDataURL(file);
    }
}



async function checkDuplicates() {
    const title = document.getElementById("title").value; // Recupera il titolo dal form
    const artist = document.getElementById("artist").value; // Recupera l'artista dal form

    const query = `${artist} ${title}`;
    
    const response = await fetch(`/search-duplicates?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
        alert("Errore nella w-30ricerca dei duplicati!");
        return;
    }
    
    const data = await response.json();
    const list = document.getElementById("duplicatesList");
    list.innerHTML = "";

    if (data.duplicates.length === 0) {
        const noDuplicates = document.createElement("li");
        noDuplicates.className = "list-group-item text-center bg-transparent border-0";
        noDuplicates.textContent = "Nessun duplicato trovato.";
        list.appendChild(noDuplicates);
    } else {
        data.duplicates.forEach(d => {
            const li = document.createElement("li");
            li.className = "list-group-item bg-transparent border-0 border-bottom d-flex align-items-center";

            const info = document.createElement("div");
            info.innerHTML = `<strong>${d.title}</strong><br>${d.artist} - ${d.album} (${d.year || "?"})`;

            li.appendChild(info);
            list.appendChild(li);
        });
    }

    // Salva il path temporaneo
    document.getElementById("tempFile").value = data.temp_file;
}

async function searchMetadata() {
    const title = document.getElementById("title").value; // Recupera il titolo dal form
    const artist = document.getElementById("artist").value; // Recupera l'artista dal form
    const album = document.getElementById("album").value; // Recupera l'album dal form
    
    if (!title || !artist) {
        alert("Per favore, inserisci il titolo e l'artista prima di cercare i metadati.");
        return;
    }

    const query = `${title} ${artist}`;
    
    try {
        // Fai la richiesta all'API di MusicBrainz per cercare il brano
        const response = await fetch(`https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`);
        
        if (!response.ok) {
            throw new Error('Errore nella ricerca dei metadati.');
        }
        
        const data = await response.json();
        
        if (data.recordings && data.recordings.length > 0) {
            const metadata = data.recordings[0]; // Prendi il primo risultato trovato
            
            // Popola i campi con i metadati trovati e applica la classe 'autopopulated'
            if (metadata.title) {
                document.getElementById("title").value = metadata.title;
                document.getElementById("title").classList.add("autopopulated");
            }
            
            if (metadata.artist) {
                document.getElementById("artist").value = metadata.artist.name;
                document.getElementById("artist").classList.add("autopopulated");
            }
            
            if (metadata.releases && metadata.releases[0] && metadata.releases[0].title) {
                document.getElementById("album").value = metadata.releases[0].title;
                document.getElementById("album").classList.add("autopopulated");
            }
            
            if (metadata.genres && metadata.genres.length > 0) {
                document.getElementById("genre").value = metadata.genres[0];
                document.getElementById("genre").classList.add("autopopulated");
            }

            if (metadata['release-date']) {
                document.getElementById("release_date").value = metadata['release-date'];
                document.getElementById("release_date").classList.add("autopopulated");
            }

            // Imposta l'immagine di copertura se disponibile
            if (metadata.releases && metadata.releases[0] && metadata.releases[0].image_url) {
                document.getElementById("coverImg").src = metadata.releases[0].image_url;
            }

        } else {
            alert("Nessun metadato trovato su MusicBrainz.");
        }
    } catch (error) {
        console.error("Errore nella ricerca su MusicBrainz:", error);
        alert("Errore nella ricerca dei metadati.");
    }
}

async function sendFinal(event) {
    event.preventDefault();
    
    const formData = new FormData();

    // Aggiungi i dati dal form
    formData.append("temp_file", document.getElementById("tempFile").value); // File temporaneo
    formData.append("title", document.getElementById("title").value);  // Titolo
    formData.append("artist", document.getElementById("artist").value);  // Artista
    formData.append("album", document.getElementById("album").value);  // Album
    formData.append("genre", document.getElementById("genre").value);  // Genere
    formData.append("duration", document.getElementById("duration").value);  // Durata
    formData.append("release_date", document.getElementById("release_date").value);  // Anno

    // Aggiungi il file di copertura se presente
    const coverFile = document.getElementById("coverFile").files[0];
    if (coverFile) {
        formData.append("cover", coverFile);
    }

    document.getElementById("uploadSpinner").style.display = "inline-block";

    try {
        // Invia i dati al backend utilizzando fetch
        const response = await fetch("/upload-final", {
            method: "POST",
            body: formData
        });

        // Gestione della risposta dal backend
        if (!response.ok) {
            const error = await response.json();
            alert("Errore durante l'upload: " + (error.detail || "Errore sconosciuto"));
            return;
        }

        // Se l'upload è stato completato con successo
        const data = await response.json();
        alert(data.message || "File caricato con successo!");
        
        // Ricarica la pagina o esegui altre azioni
        location.reload();
        
    } catch (error) {
        console.error("Errore durante l'upload:", error);
        alert("Si è verificato un errore durante l'upload.");
    } finally {
        // Nascondi lo spinner di caricamento una volta completato
        document.getElementById("uploadSpinner").style.display = "none";
        location.reload()
    }
}


