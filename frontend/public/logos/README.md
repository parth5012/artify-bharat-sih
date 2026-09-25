# Marketplace Logos

This directory contains official logos for marketplace integrations.

## Required Files

### ONDC Logo
- **File**: `ondc-logo.png`
- **Source**: Official ONDC brand assets
- **URL**: https://ondc.org
- **Recommended size**: 256x256px or larger (will be displayed at 32x32px)
- **Format**: PNG with transparent background

### GeM Logo  
- **File**: `gem-logo.png`
- **Source**: Government e-Marketplace official brand assets
- **URL**: https://gem.gov.in
- **Recommended size**: 256x256px or larger (will be displayed at 32x32px)
- **Format**: PNG with transparent background

## Usage

The logos are displayed in the publishing success screen (`PublishingFlow.tsx`) to show artisans where their products are listed.

## Fallback

If logos are not found, the component will display text fallbacks:
- ONDC: "ON" text badge
- GeM: "GeM" text badge

## License

Official marketplace logos are property of their respective organizations. Use only official assets as provided by ONDC and GeM.
