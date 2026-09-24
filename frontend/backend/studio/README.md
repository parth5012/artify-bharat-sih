# AI Studio Service Boundary

The Studio receives the original artisan photo and returns a derived marketplace image. The processing service should run OpenCV for framing and lighting, and `rembg` with the U²-Net model for background removal.

## Required Pipeline

1. Preserve the original image unchanged.
2. Validate file type, dimensions, and size.
3. Use OpenCV for orientation, crop, lighting, and quality checks.
4. Use `rembg`/U²-Net only for background removal; never alter the craft itself.
5. Return the derived image, processing version, and a quality report.
6. Require artisan approval before publishing the derived image.

The Next.js frontend currently exposes this boundary through the capture review flow and `EnhanceView`. Add the service URL and authenticated upload proxy when the Python worker is deployed.

For the full 4-stage pipeline specification, anti-generative guards, and fallback mechanics, see [docs/studio-pipeline-reference.md](../../../docs/studio-pipeline-reference.md).