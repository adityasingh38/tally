# Shipframe screenshots

`export/01.png`–`05.png` are Signal-theme iPhone marketing mockups with Tally's
default accent (`#FF5436`). They were exported from Shipframe at 1320×2868.
The free Shipframe export includes its watermark.

The images inside the frames are synthetic Tally screen renders from
`scripts/generate_shipframe_screenshots.py`, which uses the bundled app fonts.
They are not captures of a running iOS build. Tally currently targets Android.
The generator writes its unframed inputs to this directory; the ZIP contains
the five Shipframe exports.

Run `python scripts/generate_shipframe_screenshots.py` to refresh the input
screens, then replace their images in the Shipframe project and export again.
