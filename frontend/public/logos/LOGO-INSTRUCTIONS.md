# Marketplace Logo Installation

## Quick Setup

### Option 1: Save the provided logo images

The user has provided official ONDC and GeM logos. Please save them as:

1. **ONDC Logo** (blue hands in circle):
   - Save as: `frontend/public/logos/ondc-logo.png`
   - Format: PNG with transparent background
   - Recommended size: 512x512px

2. **GeM Logo** (colorful star/pinwheel):
   - Save as: `frontend/public/logos/gem-logo.png`  
   - Format: PNG with transparent background
   - Recommended size: 512x512px

### Option 2: Download from official sources

If you need to re-download:
- **ONDC**: https://ondc.org (check their brand assets/media kit)
- **GeM**: https://gem.gov.in (check their about/downloads section)

## Logo Specifications

### ONDC Logo
- **Design**: 6 colorful hands forming a circle
- **Colors**: Blue primary (#0066CC), with hands in red, orange, yellow, green, light blue, dark blue
- **Text**: "ONDC - Open Network for Digital Commerce"
- **Style**: Modern, inclusive, connected

### GeM Logo  
- **Design**: Colorful pinwheel/star made of triangular shapes
- **Colors**: Orange, blue, green, yellow triangles
- **Text**: "GeM - Government e Marketplace"
- **Tagline**: "Efficient • Transparent • Inclusive"
- **Style**: Government-official, professional, trustworthy

## How the Logos Are Used

The logos appear in the success screen after product publishing:

```
┌─────────────────────────────────┐
│ [ONDC Logo]  ONDC Network       │
│ ✓ Published                     │
│ Ready for buyer orders          │
│ View Listing →                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ [GeM Logo]  Government          │
│ e-Marketplace                   │
│ ✓ Listed                        │
│ Available for government buyers │
│ View Listing →                  │
└─────────────────────────────────┘
```

## Fallback Design

If logos are not found, the app automatically displays styled fallback badges:

- **ONDC**: Blue gradient badge with "ONDC" text
- **GeM**: Multi-color gradient (orange→green→blue) badge with "GeM" text

These fallbacks match the official brand colors closely.

## Brand Guidelines

- Use only official logos from ONDC and GeM brand assets
- Do not modify, crop, recolor, or recreate the logos
- Maintain aspect ratio and minimum size requirements
- Follow official brand guidelines for proper usage
- The logos are displayed at 48x48px (12rem square container)

## File Locations

```
frontend/public/logos/
  ├── ondc-logo.png          (Official ONDC logo - REQUIRED)
  ├── gem-logo.png           (Official GeM logo - REQUIRED)
  ├── LOGO-INSTRUCTIONS.md   (This file)
  └── README.md              (General logos README)
```

## Testing

After adding the logos:
1. Refresh the application (hard refresh: Ctrl+Shift+R)
2. Complete the product onboarding flow
3. Check the success screen shows both logos clearly
4. If logos don't appear, check browser console for 404 errors
5. Verify fallback badges appear if logos are missing
