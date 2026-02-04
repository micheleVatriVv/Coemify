import { apiRequest } from "./api.js"
import { getReleaseYear, showAlert } from "./utils.js";

export async function searchMetadata() {

    let title;
    const artist = document.getElementById("artist").value.trim();

    // Check if in batch mode by looking for track title inputs
    const firstTrackInput = document.querySelector("input.track-title");

    // In batch mode, use the first track's title for search
    if (firstTrackInput && firstTrackInput.value) {
        title = firstTrackInput.value.trim();
    } else {
        title = document.getElementById("title").value.trim();
    }

    if (!title || !artist) return showAlert(`Titolo e artista obbligatori`, 'warning');

    const query = `recording:${title} AND artist:${artist}`;
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=25`;

    try {
        const data = await apiRequest(url);
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

            const releaseYear = getReleaseYear(releaseDate);
            
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
                    <p class="mb-0"><strong>Anno:</strong> ${releaseYear}</p>
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
            btn.addEventListener("click", async () => {
                const idx = btn.dataset.index;
                const candidate = data.recordings[idx];

                // Popola solo i campi aggiuntivi
                document.getElementById("album").value = candidate.releases?.[0]?.title || "";
                document.getElementById("genre").value = candidate.tags?.[0]?.name || "";
                document.getElementById("release_date").value = getReleaseYear(candidate.releases?.[0]?.date);
                
                if (candidate.releases?.[0]?.id) {
                    const coverUrl = `https://coverartarchive.org/release/${candidate.releases[0].id}/front-250`;
                    
                    // Fetch dell'immagine come Blob
                    const res = await fetch(coverUrl)
                    const blob = await res.blob()
                        
                    const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
                    const coverInput = document.getElementById("coverFile");
                    
                    // Aggiorna il file input
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    coverInput.files = dataTransfer.files;

                    // Aggiorna anche l'anteprima
                    document.getElementById("coverImg").src = coverUrl;
                } else {
                    if (!document.getElementById("coverFile").files.length) {
                        document.getElementById("coverImg").src = "/static/img/default.png";
                    }
                }

                modal.hide();
            });
        });

    } catch (error) {
        console.error(error);
        showAlert(`Ricerca non riuscita, riprovare finchè non va`, 'warning');
    }
}