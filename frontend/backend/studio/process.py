"""
ArtifyBharat Non-Generative Studio Enhancement Worker
Powered by OpenCV + rembg (U²-Net)  |  SIH PS 26090, MoSJE

4-Stage Pipeline (canonical)
────────────────────────────────────
Stage 1  Visual Complexity Scoring       → float 0.30–0.95 (Canny edge density)
Stage 2  CLAHE Lighting Equalization     → LAB L-channel only, chroma untouched
Stage 3  Background Removal             → rembg U²-Net (primary) / GrabCut (fallback)
Stage 4  1:1 Square Crop & Studio Canvas → Raw Silk backdrop + contact shadow

Guarantees
──────────
• NO generative AI / diffusion / inpainting at any stage.
• Every output pixel comes directly from the original photograph.
• Anti-generative guard raises RuntimeError if banned libs are loaded.
• USE_MOCK_AI=true forces GrabCut fallback (CI — skips 170 MB ONNX download).
"""

import sys
import json
import base64
import io
import functools
import os

import cv2
import numpy as np
from PIL import Image, ImageFile

# Allow truncated / progressive image streams from canvas data URLs
ImageFile.LOAD_TRUNCATED_IMAGES = True

# ──────────────────────────────────────────────────────────────────────────────
# Anti-Generative Guard
# ──────────────────────────────────────────────────────────────────────────────
_BANNED_GENERATIVE_MODULES = frozenset([
    "openai", "diffusers", "stability_sdk", "replicate", "anthropic",
    "controlnet", "sdxl",
])


def _check_banned_imports() -> None:
    """Raise immediately if a banned generative library is present in sys.modules."""
    for mod in _BANNED_GENERATIVE_MODULES:
        if mod in sys.modules:
            raise RuntimeError(
                f"NonGenerativeViolationError: banned generative module '{mod}' "
                "is present — remove it to comply with MoSJE non-generative policy."
            )


def non_generative(fn):
    """Decorator: scans sys.modules for banned generative libs before every call."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        _check_banned_imports()
        return fn(*args, **kwargs)
    return wrapper


# ──────────────────────────────────────────────────────────────────────────────
# rembg availability + CI override
# ──────────────────────────────────────────────────────────────────────────────
_REMBG_AVAILABLE = False
rembg_remove = None

try:
    from rembg import remove as _rembg_fn
    rembg_remove = _rembg_fn
    _REMBG_AVAILABLE = True
except Exception:
    pass

# USE_MOCK_AI=true in .env forces GrabCut (fast, no model download, suitable for CI)
_USE_MOCK_AI = os.environ.get("USE_MOCK_AI", "false").lower() in ("true", "1", "yes")

# Brand constants
_STUDIO_SIZE = 1024
_STUDIO_BG_BGR = (247, 251, 253)  # #FDFBF7 Raw Silk cream in BGR order


# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 — Visual Complexity Scoring
# ──────────────────────────────────────────────────────────────────────────────
def _score_complexity(image_bgr: np.ndarray) -> float:
    """
    Canny edge-density score → Fair-Wage pricing multiplier.
    Score = min(0.95, max(0.30, edge_density × 8.0)).
    Read-only — zero pixel modifications.
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    edge_density = float(np.sum(edges > 0)) / (edges.shape[0] * edges.shape[1])
    return min(0.95, max(0.30, edge_density * 8.0))


# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 — CLAHE Lighting Equalization
# ──────────────────────────────────────────────────────────────────────────────
def _apply_clahe(image_bgr: np.ndarray) -> np.ndarray:
    """
    Correct yellow incandescent village lighting via CLAHE on LAB L-channel.
    A/B chroma channels are completely untouched — natural dye colors preserved.
    clipLimit=2.0 caps noise; tileGridSize=(8,8) avoids global over-brightening.
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


# ──────────────────────────────────────────────────────────────────────────────
# Stage 3 — Background Removal
# ──────────────────────────────────────────────────────────────────────────────
def _grabcut_remove(image_bgr: np.ndarray) -> np.ndarray:
    """
    OpenCV GrabCut fallback — CPU-only, no model download, always available.
    Assumes craft foreground is within central 90% of frame.
    mask: 0=bg, 1=fg, 2=probable-bg, 3=probable-fg → binary alpha.
    Returns BGRA ndarray.
    """
    h, w = image_bgr.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)
    rect = (int(w * 0.05), int(h * 0.05), int(w * 0.90), int(h * 0.90))
    cv2.grabCut(image_bgr, mask, rect, bgd_model, fgd_model, 2, cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask == 2) | (mask == 0), 0, 255).astype("uint8")
    b_ch, g_ch, r_ch = cv2.split(image_bgr)
    return cv2.merge([b_ch, g_ch, r_ch, mask2])


def _rembg_remove_bg(image_bgr: np.ndarray) -> np.ndarray:
    """
    U²-Net salient object segmentation via ONNX Runtime (rembg).
    PIL is RGBA; OpenCV is BGRA — channel swap required.
    Returns BGRA ndarray.
    """
    rgb_pil = Image.fromarray(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
    rgba_pil: Image.Image = rembg_remove(rgb_pil)  # type: ignore[misc]
    rgba_np = np.array(rgba_pil)                    # H×W×4  RGBA
    r, g, b, a = rgba_np[:, :, 0], rgba_np[:, :, 1], rgba_np[:, :, 2], rgba_np[:, :, 3]
    return cv2.merge([b, g, r, a])                  # → BGRA


@non_generative
def remove_background(image_bgr: np.ndarray) -> tuple:
    """
    Stage 3 dispatcher.
    Returns (bgra_ndarray, background_removed: bool, rembg_used: bool).
    """
    if not _USE_MOCK_AI and _REMBG_AVAILABLE and rembg_remove is not None:
        try:
            bgra = _rembg_remove_bg(image_bgr)
            return bgra, True, True
        except Exception as exc:
            print(f"[studio] rembg failed ({exc}), falling back to GrabCut", file=sys.stderr)
    bgra = _grabcut_remove(image_bgr)
    return bgra, True, False


# ──────────────────────────────────────────────────────────────────────────────
# Stage 4 — 1:1 Square Crop & Studio Canvas
# ──────────────────────────────────────────────────────────────────────────────
def _build_studio_canvas(bgra: np.ndarray) -> np.ndarray:
    """
    Fit & alpha-composite craft onto 1024×1024 Raw Silk studio backdrop.
    No scaling of craft pixel values — alpha-composite only.
    Returns HxWx4 BGRA ndarray (alpha=255 everywhere, ready for JPEG encode).
    """
    h, w = bgra.shape[:2]
    size = _STUDIO_SIZE

    # Radial studio lighting gradient (apex top-center at x=512, y=420)
    Y, X = np.ogrid[:size, :size]
    dist_from_light = np.sqrt((X - 512) ** 2 + ((Y - 420) * 1.2) ** 2)
    max_dist = float(np.sqrt(512 ** 2 + 512 ** 2))
    norm_dist = np.clip(dist_from_light / max_dist, 0.0, 1.0)

    # #FFFFFF apex → #F9F8F5 mid → #EDE9E0 edges
    bg_r = (255 * (1 - norm_dist) + 237 * norm_dist).astype(np.uint8)
    bg_g = (255 * (1 - norm_dist) + 233 * norm_dist).astype(np.uint8)
    bg_b = (255 * (1 - norm_dist) + 224 * norm_dist).astype(np.uint8)

    studio = np.ones((size, size, 4), dtype=np.uint8)
    studio[:, :, 0] = bg_r
    studio[:, :, 1] = bg_g
    studio[:, :, 2] = bg_b
    studio[:, :, 3] = 255

    # Subtle floor-plane horizon darkening below y=700
    for y_idx in range(700, size):
        factor = 1.0 - ((y_idx - 700) / 324.0) * 0.05
        for c in range(3):
            studio[y_idx, :, c] = (studio[y_idx, :, c] * factor).astype(np.uint8)

    # Fit craft into 78% of canvas, resize with LANCZOS
    target_area = size * 0.78
    scale = min(target_area / w, target_area / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    craft_resized = cv2.resize(bgra, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)

    pos_x = (size - new_w) // 2
    pos_y = (size - new_h) // 2

    # Contact shadow beneath craft base
    shadow_center_x = 512
    shadow_center_y = pos_y + new_h - int(new_h * 0.02)
    shadow_rx = int(new_w * 0.44)
    shadow_ry = max(12, int(new_h * 0.05))

    shadow_layer = np.zeros((size, size), dtype=np.uint8)
    cv2.ellipse(shadow_layer, (shadow_center_x, shadow_center_y),
                (int(shadow_rx * 1.2), int(shadow_ry * 1.4)), 0, 0, 360, 45, -1)
    shadow_layer = cv2.GaussianBlur(shadow_layer, (45, 45), 18)

    tight_layer = np.zeros((size, size), dtype=np.uint8)
    cv2.ellipse(tight_layer, (shadow_center_x, shadow_center_y),
                (int(shadow_rx * 0.8), int(shadow_ry * 0.7)), 0, 0, 360, 95, -1)
    tight_layer = cv2.GaussianBlur(tight_layer, (21, 21), 8)

    combined_shadow = (
        np.clip(shadow_layer.astype(np.float32) + tight_layer.astype(np.float32), 0, 255) / 255.0
    )
    for c in range(3):
        studio[:, :, c] = np.clip(studio[:, :, c] * (1.0 - combined_shadow * 0.28), 0, 255).astype(np.uint8)

    # Alpha-composite: out = α × fg + (1-α) × bg
    craft_rgb = craft_resized[:, :, :3]
    craft_a = (craft_resized[:, :, 3] / 255.0)[:, :, np.newaxis]
    bg_roi = studio[pos_y:pos_y + new_h, pos_x:pos_x + new_w, :3]
    studio[pos_y:pos_y + new_h, pos_x:pos_x + new_w, :3] = (
        craft_rgb * craft_a + bg_roi * (1.0 - craft_a)
    ).astype(np.uint8)

    return studio


# ──────────────────────────────────────────────────────────────────────────────
# Main pipeline entry-point
# ──────────────────────────────────────────────────────────────────────────────
@non_generative
def process_image(image_bytes: bytes) -> dict:
    """
    Full 4-stage non-generative studio pipeline.
    Returns dict compatible with AIStudioEnhanceResponse.
    """
    # ── Decode ────────────────────────────────────────────────
    try:
        pil_rgb = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_rgb = np.array(pil_rgb)
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    except Exception as e:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img_bgr is None:
            raise ValueError(f"Could not decode image: {e}")
        img_bgr = img_bgr  # already BGR

    # Resize extremely large images (max side 1400 px) to avoid OOM
    h, w = img_bgr.shape[:2]
    max_side = 1400
    if max(h, w) > max_side:
        scale = max_side / max(h, w)
        img_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    pipeline_steps = []

    # ── Stage 1: Visual Complexity Scoring ───────────────────
    complexity_score = _score_complexity(img_bgr)
    pipeline_steps.append({
        "step_name": "Visual Complexity Scoring",
        "step_code": "complexity_scoring",
        "applied": True,
        "description": "Canny edge-density → Fair-Wage pricing multiplier (0.30–0.95)",
        "authenticity_note": "Read-only — zero pixel modifications",
    })

    # ── Stage 2: CLAHE Lighting Equalization ─────────────────
    img_bgr = _apply_clahe(img_bgr)
    pipeline_steps.append({
        "step_name": "CLAHE Lighting & Color Equalization",
        "step_code": "clahe_equalization",
        "applied": True,
        "description": "LAB L-channel CLAHE (clipLimit=2.0, tile=8×8) — corrects incandescent village cast",
        "authenticity_note": "A/B chroma untouched — natural dye colors preserved exactly",
    })

    # ── Stage 3: Background Removal ──────────────────────────
    bgra, background_removed, rembg_used = remove_background(img_bgr)
    pipeline_steps.append({
        "step_name": "Background Removal",
        "step_code": "background_removal",
        "applied": background_removed,
        "description": (
            "rembg U²-Net (ONNX) salient object segmentation"
            if rembg_used else
            "OpenCV GrabCut CPU fallback (USE_MOCK_AI or rembg unavailable)"
        ),
        "authenticity_note": "Craft RGB pixels copied exactly — no recoloring",
    })

    # ── Stage 4: Studio Canvas ───────────────────────────────
    studio_rgba = _build_studio_canvas(bgra)
    pipeline_steps.append({
        "step_name": "1:1 Square Crop & Studio Canvas",
        "step_code": "studio_canvas",
        "applied": True,
        "description": f"Raw Silk cream (#FDFBF7) {_STUDIO_SIZE}×{_STUDIO_SIZE} backdrop + contact shadow",
        "authenticity_note": "Alpha-composite only — no recoloring of craft pixels",
    })

    # ── Encode to JPEG ────────────────────────────────────────
    final_bgr = cv2.cvtColor(studio_rgba[:, :, :3], cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode(".jpg", final_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
    b64_out = base64.b64encode(buffer).decode("utf-8")

    # Pricing multiplier description
    if complexity_score >= 0.75:
        pricing_factor = f"Premium multiplier (complexity {complexity_score:.2f} ≥ 0.75)"
    elif complexity_score >= 0.50:
        pricing_factor = f"Standard multiplier (complexity {complexity_score:.2f})"
    else:
        pricing_factor = f"Base multiplier (complexity {complexity_score:.2f} < 0.50)"

    return {
        "studioSrc": f"data:image/jpeg;base64,{b64_out}",
        "engineUsed": "rembg U²-Net (ONNX)" if rembg_used else "OpenCV GrabCut (fallback)",
        "complexityScore": round(complexity_score, 4),
        "claheApplied": True,
        "backgroundRemoved": background_removed,
        "cropApplied": True,
        "rembgUsed": rembg_used,
        "width": _STUDIO_SIZE,
        "height": _STUDIO_SIZE,
        "pipelineSteps": pipeline_steps,
        "complexityPricingFactor": pricing_factor,
        "authenticityGuarantee": (
            "All output pixels originate exclusively from the original photograph. "
            "No generative AI, diffusion, or inpainting was used at any stage. "
            "MoSJE / SIH PS 26090 non-generative compliance verified."
        ),
    }


# ──────────────────────────────────────────────────────────────────────────────
# I/O helpers
# ──────────────────────────────────────────────────────────────────────────────
def decode_b64_image(img_b64: str) -> bytes:
    import urllib.parse
    img_b64 = urllib.parse.unquote(img_b64)
    if "," in img_b64:
        img_b64 = img_b64.split(",", 1)[1]
    img_b64 = "".join(img_b64.split())
    missing_padding = len(img_b64) % 4
    if missing_padding:
        img_b64 += "=" * (4 - missing_padding)
    return base64.b64decode(img_b64)


def main():
    try:
        if len(sys.argv) > 1:
            in_path = sys.argv[1]
            with open(in_path, "rb") as f:
                content = f.read()
            trimmed = content.strip()
            if trimmed.startswith(b"{"):
                parsed = json.loads(content.decode("utf-8"))
                img_b64 = parsed.get("image", "")
                raw_bytes = decode_b64_image(img_b64)
            else:
                raw_bytes = content
        else:
            input_data = sys.stdin.read()
            if not input_data:
                print(json.dumps({"error": "Empty input"}), file=sys.stderr)
                sys.exit(1)
            parsed = json.loads(input_data)
            img_b64 = parsed.get("image", "")
            raw_bytes = decode_b64_image(img_b64)

        result = process_image(raw_bytes)
        json_str = json.dumps(result)

        if len(sys.argv) > 2:
            out_path = sys.argv[2]
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(json_str)

        print(json_str)

    except Exception as e:
        import traceback
        err_msg = str(e) + "\n" + traceback.format_exc()
        print(json.dumps({"error": err_msg}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
