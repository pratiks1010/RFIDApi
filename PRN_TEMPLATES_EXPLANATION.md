# PRN Templates Explanation (Lines 1-48)

## 📋 Overview
These functions convert item codes to hexadecimal format and calculate memory allocation for RFID tags.

---

## 🔤 Function 1: `toHex(str)` - String to Hexadecimal Converter

### What it does:
Converts any text string into hexadecimal (hex) format.

### How it works:
1. Takes each character in the string
2. Gets its ASCII code number
3. Converts that number to hexadecimal
4. Joins all hex values together

### Example Chart:

| Input String | Character | ASCII Code | Hex Value | Final Result |
|-------------|-----------|------------|-----------|--------------|
| "ABC" | A | 65 | 41 | `414243` |
| "ABC" | B | 66 | 42 | |
| "ABC" | C | 67 | 43 | |
| "123" | 1 | 49 | 31 | `313233` |
| "123" | 2 | 50 | 32 | |
| "123" | 3 | 51 | 33 | |
| "OPJ001" | O | 79 | 4F | `4F504A303031` |
| "OPJ001" | P | 80 | 50 | |
| "OPJ001" | J | 74 | 4A | |
| "OPJ001" | 0 | 48 | 30 | |
| "OPJ001" | 0 | 48 | 30 | |
| "OPJ001" | 1 | 49 | 31 | |

### Code Flow:
```
Input: "ABC"
Step 1: A → charCodeAt(0) = 65 → toString(16) = "41"
Step 2: B → charCodeAt(1) = 66 → toString(16) = "42"
Step 3: C → charCodeAt(2) = 67 → toString(16) = "43"
Output: "414243"
```

---

## 🧮 Function 2: `calculateEpcMemory(hexCode)` - Memory Calculator

### What it does:
Determines how much memory space is needed for an RFID tag based on the hex code length.

### Key Concept:
- **1 byte = 2 hex characters** (e.g., "41" = 1 byte)
- RFID tags need different memory sizes for different data lengths
- Returns two values:
  - `epcBits`: Memory size in bits (32, 48, 64, 80, or 96)
  - `pcValue`: Protocol Control value (tells the printer how to format the tag)

### Memory Allocation Chart:

| Hex Length | Bytes | EPC Bits | PC Value | Example Hex Code |
|------------|-------|----------|----------|------------------|
| 0-6 chars | 1-3 bytes | **32 bits** | `*1C00*` | `414243` (3 bytes) |
| 8-12 chars | 4-6 bytes | **48 bits** | `*1C00*` | `4142434445` (5 bytes) |
| 14-16 chars | 7-8 bytes | **64 bits** | `*2400*` | `4142434445464748` (8 bytes) |
| 18-20 chars | 9-10 bytes | **80 bits** | `*2C00*` | `4142434445464748494A` (10 bytes) |
| 22+ chars | 11+ bytes | **96 bits** | `*3400*` | `4142434445464748494A4B4C` (12 bytes) |

### Example Calculations:

#### Example 1: Short Code
```
Input: hexCode = "414243" (from "ABC")
Bytes: 6 characters ÷ 2 = 3 bytes
Result: { epcBits: 32, pcValue: '*1C00*' }
```

#### Example 2: Medium Code
```
Input: hexCode = "4F504A303031" (from "OPJ001")
Bytes: 12 characters ÷ 2 = 6 bytes
Result: { epcBits: 48, pcValue: '*1C00*' }
```

#### Example 3: Long Code
```
Input: hexCode = "4F504A3030313233343536" (from "OPJ00123456")
Bytes: 24 characters ÷ 2 = 12 bytes
Result: { epcBits: 96, pcValue: '*3400*' }
```

### Decision Tree:

```
Is hexCode empty?
├─ YES → Return { epcBits: 48, pcValue: '*1C00*' }
└─ NO → Calculate bytes = hexCode.length ÷ 2
        │
        ├─ Bytes ≤ 3? → 32 bits, *1C00*
        ├─ Bytes ≤ 6? → 48 bits, *1C00*
        ├─ Bytes ≤ 8? → 64 bits, *2400*
        ├─ Bytes ≤ 10? → 80 bits, *2C00*
        └─ Bytes > 10? → 96 bits, *3400*
```

---

## 🔗 How They Work Together

### Complete Flow Example:

```
Step 1: Item Code = "OPJ001"
        ↓
Step 2: toHex("OPJ001") = "4F504A303031"
        ↓
Step 3: calculateEpcMemory("4F504A303031")
        - Bytes: 12 ÷ 2 = 6 bytes
        - Result: { epcBits: 48, pcValue: '*1C00*' }
        ↓
Step 4: Used in PRN template:
        RFWTAG;48;EPC
        48;H;*4F504A303031*
```

---

## 💡 Why This Matters

1. **RFID Tags have limited memory** - Need to allocate the right amount
2. **Different codes need different sizes** - Short codes use less memory
3. **Printer needs instructions** - PC value tells printer how to format
4. **Efficiency** - Allocating too much wastes space, too little breaks the tag

---

## 📊 Quick Reference Table

| Item Code | Hex Code | Bytes | EPC Bits | PC Value |
|-----------|----------|-------|----------|----------|
| "A" | "41" | 1 | 32 | *1C00* |
| "ABC" | "414243" | 3 | 32 | *1C00* |
| "OPJ001" | "4F504A303031" | 6 | 48 | *1C00* |
| "OPJ001234" | "4F504A303031323334" | 9 | 80 | *2C00* |
| "OPJ00123456" | "4F504A3030313233343536" | 12 | 96 | *3400* |
