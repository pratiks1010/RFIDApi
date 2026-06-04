# RFID Bridge (Console)

Minimal console bridge to test reader control with `UHFAPI.dll`.

## Prerequisites (developer build machine)

Copy these DLLs from your UHF reader vendor SDK into `rfid-bridge/`:

- `UHFAPI.dll`
- `libusb-1.0.dll`
- `UHFControl.dll`

Optional extra vendor DLLs: `rfid-bridge/sdk/*.dll`

## Desktop installer (end users)

`npm run build:electron:offline` (or online) automatically:

1. Publishes `rfid-bridge` with all SDK DLLs
2. Downloads Microsoft **VC++ 2015–2022 x64** into the installer
3. Runs the VC++ installer during Setup (so `UHFAPI.dll` loads on a new PC)

End users only run **Setup.exe** — no manual DLL copy.

USB tray still needs Windows to expose a **COM port** (plug reader in after install; use the same COM/baud as RFID Tray Connect).

## Build

```powershell
npm run build:bridge
# or
dotnet build .\rfid-bridge\rfid-bridge.csproj
```

## Run

```powershell
dotnet run --project .\rfid-bridge\rfid-bridge.csproj
```

If you see `Unable to load DLL 'UHFAPI.dll'`, one of the above dependency DLLs is missing.

## Commands

- `connect-tcp <ip> <port>`
- `connect-usb`
- `connect-serial <comNumber> <baud>`
- `start`
- `stop`
- `disconnect`
- `status`
- `help`
- `exit`

## Example

```text
connect-tcp 192.168.1.200 2000
start
status
stop
disconnect
exit
```

When inventory is running, tag lines are printed:

`TAG epc=... tid=... rssi=... ant=... phase=... user=...`
