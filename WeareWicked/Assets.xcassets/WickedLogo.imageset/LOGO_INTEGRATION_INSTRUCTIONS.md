# Wicked Donuts Logo Integration Instructions

## Logo Files Needed

Please add these logo files to the `/Users/mightybear/Desktop/WeareWicked/WeareWicked/Assets.xcassets/WickedLogo.imageset/` directory:

1. **wicked-logo.png** (1x - base resolution)
2. **wicked-logo@2x.png** (2x - high resolution) 
3. **wicked-logo@3x.png** (3x - ultra high resolution)

## Logo Specifications

Based on your logo description, here are the recommended specifications:

### Color Palette (from your logo):
- **Primary Red**: #E03C4B (devil girl and "Las Vegas" text)
- **Pure Black**: #000000 (outlines, hair, frosting)
- **Pure White**: #FFFFFF (text, border, sprinkles)
- **Light Grey**: #D3D3D3 (donut base)

### Recommended Sizes:
- **1x**: 200x200 pixels (base)
- **2x**: 400x400 pixels (high resolution)
- **3x**: 600x600 pixels (ultra high resolution)

## Brand Colors Updated

I've updated your `BrandColors.swift` to match the logo's color palette:

- `brandPrimary`: Deep red from the devil girl (#E03C4B)
- `brandText`: Pure black (#000000)
- `brandWhite`: Pure white (#FFFFFF)
- `brandSurface`: Light grey (#D3D3D3)
- `brandBackground`: Very light grey (#F8F8F8)

## Next Steps

1. Add your logo image files to the WickedLogo.imageset directory
2. The app will automatically use your actual logo instead of the placeholder
3. All brand colors throughout the app will match your logo's palette

Your logo will appear in:
- Opening screen
- Main menu header
- Account profile
- Store finder
- Profile edit
- Order start page

The logo is already integrated throughout the app - just add the image files!
