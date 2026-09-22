import os
import re
from pathlib import Path
from typing import Tuple
from app.config import get_settings

settings = get_settings()


class StorageManager:
    def __init__(self):
        self.local_dir = Path(settings.STORAGE_LOCAL_DIR).resolve()
        self.raw_dir = self.local_dir / "raw"
        self.enhanced_dir = self.local_dir / "enhanced"
        self.audio_dir = self.local_dir / "audio"
        self._ensure_dirs()

    def _ensure_dirs(self):
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.enhanced_dir.mkdir(parents=True, exist_ok=True)
        self.audio_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_filename(self, filename: str) -> str:
        """
        Strict security guard: strips path traversal elements (../, ..\\)
        and invalid characters from file names.
        """
        clean_name = Path(filename).name
        # Keep only alphanumeric, hyphen, underscore, and dot
        clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', clean_name)
        return clean_name or "uploaded_asset"

    async def save_raw_image(self, file_bytes: bytes, filename: str) -> str:
        safe_name = self._sanitize_filename(filename)
        file_path = self.raw_dir / safe_name
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return str(file_path.as_posix())

    async def save_enhanced_image(self, file_bytes: bytes, filename: str) -> str:
        safe_name = self._sanitize_filename(filename)
        file_path = self.enhanced_dir / safe_name
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return str(file_path.as_posix())

    async def save_voice_audio(self, file_bytes: bytes, filename: str) -> str:
        safe_name = self._sanitize_filename(filename)
        file_path = self.audio_dir / safe_name
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return str(file_path.as_posix())


storage_manager = StorageManager()
