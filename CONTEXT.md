# Core Ubiquitous Language & Domain Concepts

## Problem Statement Domain
- **SIH PS 26090**: Digital Business Manager & Digital Gatekeeper for rural weavers and handicraft artisans.
- **Artisan / Weaver**: The primary creator producing GI-certified or traditional handloom goods.
- **Craft Cluster**: Recognized regional cluster (e.g., Varanasi Handloom Cluster, Kashmir Pashmina Cluster, Madhubani Art Cluster).
- **TRIFED / Pehchan ID**: Official Indian government artisan identification credentials.
- **Geographical Indication (GI)**: Government certification of authenticity and geographic origin (e.g., Banarasi Brocade & Saree GI Reg #39).

## Technical Core Concepts
- **Digital Heritage Passport**: A tamper-evident cryptographic provenance record linking artisan identity, craft metadata, geo-coordinates, timestamp, and product cost into a deterministic SHA-256 digest.
- **Studio Enhancement**: Automatic salient object segmentation (U²-Net), lighting/gamma equalization (OpenCV CLAHE), and centered 1:1 auto-cropping on a pure white canvas.
- **Voice Auto-Cataloger**: Pipeline converting regional dialect speech (Bhojpuri, Maithili, Hindi) via Whisper ASR and IndicTrans2 into English, parsed into structured titles and SEO tags via Mistral-7B LLM.
- **Fair Wage Floor**: Minimum labor compensation calculated as `labor_days * daily_wage_benchmark` that cannot be undercut by algorithmic pricing.
- **Multi-Channel Adapters**: Transformation engines exporting internal catalog specifications to GeM (XML/CSV) and ONDC (Beckn Protocol JSON).
