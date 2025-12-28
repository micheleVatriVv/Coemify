import paramiko

from app.script.settings import settings

def upload_sftp(local_file, artist, title):
    try:
        # Connessione al server SFTP
        transport = paramiko.Transport((settings.SFTP_HOST, int(settings.SFTP_PORT)))
        transport.connect(username=settings.SFTP_USER, password=settings.SFTP_PASS)

        sftp = paramiko.SFTPClient.from_transport(transport)

        # Imposta il percorso remoto nella cartella music
        remote_path = f"/music/{artist} - {title}.mp3"

        # Carica il file nella cartella 'music'
        sftp.put(local_file, remote_path)

        sftp.close()
        transport.close()

        print("Upload completato con successo!")
    except Exception as e:
        print(f"Errore durante l'upload SFTP: {str(e)}")