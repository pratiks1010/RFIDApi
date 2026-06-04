# Optional extra reader SDK files

Place any additional `.dll` files from your UHF reader manufacturer here before building the desktop installer.
They are copied into the published `rfid-bridge` folder automatically.

Required files (must be in `rfid-bridge/` root, not only here):

- `UHFAPI.dll`
- `UHFControl.dll`
- `libusb-1.0.dll`
