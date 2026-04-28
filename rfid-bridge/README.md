# RFID Bridge (Console)

Minimal console bridge to test reader control with `UHFAPI.dll`.

## Prerequisites

- Windows machine with reader driver installed
- Copy these DLLs into `rfid-bridge/`:
  - `UHFAPI.dll`
  - `libusb-1.0.dll`
  - `UHFControl.dll`

## Build

```powershell
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
