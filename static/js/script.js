document.addEventListener("DOMContentLoaded", () => {

    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("audioFile");
    const fileInfo = document.getElementById("fileInfo");

    /* CLICK → file picker */
    dropZone.addEventListener("click", () => {
        fileInput.click();
    });

    ["dragenter", "dragover", "dragleave", "drop"].forEach(event => {
        dropZone.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    dropZone.addEventListener("dragover", () => {
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        dropZone.classList.remove("dragover");

        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;

            const file = e.dataTransfer.files[0];
            fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        }
    });

});


// Alert output
const showAlert = (message, type) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="font-size: 0.75em; margin-top: 0.25em;"></button>
    `;
    alertContainer.appendChild(alertDiv);
    setTimeout(() => {
        alertDiv.classList.remove('show');
        alertDiv.addEventListener('transitionend', () => {
            alertDiv.remove();
        }, { once: true });
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 600);
    }, 10000);
}

async function loadArtistsAndAlbums(data) {
    try {
        const artists = data.artists || [];
        const albums = data.albums || [];
        const genres = data.genres || [];

        // Popola i datalist per artisti
        const artistList = document.getElementById("artists");
        artistList.innerHTML = "";
        artists.forEach(artist => {
            const option = document.createElement("option");
            option.value = artist;
            artistList.appendChild(option);
        });

        function normalizeValue(v) {
            if (!v) return "";
            if (typeof v === "string") return v;
            if (typeof v === "object" && v.name) return v.name;
            return "";
        }

        const albumList = document.getElementById("albums");
        albumList.innerHTML = "";
        albums.forEach(album => {
            const val = normalizeValue(album);
            if (!val) return;
            const option = document.createElement("option");
            option.value = val;
            albumList.appendChild(option);
        });

        const genreList = document.getElementById("genres");
        genreList.innerHTML = "";
        genres.forEach(genre => {
            const val = normalizeValue(genre);
            if (!val) return;
            const option = document.createElement("option");
            option.value = val;
            genreList.appendChild(option);
        });

    } catch (error) {
        showAlert(`Errore: ${error}`, 'danger')
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
        showAlert(`Errore: ${error.detail || "unknown"}`, 'danger');
        return;
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

    /*if (md.cover) {
        document.getElementById("coverImg").src = md.cover;
    }*/

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
        showAlert(`Errore durante la ricerca dei duplicati`, 'warning');
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
    const title = document.getElementById("title").value.trim();
    const artist = document.getElementById("artist").value.trim();

    if (!title || !artist) return showAlert(`Titolo e artista obbligatori`, 'warning');

    const query = `recording:${title} AND artist:${artist}`;
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=25`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.recordings || data.recordings.length === 0) {
            showAlert(`Nessun metadato trovato`, 'warning');
            return;
        }

        const candidatesDiv = document.getElementById("metadataCandidates");
        candidatesDiv.innerHTML = "";

        data.recordings.forEach((rec, idx) => {
            
            const artistName = rec["artist-credit"]?.[0]?.name || "-";
            const albumName = rec.releases?.[0]?.title || "-";
            const releaseDate = rec.releases?.[0]?.date || "-";
            const genre = rec.tags?.[0]?.name || "-";
            
            let coverUrl = "/static/img/default.png";
            if (rec.releases && rec.releases.length > 0) {
                const releaseId = rec.releases[0].id;
                if (releaseId) {
                    coverUrl = `https://coverartarchive.org/release/${releaseId}/front-150`;
                }
            }

            const card = document.createElement("div");
            card.className = "candidate-card d-flex align-items-center p-2 mb-2";

            card.innerHTML = `
                <img src="${coverUrl}" class="cover-img" onerror="this.src='/static/img/default.png'" />
                <div class="candidate-info ms-3">
                    <h6 class="mb-1">${rec.title}</h6>
                    <p class="mb-0"><strong>Artista:</strong> ${artistName}</p>
                    <p class="mb-0"><strong>Album:</strong> ${albumName}</p>
                    <p class="mb-0"><strong>Genere:</strong> ${genre}</p>
                    <p class="mb-0"><strong>Anno:</strong> ${releaseDate}</p>
                </div>
                <button class="btn btn-sm btn-primary ms-auto select-candidate" data-index="${idx}">Seleziona</button>
            `;

            candidatesDiv.appendChild(card);
        });


        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById("metadataModal"));
        modal.show();

        // Aggiungi listener ai bottoni "Seleziona"
        candidatesDiv.querySelectorAll(".select-candidate").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = btn.dataset.index;
                const candidate = data.recordings[idx];

                // Popola solo i campi aggiuntivi
                document.getElementById("album").value = candidate.releases?.[0]?.title || "";
                document.getElementById("genre").value = candidate.tags?.[0]?.name || "";
                document.getElementById("release_date").value = candidate.releases?.[0]?.date || "";
                
                if (candidate.releases?.[0]?.id) {
                    const coverUrl = `https://coverartarchive.org/release/${candidate.releases[0].id}/front-250`;
                    
                    // Fetch dell'immagine come Blob
                    fetch(coverUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
                            const coverInput = document.getElementById("coverFile");
                            
                            // Aggiorna il file input
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            coverInput.files = dataTransfer.files;

                            // Aggiorna anche l'anteprima
                            document.getElementById("coverImg").src = coverUrl;
                        });
                } else {
                    document.getElementById("coverImg").src = "/static/img/default.png";
                }


                modal.hide();
            });
        });

    } catch (error) {
        console.error(error);
        showAlert(`Ricerca non riuscita, riprovare finchè non va`, 'warning');
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
            showAlert("Errore durante l'upload: " + (error.detail || "Errore sconosciuto"), 'danger');
            return;
        }

        // Se l'upload è stato completato con successo
        const data = await response.json();
        showAlert(data.message || "File caricato con successo!", 'success');
                
        
        
    } catch (error) {
        console.error("Errore durante l'upload:", error);
        showAlert("Errore durante l'upload:" + error, 'danger');
    } finally {
        // Nascondi lo spinner di caricamento una volta completato
        document.getElementById("uploadSpinner").style.display = "none";
        setTimeout(() => {
            location.reload();
        }, 3000);
    }
}


