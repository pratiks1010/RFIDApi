using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;

namespace rfid_bridge;

internal static class Program
{
    private static readonly object Sync = new();
    private static bool _connected;
    private static string _connectionMode = "none";
    private static bool _inventoryRunning;
    private static Thread? _readerThread;
    private static readonly HashSet<string> SeenTags = new(StringComparer.OrdinalIgnoreCase);

    private const byte CellConnectId = 1;
    private const byte CellUhfRssi = 4;
    private const byte CellUhfAntenna = 5;
    private const byte CellUhfEpc = 6;
    private const byte CellUhfTid = 7;
    private const byte CellUhfUser = 8;
    private const byte CellUhfPhase = 14;

    private static int Main()
    {
        Console.OutputEncoding = Encoding.UTF8;
        PrintHelp();

        while (true)
        {
            Console.Write("rfid> ");
            var line = Console.ReadLine();
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            var args = line.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var command = args[0].ToLowerInvariant();

            try
            {
                switch (command)
                {
                    case "connect-tcp":
                        ConnectTcp(args);
                        break;
                    case "connect-usb":
                        ConnectUsb();
                        break;
                    case "connect-serial":
                        ConnectSerial(args);
                        break;
                    case "start":
                        StartInventory();
                        break;
                    case "stop":
                        StopInventory();
                        break;
                    case "disconnect":
                        Disconnect();
                        break;
                    case "status":
                        PrintStatus();
                        break;
                    case "devices":
                        PrintDevices();
                        break;
                    case "help":
                        PrintHelp();
                        break;
                    case "exit":
                        StopInventory();
                        Disconnect();
                        return 0;
                    default:
                        Console.WriteLine("Unknown command. Type 'help'.");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
            }
        }
    }

    private static void ConnectTcp(string[] args)
    {
        if (args.Length < 3)
        {
            Console.WriteLine("Usage: connect-tcp <ip> <port>");
            return;
        }

        if (!uint.TryParse(args[2], out var port))
        {
            Console.WriteLine("Invalid port.");
            return;
        }

        lock (Sync)
        {
            if (_connected && _connectionMode != "tcp")
            {
                EnsureDisconnected();
            }
            var ip = new StringBuilder(args[1]);
            var result = NativeMethods.TCPConnect(ip, port);
            if (result == 0)
            {
                _connected = true;
                _connectionMode = "tcp";
                Console.WriteLine("Connected via TCP.");
            }
            else
            {
                Console.WriteLine($"TCP connect failed (code={result}).");
            }
        }
    }

    private static void ConnectUsb()
    {
        lock (Sync)
        {
            EnsureDisconnected();
            var result = NativeMethods.UsbOpen();
            _connected = result == 0;
            _connectionMode = _connected ? "usb" : "none";
            Console.WriteLine(_connected ? "Connected via USB." : $"USB connect failed (code={result}).");
        }
    }

    private static void ConnectSerial(string[] args)
    {
        if (args.Length < 2)
        {
            Console.WriteLine("Usage: connect-serial <comNumber> [baud]");
            return;
        }

        if (!int.TryParse(args[1], out var comNumber))
        {
            Console.WriteLine("Invalid COM number.");
            return;
        }

        var baud = 115200;
        if (args.Length >= 3 && !int.TryParse(args[2], out baud))
        {
            Console.WriteLine("Invalid baudrate.");
            return;
        }

        lock (Sync)
        {
            if (_connected && _connectionMode != "serial")
            {
                EnsureDisconnected();
            }

            // Multi-device serial in vendor SDK commonly uses ComOpen(com),
            // while ComOpenWithBaud can behave as single-link on some firmware.
            var result = NativeMethods.ComOpen(comNumber);
            if (result != 0)
            {
                result = NativeMethods.ComOpenWithBaud(comNumber, baud);
            }

            if (result == 0)
            {
                _connected = true;
                _connectionMode = "serial";
                Console.WriteLine($"Connected via Serial COM{comNumber}.");
                var devices = GetConnectedDevices();
                Console.WriteLine($"Connected devices detected by SDK: {devices.Count}");
            }
            else
            {
                Console.WriteLine($"Serial connect failed (code={result}).");
            }
        }
    }

    private static void StartInventory()
    {
        lock (Sync)
        {
            if (!_connected)
            {
                Console.WriteLine("Not connected.");
                return;
            }

            if (_inventoryRunning)
            {
                Console.WriteLine("Inventory already running.");
                return;
            }

            var startedDevices = 0;
            var ids = GetConnectedDeviceIds();
            if (ids.Count > 0)
            {
                foreach (var id in ids)
                {
                    var idResult = NativeMethods.UHFInventoryById(id);
                    if (idResult == 0)
                    {
                        startedDevices++;
                    }
                }
            }
            else
            {
                var result = NativeMethods.UHFInventory();
                if (result == 0)
                {
                    startedDevices = 1;
                }
            }

            if (startedDevices == 0)
            {
                Console.WriteLine("Start inventory failed for all connected devices.");
                return;
            }

            SeenTags.Clear();
            _inventoryRunning = true;
            _readerThread = new Thread(ReadLoop) { IsBackground = true };
            _readerThread.Start();
            Console.WriteLine($"Inventory started on {startedDevices} device(s) (dedupe enabled: each tag prints once per session).");
        }
    }

    private static void StopInventory()
    {
        lock (Sync)
        {
            if (!_inventoryRunning)
            {
                return;
            }

            _inventoryRunning = false;
            var ids = GetConnectedDeviceIds();
            var stopOk = 0;
            if (ids.Count > 0)
            {
                foreach (var id in ids)
                {
                    if (NativeMethods.UHFStopById(id) == 0)
                    {
                        stopOk++;
                    }
                }
            }

            var result = NativeMethods.UHFStopGet();
            if (ids.Count > 0)
            {
                Console.WriteLine($"Inventory stop requested for {stopOk}/{ids.Count} device(s).");
            }
            else
            {
                Console.WriteLine(result == 0 ? "Inventory stopped." : $"Stop inventory returned code={result}.");
            }
        }

        _readerThread?.Join(500);
        _readerThread = null;
    }

    private static void Disconnect()
    {
        lock (Sync)
        {
            StopInventory();
            EnsureDisconnected();
            Console.WriteLine("Disconnected.");
        }
    }

    private static void EnsureDisconnected()
    {
        if (!_connected)
        {
            return;
        }

        NativeMethods.LinkCloseAll();
        NativeMethods.TCPDisconnect();
        NativeMethods.UsbClose();
        NativeMethods.ClosePort();

        _connected = false;
        _connectionMode = "none";
    }

    private static void PrintStatus()
    {
        lock (Sync)
        {
            Console.WriteLine($"connected={_connected}, mode={_connectionMode}, inventory={_inventoryRunning}");
        }
    }

    private static void PrintDevices()
    {
        var devices = GetConnectedDevices();
        if (devices.Count == 0)
        {
            Console.WriteLine("No connected devices found.");
            return;
        }

        foreach (var d in devices)
        {
            Console.WriteLine($"device id={d.Id} type={d.Type} ip={d.Ip} port={d.Port}");
        }
    }

    private static void PrintHelp()
    {
        Console.WriteLine("Commands:");
        Console.WriteLine("  connect-tcp <ip> <port>");
        Console.WriteLine("  connect-usb");
        Console.WriteLine("  connect-serial <comNumber> <baud>");
        Console.WriteLine("  start");
        Console.WriteLine("  stop");
        Console.WriteLine("  disconnect");
        Console.WriteLine("  status");
        Console.WriteLine("  devices");
        Console.WriteLine("  help");
        Console.WriteLine("  exit");
    }

    private static void ReadLoop()
    {
        while (true)
        {
            lock (Sync)
            {
                if (!_inventoryRunning)
                {
                    return;
                }
            }

            var buffer = new byte[256];
            var result = NativeMethods.UHFGetTagData(buffer, buffer.Length);
            if (result <= 0)
            {
                Thread.Sleep(10);
                continue;
            }

            var tag = ParseTag(buffer, result);
            if (tag is null)
            {
                continue;
            }

            var tagKey = BuildTagKey(tag);
            lock (Sync)
            {
                if (!SeenTags.Add(tagKey))
                {
                    continue;
                }
            }

            Console.WriteLine($"TAG dev={tag.ConnectId} epc={tag.Epc} tid={tag.Tid} rssi={tag.Rssi} ant={tag.Antenna} phase={tag.Phase} user={tag.User}");
        }
    }

    private static string BuildTagKey(TagData tag)
    {
        var devicePrefix = string.IsNullOrWhiteSpace(tag.ConnectId) ? "dev:unknown" : $"dev:{tag.ConnectId}";
        if (!string.IsNullOrWhiteSpace(tag.Tid))
        {
            return $"{devicePrefix}|tid:{tag.Tid}";
        }

        return $"{devicePrefix}|epc:{tag.Epc}";
    }

    private static TagData? ParseTag(byte[] data, int length)
    {
        var tag = new TagData();
        var index = 0;
        while (index + 1 < length)
        {
            var type = data[index++];
            var len = data[index++];
            if (index + len > length)
            {
                break;
            }

            var field = new byte[len];
            Array.Copy(data, index, field, 0, len);
            index += len;

            switch (type)
            {
                case CellConnectId:
                    tag.ConnectId = field.Length > 0 ? field[0].ToString() : "";
                    break;
                case CellUhfEpc:
                    tag.Epc = ToHex(field);
                    break;
                case CellUhfTid:
                    tag.Tid = ToHex(field);
                    break;
                case CellUhfRssi:
                    tag.Rssi = field.Length > 0 ? unchecked((sbyte)field[0]).ToString() : "";
                    break;
                case CellUhfAntenna:
                    tag.Antenna = field.Length > 0 ? field[0].ToString() : "";
                    break;
                case CellUhfPhase:
                    tag.Phase = field.Length > 0 ? field[0].ToString() : "";
                    break;
                case CellUhfUser:
                    tag.User = ToHex(field);
                    break;
            }
        }

        return string.IsNullOrWhiteSpace(tag.Epc) ? null : tag;
    }

    private static string ToHex(byte[] bytes)
    {
        return BitConverter.ToString(bytes).Replace("-", string.Empty);
    }

    private static List<int> GetConnectedDeviceIds()
    {
        return GetConnectedDevices().Select(d => d.Id).Where(id => id >= 0).Distinct().ToList();
    }

    private static List<DeviceRow> GetConnectedDevices()
    {
        var buffer = new byte[1024 * 100];
        var resultLen = NativeMethods.LinkGetInfo(buffer, buffer.Length);
        if (resultLen <= 0)
        {
            return new List<DeviceRow>();
        }

        try
        {
            var json = Encoding.ASCII.GetString(buffer, 0, resultLen).Replace("\0", "");
            using var doc = JsonDocument.Parse(json);
            var list = new List<DeviceRow>();
            foreach (var element in doc.RootElement.EnumerateArray())
            {
                if (!element.TryGetProperty("connected", out var connectedProp) || !connectedProp.GetBoolean())
                {
                    continue;
                }

                list.Add(new DeviceRow
                {
                    Id = element.TryGetProperty("id", out var idProp) ? idProp.GetInt32() : 0,
                    Type = element.TryGetProperty("type", out var typeProp) ? typeProp.GetString() ?? "" : "",
                    Ip = element.TryGetProperty("ip", out var ipProp) ? ipProp.GetString() ?? "" : "",
                    Port = element.TryGetProperty("port", out var portProp) ? portProp.GetInt32() : 0
                });
            }

            return list;
        }
        catch
        {
            return new List<DeviceRow>();
        }
    }

    private sealed class TagData
    {
        public string ConnectId { get; set; } = "";
        public string Epc { get; set; } = "";
        public string Tid { get; set; } = "";
        public string Rssi { get; set; } = "";
        public string Antenna { get; set; } = "";
        public string Phase { get; set; } = "";
        public string User { get; set; } = "";
    }

    private sealed class DeviceRow
    {
        public int Id { get; set; }
        public string Type { get; set; } = "";
        public string Ip { get; set; } = "";
        public int Port { get; set; }
    }
}

internal static class NativeMethods
{
    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int TCPConnect(StringBuilder ip, uint hostport);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern void TCPDisconnect();

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int ComOpenWithBaud(int port, int baudrate);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int ComOpen(int comName);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern void ClosePort();

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int UsbOpen();

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern void UsbClose();

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int UHFInventory();

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int UHFInventoryById(int id);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int UHFStopById(int id);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int UHFStopGet();

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int UHFGetTagData(byte[] tdata, int recvlen);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern int LinkGetInfo(byte[] info, int len);

    [DllImport("UHFAPI.dll", CallingConvention = CallingConvention.Cdecl)]
    public static extern void LinkCloseAll();
}
