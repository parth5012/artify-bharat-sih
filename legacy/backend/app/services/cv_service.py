import io
import logging
import cv2
import numpy as np
from PIL import Image
from dataclasses import dataclass, field
from typing import Any, Dict, Tuple, List
from app.config import get_settings
from app.core.anti_generative import non_generative

# ---------------------------------------------------------------------------
# rembg U²-Net — optional; falls back to GrabCut on import failure
# (e.g., offline deployments where ONNX weights cannot be downloaded)
# ---------------------------------------------------------------------------
try:
    from rembg import remove as rembg_remove
    _REMBG_AVAILABLE = True
except Exception:  # pragma: no cover
    _REMBG_AVAILABLE = False
    rembg_remove = None  # type: ignore

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class PipelineStepResult:
    """
    Records the outcome of a single stage in the AI Studio enhancement pipeline.
    """
    step_name: str          # Human-readable step label (e.g. "CLAHE Color Equalization")
    step_code: str          # Machine-readable key (e.g. "clahe_equalization")
    applied: bool           # Whether this step was successfully executed
    description: str        # What this step does
    authenticity_note: str  # Non-generative guarantee statement for this step


@dataclass
class StudioPipelineResult:
    """
    Structured output of the full 3-stage AI Studio enhancement pipeline.
    """
    enhanced_bytes: bytes
    complexity_score: float
    clahe_applied: bool
    background_removed: bool
    crop_applied: bool
    # True when rembg U²-Net ran; False when GrabCut CPU fallback was used
    rembg_used: bool = False
    pipeline_steps: List[PipelineStepResult] = field(default_factory=list)
    authenticity_guarantee: str = (
        "Zero Generative Hallucination • Authentic Weave Texture Preserved • "
        "Non-Synthetic Non-Generative AI Pipeline Only"
    )


class ComputerVisionService:
    """
    Implements Page 3 Studio Enhancement Pipeline (Step 3 of 7-Step Product Wizard):
    1. Background extraction (U²-Net / GrabCut Salient Object Detection)
    2. Lighting and gamma equalization (OpenCV CLAHE in LAB color space)
    3. Centered auto-cropping to standardized 1:1 e-commerce ratio
    4. Visual complexity scoring (used downstream in pricing engine)

    All three transformations are NON-GENERATIVE:
    - No pixels are hallucinated or synthesized by any generative model.
    - The artisan's authentic weave texture, traditional dye colors, and craft fingerprint are preserved.
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
    def _grabcut_fallback(image_bgr: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        GrabCut CPU-only foreground segmentation.
        Used when rembg/U²-Net is unavailable (e.g., offline rural deployment).
        """
        h, w = image_bgr.shape[:2]
        mask = np.zeros((h, w), np.uint8)
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        rect = (int(w * 0.05), int(h * 0.05), int(w * 0.90), int(h * 0.90))

        bg_removed = False
        try:
            cv2.grabCut(image_bgr, mask, rect, bgd_model, fgd_model, 2, cv2.GC_INIT_WITH_RECT)
            mask2 = np.where((mask == 2) | (mask == 0), 0, 255).astype('uint8')
            bg_removed = True
        except Exception:
            mask2 = np.ones((h, w), dtype=np.uint8) * 255

        b, g, r = cv2.split(image_bgr)
        rgba = cv2.merge([b, g, r, mask2])
        return rgba, bg_removed

    @staticmethod
    @non_generative
    def remove_background(image_bgr: np.ndarray) -> Tuple[np.ndarray, bool, bool]:
        """
        Salient foreground segmentation using rembg U²-Net (preferred) or
        OpenCV GrabCut as a CPU-only fallback.

        Returns:
            rgba        – BGRA ndarray with transparent background
            bg_removed  – True when segmentation succeeded
            rembg_used  – True when rembg U²-Net was the active engine
        """
        if not settings.USE_MOCK_AI and _REMBG_AVAILABLE and rembg_remove is not None:
            try:
                # rembg accepts PIL or raw bytes; convert BGR→RGB PIL image
                rgb_pil = Image.fromarray(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
                # rembg returns an RGBA PIL Image with background set to alpha=0
                rgba_pil: Image.Image = rembg_remove(rgb_pil)
                # Convert RGBA PIL → BGRA ndarray (OpenCV channel order)
                rgba_np = np.array(rgba_pil)          # H×W×4 RGBA
                r, g, b, a = rgba_np[:, :, 0], rgba_np[:, :, 1], rgba_np[:, :, 2], rgba_np[:, :, 3]
                bgra = cv2.merge([b, g, r, a])
                return bgra, True, True
            except Exception as exc:  # pragma: no cover
                logger.warning("rembg U²-Net failed (%s), falling back to GrabCut.", exc)

        # GrabCut fallback
        rgba, bg_removed = ComputerVisionService._grabcut_fallback(image_bgr)
        return rgba, bg_removed, False

    @staticmethod
    def crop_to_square(image_rgba: np.ndarray) -> np.ndarray:
        """
        Centers object in a high-res 1:1 square canvas with a pure studio neutral background (#FDFBF7).
        Background color matches the Artify Bharat brand cream canvas.
        """
        h, w = image_rgba.shape[:2]
        size = max(h, w)

        # #FDFBF7 (Raw Silk cream) → BGR → (247, 251, 253)
        STUDIO_BG_BGR = (247, 251, 253)
        square = np.ones((size, size, 4), dtype=np.uint8)
        square[:, :, 0] = STUDIO_BG_BGR[0]
        square[:, :, 1] = STUDIO_BG_BGR[1]
        square[:, :, 2] = STUDIO_BG_BGR[2]
        square[:, :, 3] = 255

        y_offset = (size - h) // 2
        x_offset = (size - w) // 2

        alpha = image_rgba[:, :, 3] / 255.0
        for c in range(3):
            square[y_offset:y_offset + h, x_offset:x_offset + w, c] = (
                alpha * image_rgba[:, :, c] + (1 - alpha) * STUDIO_BG_BGR[c]
            ).astype(np.uint8)

        square[y_offset:y_offset + h, x_offset:x_offset + w, 3] = 255
        return square

    @non_generative
    def enhance_image_with_detail(
        self, image_bytes: bytes, remove_bg: bool = True
    ) -> StudioPipelineResult:
        """
        Executes the end-to-end AI Studio enhancement pipeline and returns a
        fully structured StudioPipelineResult with per-step metadata.

        Pipeline stages:
            1. Visual complexity scoring on raw asset
            2. CLAHE lighting & gamma equalization (LAB color space)
            3. Salient background removal (GrabCut / U²-Net simulation)
               – skipped when remove_bg=False; opaque BGRA canvas used instead
            4. 1:1 square auto-crop on studio neutral canvas

        Args:
            image_bytes: Raw image bytes (JPEG/PNG).
            remove_bg: When False, skip background removal and return a fully
                opaque (alpha=255) BGRA image; background_removed will be False
                and rembg_used will be False in the result.

        Returns: StudioPipelineResult dataclass
        """
        # ------------------------------------------------------------------ #
        # Guard 1 — reject oversized raw bytes before any decode work
        # ------------------------------------------------------------------ #
        max_bytes = settings.CV_MAX_UPLOAD_BYTES
        if len(image_bytes) > max_bytes:
            raise ValueError(
                f"Upload too large: {len(image_bytes):,} bytes exceeds the "
                f"{max_bytes // (1024 * 1024)} MB limit. "
                "Please reduce the image file size before re-uploading."
            )

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        pipeline_steps: List[PipelineStepResult] = []

        if img is None:
            # Fallback for corrupt/empty bytes
            return StudioPipelineResult(
                enhanced_bytes=image_bytes,
                complexity_score=0.50,
                clahe_applied=False,
                background_removed=False,
                crop_applied=False,
                pipeline_steps=[
                    PipelineStepResult(
                        step_name="Image Decode",
                        step_code="image_decode",
                        applied=False,
                        description="Could not decode image bytes (corrupt or unsupported format).",
                        authenticity_note="N/A — image decode failed, original bytes returned."
                    )
                ]
            )

        # ------------------------------------------------------------------ #
        # Guard 2 — reject decoded images that breach either the raw-side limit
        #           or the maximum square-output canvas limit, before any
        #           expensive processing (complexity scoring, CLAHE, segmentation)
        # ------------------------------------------------------------------ #
        decoded_max_side = max(img.shape[0], img.shape[1])
        max_side = settings.CV_MAX_IMAGE_SIDE_PX
        if decoded_max_side > max_side:
            raise ValueError(
                f"Image dimensions too large: longest side {decoded_max_side} px exceeds the "
                f"{max_side} px limit. Please resize the image before re-uploading."
            )
        max_output = settings.CV_MAX_OUTPUT_SIDE_PX
        if decoded_max_side > max_output:
            raise ValueError(
                f"Image too large for square output: longest side {decoded_max_side} px would "
                f"exceed the {max_output} px canvas limit. "
                "Please resize the source image before re-uploading."
            )

        # Step 1: Complexity scoring on raw
        complexity = self.calculate_visual_complexity(img)
        pipeline_steps.append(PipelineStepResult(
            step_name="Visual Complexity Analysis",
            step_code="complexity_scoring",
            applied=True,
            description=(
                f"Canny edge density computed across {img.shape[0]}×{img.shape[1]}px raw image. "
                f"Complexity score: {complexity} (used downstream in Fair-Wage Pricing Engine)."
            ),
            authenticity_note=(
                "Read-only analysis pass — zero pixel modifications. "
                "Score reflects actual artisan craft intricacy (density of handloom booti weave patterns)."
            )
        ))

        # Step 2: CLAHE color equalization
        clahe_applied = False
        try:
            color_corrected = self.equalize_lighting(img)
            clahe_applied = True
            pipeline_steps.append(PipelineStepResult(
                step_name="CLAHE Lighting & Color Equalization",
                step_code="clahe_equalization",
                applied=True,
                description=(
                    "Adaptive histogram equalization applied to L-channel in LAB color space "
                    "(clipLimit=2.0, tileGridSize=8×8). Corrects yellow incandescent village room "
                    "lighting to true natural-daylight dye representation."
                ),
                authenticity_note=(
                    "Non-generative transformation only. Original pixel structure, weave texture, "
                    "and traditional natural dye colors are preserved. No synthetic hallucination."
                )
            ))
        except Exception:
            color_corrected = img
            pipeline_steps.append(PipelineStepResult(
                step_name="CLAHE Lighting & Color Equalization",
                step_code="clahe_equalization",
                applied=False,
                description="CLAHE step skipped due to processing error.",
                authenticity_note="N/A"
            ))

        # Step 3: Background removal (optional)
        if remove_bg:
            rgba, bg_removed, rembg_used = self.remove_background(color_corrected)
            engine_label = "rembg U²-Net (ONNX)" if rembg_used else "OpenCV GrabCut (CPU fallback)"
            step_description = (
                f"{engine_label} separates the craft object from the cluttered village room "
                "background. Strips yellow-lit workshop surroundings and replaces them with a "
                "clean #FDFBF7 Raw Silk studio neutral canvas. Alpha mask applied."
            )
        else:
            # Build fully opaque BGRA without running any segmentation model
            h_cc, w_cc = color_corrected.shape[:2]
            b_ch, g_ch, r_ch = cv2.split(color_corrected)
            alpha_ch = np.full((h_cc, w_cc), 255, dtype=np.uint8)
            rgba = cv2.merge([b_ch, g_ch, r_ch, alpha_ch])
            bg_removed = False
            rembg_used = False
            engine_label = "Skipped (remove_bg=false)"
            step_description = (
                "Background removal skipped by caller request (remove_bg=false). "
                "Fully opaque BGRA canvas produced; original background is preserved."
            )
        pipeline_steps.append(PipelineStepResult(
            step_name="Salient Background Removal",
            step_code="background_removal",
            applied=bg_removed,
            description=step_description,
            authenticity_note=(
                "Non-generative segmentation only. No background pixels are invented, diffused, "
                "or hallucinated. The artisan's authentic weave silhouette and texture are "
                "pixel-accurately preserved throughout."
            )
        ))

        # Step 4: 1:1 square crop
        crop_applied = False
        try:
            studio_ready = self.crop_to_square(rgba)
            crop_applied = True
            pipeline_steps.append(PipelineStepResult(
                step_name="1:1 Square Auto-Crop & Studio Canvas",
                step_code="square_crop",
                applied=True,
                description=(
                    f"Craft object centered on {max(img.shape[0], img.shape[1])}×"
                    f"{max(img.shape[0], img.shape[1])}px studio neutral canvas (#FDFBF7 Raw Silk). "
                    "Standardized 1:1 e-commerce aspect ratio for GeM / ONDC / WhatsApp catalog."
                ),
                authenticity_note=(
                    "Alpha-composite centering only. No generative fill, no inpainting, no diffusion. "
                    "The craft's original silhouette and pixel-accurate texture are preserved."
                )
            ))
        except Exception:
            studio_ready = rgba
            pipeline_steps.append(PipelineStepResult(
                step_name="1:1 Square Auto-Crop & Studio Canvas",
                step_code="square_crop",
                applied=False,
                description="Crop step skipped due to processing error.",
                authenticity_note="N/A"
            ))

        # Encode to PNG
        success, encoded_img = cv2.imencode(".png", studio_ready)
        if not success:
            return StudioPipelineResult(
                enhanced_bytes=image_bytes,
                complexity_score=complexity,
                clahe_applied=clahe_applied,
                background_removed=bg_removed,
                crop_applied=crop_applied,
                rembg_used=rembg_used,
                pipeline_steps=pipeline_steps,
            )

        return StudioPipelineResult(
            enhanced_bytes=encoded_img.tobytes(),
            complexity_score=complexity,
            clahe_applied=clahe_applied,
            background_removed=bg_removed,
            crop_applied=crop_applied,
            rembg_used=rembg_used,
            pipeline_steps=pipeline_steps,
        )

    @non_generative
    def enhance_image(self, image_bytes: bytes) -> Tuple[bytes, float]:
        """
        Compatibility shim for existing callers (e.g. /studio/enhance endpoint).
        Delegates to enhance_image_with_detail() and returns (bytes, float) tuple.
        """
        result = self.enhance_image_with_detail(image_bytes)
        return result.enhanced_bytes, result.complexity_score


cv_service = ComputerVisionService()


# ----------------------------------------------------------------------------
# Ask Dadi (assistant_service) LangChain tool backend — Task 2.7
# Wraps the REAL non-generative AI Studio pipeline so the conversational bot
# can analyze an actual product photo (complexity, lighting, blur) instead of
# giving generic advice. Reuses cv_service functions only — no new CV math here.
# ----------------------------------------------------------------------------

def analyze_craft_photo(image_bytes: bytes) -> Dict[str, Any]:
    """
    Tool backend: run the non-generative studio analysis on a raw product photo.

    Uses the existing ComputerVisionService pipeline functions:
      - calculate_visual_complexity (Canny edge density -> pricing engine input)
      - equalize_lighting (CLAHE in LAB color space)

    Returns a structured dict of metrics plus Dadi-style photo tips, or an
    {'status': 'error', ...} dict for corrupt/undecodable uploads.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    if len(image_bytes) > settings.CV_MAX_UPLOAD_BYTES:
        return {
            "status": "error",
            "error": f"Upload too large: {len(image_bytes):,} bytes.",
            "tip": "Beta, chhoti file bhejiye.",
        }
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {
            "status": "error",
            "error": "Image could not be decoded (corrupt, empty, or unsupported format).",
            "tip": "Beta, photo dobara khicheen — file adhoori lag rahi hai.",
        }

    if max(img.shape[0], img.shape[1]) > settings.CV_MAX_IMAGE_SIDE_PX:
        return {
            "status": "error",
            "error": "Image dimensions too large for analysis.",
            "tip": "Beta, photo ka size kam karke bhejiye.",
        }

    h, w = img.shape[:2]

    # Step 1: raw complexity (the exact score the Fair-Wage Pricing Engine consumes)
    raw_complexity = ComputerVisionService.calculate_visual_complexity(img)

    # Step 2: CLAHE lighting equalization (real studio pipeline step), then
    # measure how much the score improves — a proxy for uneven village lighting.
    clahe_applied = True
    try:
        enhanced = ComputerVisionService.equalize_lighting(img)
        enhanced_complexity = ComputerVisionService.calculate_visual_complexity(enhanced)
    except Exception:
        clahe_applied = False
        enhanced = img
        enhanced_complexity = raw_complexity

    # Step 3: simple quality diagnostics on the ORIGINAL photo
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    avg_brightness = round(float(np.mean(gray)), 1)          # 0=dark ... 255=bright
    blur_variance = round(float(cv2.Laplacian(gray, cv2.CV_64F).var()), 1)  # low = blurry

    is_too_dark = avg_brightness < 70.0
    is_too_bright = avg_brightness > 200.0
    is_likely_blurry = blur_variance < 60.0
    is_square = h == w

    # Dadi-style, metric-driven photo tips (camera advice responsibility)
    tips: List[str] = []
    if is_too_dark:
        tips.append(
            "Photo andheri hai (brightness {b}/255). Beta, din ke ujale me, khidki ke paas "
            "khichein — flash bilkul nahi, woh rang uda deta hai.".format(b=avg_brightness)
        )
    elif is_too_bright:
        tips.append(
            "Photo zyada roshan hai (brightness {b}/255). Seedhi dhoop se hata kar "
            "chhaya wali jagah par khichein.".format(b=avg_brightness)
        )
    else:
        tips.append(
            "Roshni sahi hai (brightness {b}/255) — shabaash! Aise hi natural daylight "
            "me khichte rahiye.".format(b=avg_brightness)
        )
    if is_likely_blurry:
        tips.append(
            "Photo thodi dhundhli lag rahi hai (blur score {v}). Phone ko dono haathon se "
            "thama kar, product ke theek saamne khade hokar khichein.".format(v=blur_variance)
        )
    if not is_square:
        tips.append(
            "Frame {w}x{h}px ka hai. App ka smart camera 1:1 chaukor frame lock karta hai — "
            "usse hi khichein, AI Studio background khud saaf kar dega.".format(w=w, h=h)
        )
    if raw_complexity >= 0.6:
        tips.append(
            "Aapke kaam ki bareeqi (complexity {c}) bahut oonchi hai — iska Sahi fayda "
            "pricing engine me zaroor milega. Kam se kam ek zari/nakkashi ka close-up "
            "photo bhi lagaiye.".format(c=raw_complexity)
        )

    return {
        "status": "success",
        "image_width_px": int(w),
        "image_height_px": int(h),
        "complexity_score": raw_complexity,
        "enhanced_complexity_score": enhanced_complexity,
        "clahe_applied": clahe_applied,
        "avg_brightness_0_to_255": avg_brightness,
        "blur_score_laplacian_variance": blur_variance,
        "is_square_1_to_1": is_square,
        "diagnostics": {
            "too_dark": is_too_dark,
            "too_bright": is_too_bright,
            "likely_blurry": is_likely_blurry,
        },
        "photo_tips": tips,
        "authenticity_note": (
            "Non-generative analysis only (CLAHE + Canny/Laplacian). No pixel was "
            "hallucinated — artisan's authentic weave and dye colors are preserved."
        ),
    }
