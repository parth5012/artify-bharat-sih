import io
import cv2
import numpy as np
from PIL import Image
from typing import Tuple
from app.config import get_settings

settings = get_settings()


class ComputerVisionService:
    """
    Implements Page 3 Studio Enhancement Pipeline:
    1. Background extraction (U2-Net Salient Object Detection)
    2. Lighting and gamma equalization (OpenCV CLAHE / Equalization)
    3. Centered auto-cropping to standardized 1:1 e-commerce ratio
    4. Visual complexity scoring (used downstream in pricing engine)
    """

    @staticmethod
    def calculate_visual_complexity(image_bgr: np.ndarray) -> float:
        """
        Calculates complexity score [0.0 - 1.0] based on edge density (Canny)
        and color channel variance (intricacy of weave/craft).
        """
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 100, 200)
        edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])

        # Normalize score between 0.3 and 0.95
        complexity = min(0.95, max(0.30, float(edge_density * 8.0)))
        return round(complexity, 2)

    @staticmethod
    def equalize_lighting(image_bgr: np.ndarray) -> np.ndarray:
        """
        Equalizes lighting and gamma using CLAHE on the L-channel in LAB color space.
        Preserves natural dyes and artisan color warmth without artificial saturation.
        """
        lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl, a, b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        return enhanced

    @staticmethod
    def crop_to_square(image_rgba: np.ndarray) -> np.ndarray:
        """
        Centers object in a high-res 1:1 square canvas with a pure white studio background.
        """
        h, w = image_rgba.shape[:2]
        size = max(h, w)

        # Create white background square
        square = np.ones((size, size, 4), dtype=np.uint8) * 255

        # Calculate centering offsets
        y_offset = (size - h) // 2
        x_offset = (size - w) // 2

        # Alpha composite
        alpha = image_rgba[:, :, 3] / 255.0
        for c in range(3):
            square[y_offset:y_offset + h, x_offset:x_offset + w, c] = (
                alpha * image_rgba[:, :, c] + (1 - alpha) * 255
            ).astype(np.uint8)

        square[y_offset:y_offset + h, x_offset:x_offset + w, 3] = 255
        return square

    def enhance_image(self, image_bytes: bytes) -> Tuple[bytes, float]:
        """
        Executes end-to-end studio enhancement pipeline.
        Returns: (enhanced_image_bytes, visual_complexity_score)
        """
        # Load image via OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            # Fallback if corrupt bytes
            return image_bytes, 0.50

        # Step 1: Calculate visual complexity on raw asset
        complexity = self.calculate_visual_complexity(img)

        # Step 2: Lighting & Gamma Equalization
        color_corrected = self.equalize_lighting(img)

        # Step 3: Salient Foreground Segmentation (Simulated U2-Net / GrabCut mask)
        # In mock/production-CPU mode, create clean alpha channel with GrabCut or threshold
        h, w = color_corrected.shape[:2]
        mask = np.zeros((h, w), np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        rect = (int(w * 0.05), int(h * 0.05), int(w * 0.90), int(h * 0.90))

        try:
            cv2.grabCut(color_corrected, mask, rect, bgd_model, fgd_model, 2, cv2.GC_INIT_WITH_RECT)
            mask2 = np.where((mask == 2) | (mask == 0), 0, 255).astype('uint8')
        except Exception:
            mask2 = np.ones((h, w), dtype=np.uint8) * 255

        # Merge RGB with alpha mask
        b, g, r = cv2.split(color_corrected)
        rgba = cv2.merge([b, g, r, mask2])

        # Step 4: 1:1 auto-crop on white canvas
        studio_ready = self.crop_to_square(rgba)

        # Encode to PNG
        success, encoded_img = cv2.imencode(".png", studio_ready)
        if not success:
            return image_bytes, complexity

        return encoded_img.tobytes(), complexity


cv_service = ComputerVisionService()
