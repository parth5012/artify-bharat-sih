# Background Removal & AI Studio Pipeline — Complete Reference
Source: `legacy/backend/app/services/cv_service.py` · `legacy/backend/app/api/v1/studio.py` · `legacy/backend/app/core/anti_generative.py` · `frontend/backend/studio/process.py`

## 1. Overview
The AI Studio Enhancement Pipeline is a 4-stage, non-generative image processor. It takes a raw artisan photo (from a phone camera) and outputs a studio-quality, e-commerce-ready PNG/JPEG.

**Core Guarantees:**
- No generative AI / diffusion / inpainting is used at any stage.
- Every pixel in the output craft comes directly from the original photograph.
- Anti-generative guard raises `NonGenerativeViolationError` / `RuntimeError` if banned generative packages are present in `sys.modules`.

---

## 2. Pipeline Stages (in order)

```
Raw photo bytes
      │
      ▼
[Stage 1] Visual Complexity Scoring  ──────► float score (0.3 – 0.95)
      │
      ▼
[Stage 2] CLAHE Lighting Equalization ──────► color-corrected BGR ndarray
      │
      ▼
[Stage 3] Background Removal ──────────────► BGRA ndarray (alpha mask)
      │         ├── PRIMARY:  rembg U²-Net (ONNX, deep learning)
      │         └── FALLBACK: OpenCV GrabCut (CPU-only, no model download)
      ▼
[Stage 4] 1:1 Square Crop & Canvas ────────► studio-ready BGRA composite
      │
      ▼
Output PNG/JPEG bytes  +  StudioPipelineResult dataclass / JSON response
```

---

## 3. Stage Details

### Stage 1 — Visual Complexity Scoring
**Files:** `legacy/backend/app/services/cv_service.py#L71`, `frontend/backend/studio/process.py#L86`

```python
gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 100, 200)
edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
complexity = min(0.95, max(0.30, float(edge_density * 8.0)))
```

- Uses Canny edge detector (thresholds 100, 200) to count edge pixels.
- `edge_density` = fraction of pixels that are edges.
- Score clamped to `[0.30, 0.95]` and multiplied by 8.0 to distribute across pricing tiers.
- Feeds into Fair-Wage Pricing Engine (high complexity $\rightarrow$ premium artisan wage multiplier).
- Read-only — zero pixel modifications.

---

### Stage 2 — CLAHE Lighting Equalization
**Files:** `legacy/backend/app/services/cv_service.py#L85`, `frontend/backend/studio/process.py#L101`

```python
lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
l, a, b = cv2.split(lab)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
cl = clahe.apply(l)
limg = cv2.merge((cl, a, b))
enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
```

**What it does:**
- Converts BGR $\rightarrow$ LAB color space.
- Only touches the `L` (Lightness) channel — color hue and saturation (`A`, `B`) channels remain untouched.
- Applies CLAHE (Contrast Limited Adaptive Histogram Equalization) to correct yellow incandescent village lighting.
- Converts back to BGR.

**Why LAB instead of RGB/HSV?**
LAB separates luminance from chromaticity, so equalization never artificially shifts hues. Natural dye colors of handloom products and traditional weaves are preserved exactly.

| Parameter | Value | Effect |
| :--- | :--- | :--- |
| `clipLimit` | `2.0` | Limits contrast amplification (prevents noise boost) |
| `tileGridSize` | `(8, 8)` | Local tiles — avoids global over-brightening |

---

### Stage 3 — Background Removal (The Core)
**Files:** `legacy/backend/app/services/cv_service.py#L122`, `frontend/backend/studio/process.py#L118`

Two engines, automatic fallback:

#### Primary: rembg U²-Net (ONNX)
```python
from rembg import remove as rembg_remove

rgb_pil = Image.fromarray(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB))
rgba_pil: Image.Image = rembg_remove(rgb_pil)       # returns RGBA PIL
rgba_np = np.array(rgba_pil)                          # H×W×4 RGBA
r, g, b, a = rgba_np[:,:,0], rgba_np[:,:,1], rgba_np[:,:,2], rgba_np[:,:,3]
bgra = cv2.merge([b, g, r, a])                        # OpenCV BGRA order
```
- Runs U²-Net (salient object detection neural net) via ONNX Runtime CPU.
- Returns an RGBA PIL Image where background pixels have `alpha=0`.
- Channel swap required: PIL is RGBA, OpenCV is BGRA.
- Returns `(bgra_ndarray, bg_removed=True, rembg_used=True)`.
- On first run, downloads ONNX model (~170 MB) to `~/.u2net/`.

#### Fallback: OpenCV GrabCut (CPU-only)
```python
mask = np.zeros((h, w), np.uint8)
bgd_model = np.zeros((1, 65), np.float64)
fgd_model = np.zeros((1, 65), np.float64)
rect = (int(w*0.05), int(h*0.05), int(w*0.90), int(h*0.90))   # 5% margin
cv2.grabCut(image_bgr, mask, rect, bgd_model, fgd_model, 2, cv2.GC_INIT_WITH_RECT)
mask2 = np.where((mask == 2) | (mask == 0), 0, 255).astype('uint8')
b, g, r = cv2.split(image_bgr)
rgba = cv2.merge([b, g, r, mask2])
```
- No model download needed — classical CV, works fully offline in rural environments.
- Assumes craft foreground is within the central 90% of the frame.
- Mask values: `0=bg`, `1=fg`, `2=probable-bg`, `3=probable-fg`. After GrabCut: `2|0 → alpha=0`, `1|3 → alpha=255`.
- Always available when ONNX/rembg cannot be loaded or when `USE_MOCK_AI=true`.

#### Fallback Decision Logic
```python
_REMBG_AVAILABLE = False
try:
    from rembg import remove as rembg_remove
    _REMBG_AVAILABLE = True
except Exception:
    rembg_remove = None

# In remove_background():
if not settings.USE_MOCK_AI and _REMBG_AVAILABLE and rembg_remove is not None:
    # → Use rembg
else:
    # → Use GrabCut fallback
```

---

### Stage 4 — 1:1 Square Crop & Studio Canvas
**Files:** `legacy/backend/app/services/cv_service.py#L153`, `frontend/backend/studio/process.py#L168`

```python
size = max(h, w)                          # square side = longest dimension
STUDIO_BG_BGR = (247, 251, 253)           # #FDFBF7 Raw Silk cream in BGR order
square = np.ones((size, size, 4), dtype=np.uint8)
square[:, :, :3] = STUDIO_BG_BGR          # fill background with brand cream
square[:, :, 3] = 255                      # fully opaque

# Alpha-composite the craft object centered on the canvas
y_offset = (size - h) // 2
x_offset = (size - w) // 2
alpha = image_rgba[:, :, 3] / 255.0       # 0.0–1.0 alpha mask
for c in range(3):
    square[y_offset:y_offset+h, x_offset:x_offset+w, c] = (
        alpha * image_rgba[:, :, c] + (1 - alpha) * STUDIO_BG_BGR[c]
    ).astype(np.uint8)
```

- No destructive scaling — object dimensions preserved, padded to square.
- Alpha-composite formula: $\text{out} = \alpha \times \text{fg} + (1-\alpha) \times \text{bg}$.
- Output is always a 1:1 ratio conforming to GeM / ONDC / WhatsApp catalog standards.
- Background color `#FDFBF7` matches the ArtifyBharat brand cream canvas.

---

## 4. Data Structures

### `StudioPipelineResult` (Dataclass)
```python
@dataclass
class StudioPipelineResult:
    enhanced_bytes: bytes          # Final PNG/JPEG bytes
    complexity_score: float        # 0.30–0.95
    clahe_applied: bool
    background_removed: bool
    crop_applied: bool
    rembg_used: bool               # True=U²-Net, False=GrabCut or skip
    pipeline_steps: List[PipelineStepResult]
    authenticity_guarantee: str
```

### `PipelineStepResult` (Per-stage Metadata)
```python
@dataclass
class PipelineStepResult:
    step_name: str          # e.g. "CLAHE Lighting & Color Equalization"
    step_code: str          # e.g. "clahe_equalization"
    applied: bool
    description: str
    authenticity_note: str
```

---

## 5. API Endpoints

### `POST /api/v1/studio/enhance-studio` (Stateless Backend)
**File:** `legacy/backend/app/api/v1/studio.py#L59`

- **Content-Type:** `multipart/form-data`
  - `image`: `UploadFile` (JPEG/PNG)
  - `product_id`: `str` (optional)
  - `remove_bg`: `bool` (default=true)

```python
loop = asyncio.get_event_loop()
pipeline_result = await loop.run_in_executor(
    None,
    functools.partial(cv_service.enhance_image_with_detail, raw_bytes, remove_bg=remove_bg),
)
```

### `POST /api/studio/enhance` (Next.js Standalone Worker Proxy)
**File:** `frontend/app/api/studio/enhance/route.ts`
- Invokes `frontend/backend/studio/process.py` via python sub-process.
- Returns JSON with `studioSrc` (data URL), `engineUsed`, `complexityScore`, `pipelineSteps`, `authenticityGuarantee`.

---

## 6. Anti-Generative Guard
**File:** `legacy/backend/app/core/anti_generative.py`

A `@non_generative` decorator wraps every studio pipeline method. Scans `sys.modules` for banned generative libraries (`openai`, `diffusers`, `stability_sdk`, `replicate`, `anthropic`, `controlnet`, `sdxl`).

```python
@non_generative
def remove_background(...): ...

@non_generative
def enhance_image_with_detail(...): ...
```

---

## 7. Dependencies

```toml
# pyproject.toml / requirements.txt
rembg[cpu]>=2.0.57    # U²-Net ONNX background removal (CPU)
opencv-headless       # CLAHE, GrabCut, color space ops
Pillow                # PIL Image (rembg I/O)
numpy                 # ndarray ops
```

---

## 8. Configuration Flags (`app/config.py`)

| Setting | Default | Purpose |
| :--- | :--- | :--- |
| `USE_MOCK_AI` | `false` | When `true`, skips rembg and forces GrabCut (CI/tests) |
| `CV_MAX_UPLOAD_BYTES` | `10 MB` | Rejects oversized uploads before decode |
| `CV_MAX_IMAGE_SIDE_PX` | `4096` | Rejects images exceeding maximum processing side |
| `CV_MAX_OUTPUT_SIDE_PX` | `4096` | Prevents canvas overflow |

---

## 9. Test Verification

- `legacy/backend/tests/test_ai_studio.py`:
  - `test_cv_pipeline_rembg_used_flag`: Checks `rembg_used` flag accuracy.
  - `test_ai_studio_endpoint_rembg_flag`: Checks API response metadata.
- Set `USE_MOCK_AI=true` to force GrabCut in fast test environments.
- Fast suite command: `uv run pytest -v -m "not slow"`
