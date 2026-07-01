# User Column Preferences API

This document describes the API contract required so that a user's table column
configuration (which columns are visible, their order, and their custom display
names) is stored on the server instead of in the browser's `localStorage`.

**Problem it solves:** Today the column config is saved per-browser. If a user
customizes columns in Chrome and again in Edge, the two browsers show different
layouts. With this API the configuration is tied to the user account and stays
consistent across all browsers and devices.

The contract is kept generic (via a `ScreenKey` field) so the same API can later
be reused for other tables/grids in the app.

---

## 1. Save / Update preferences

`POST /api/UserPreference/SaveColumnPreference`

### Request body

```json
{
  "ClientCode": "LS000438",
  "UserId": 123,
  "ScreenKey": "LabelStockList",
  "Columns": [
    { "Key": "srNo",           "Label": "Sr No",        "Visible": true,  "Order": 1 },
    { "Key": "HallmarkAmount", "Label": "Hallmark Amt", "Visible": true,  "Order": 2 },
    { "Key": "ItemCode",       "Label": "Item Code",    "Visible": true,  "Order": 3 },
    { "Key": "RFIDCode",       "Label": "RFID Code",    "Visible": false, "Order": 4 },
    { "Key": "ProductName",    "Label": "Product",      "Visible": true,  "Order": 5 },
    { "Key": "CategoryName",   "Label": "Categories",   "Visible": true,  "Order": 6 },
    { "Key": "DesignName",     "Label": "Design",       "Visible": false, "Order": 7 },
    { "Key": "PurityName",     "Label": "Purity",       "Visible": true,  "Order": 8 },
    { "Key": "GrossWt",        "Label": "Gross Wt",     "Visible": true,  "Order": 9 },
    { "Key": "StoneWt",        "Label": "Stone Wt",     "Visible": false, "Order": 10 },
    { "Key": "DiamondWt",      "Label": "Diamond Wt",   "Visible": false, "Order": 11 },
    { "Key": "NetWt",          "Label": "Net Wt",       "Visible": true,  "Order": 12 },
    { "Key": "Qty",            "Label": "Qty",          "Visible": true,  "Order": 13 },
    { "Key": "Description",    "Label": "Description",  "Visible": false, "Order": 14 },
    { "Key": "Branch",         "Label": "Branch",       "Visible": true,  "Order": 15 },
    { "Key": "BoxName",        "Label": "Box",          "Visible": false, "Order": 16 }
  ]
}
```

### Success response

```json
{
  "Success": true,
  "Message": "Column preferences saved successfully.",
  "Data": {
    "Id": 45,
    "ClientCode": "LS000438",
    "UserId": 123,
    "ScreenKey": "LabelStockList",
    "Columns": [
      { "Key": "srNo", "Label": "Sr No", "Visible": true, "Order": 1 }
    ],
    "UpdatedAt": "2026-06-30T11:45:00Z"
  }
}
```

### Error response

```json
{
  "Success": false,
  "Message": "Invalid column key: 'foo'.",
  "Data": null
}
```

> **Upsert behaviour:** If a record for the same `ClientCode + UserId + ScreenKey`
> already exists, update it; otherwise insert a new one. There must be at most one
> record per (ClientCode, UserId, ScreenKey).

---

## 2. Get preferences

`GET /api/UserPreference/GetColumnPreference?clientCode=LS000438&userId=123&screenKey=LabelStockList`

### Success response (preference exists)

```json
{
  "Success": true,
  "Message": "OK",
  "Data": {
    "ClientCode": "LS000438",
    "UserId": 123,
    "ScreenKey": "LabelStockList",
    "Columns": [
      { "Key": "srNo",           "Label": "Sr No",        "Visible": true, "Order": 1 },
      { "Key": "HallmarkAmount", "Label": "Hallmark Amt", "Visible": true, "Order": 2 },
      { "Key": "ItemCode",       "Label": "Item Code",    "Visible": true, "Order": 3 }
    ],
    "UpdatedAt": "2026-06-30T11:45:00Z"
  }
}
```

### Success response (no preference saved yet — first time)

```json
{
  "Success": true,
  "Message": "No preference found.",
  "Data": null
}
```

> When `Data` is `null`, the frontend falls back to the default column layout.

---

## Field reference

| Field                | Type    | Description                                                        |
| -------------------- | ------- | ------------------------------------------------------------------ |
| `ClientCode`         | string  | Company / client identifier.                                       |
| `UserId`             | number  | The user the preference belongs to.                                |
| `ScreenKey`          | string  | Which table/screen. Currently `"LabelStockList"`.                  |
| `Columns[].Key`      | string  | **System field name — never changed by the user.** Used for data lookup, sorting and number formatting. |
| `Columns[].Label`    | string  | User-defined display name (rename). Shown in the table header.     |
| `Columns[].Visible`  | boolean | Whether the column is shown (`true`) or hidden (`false`).          |
| `Columns[].Order`    | number  | 1-based position of the column (1 = first column).                 |
| `UpdatedAt`          | string  | ISO-8601 timestamp of the last update (server-generated).          |

### Allowed `Key` values

Only these 16 keys are valid. The backend may validate the request against this list.

```
srNo, HallmarkAmount, ItemCode, RFIDCode, ProductName, CategoryName,
DesignName, PurityName, GrossWt, StoneWt, DiamondWt, NetWt, Qty,
Description, Branch, BoxName
```

---

## Suggested database table

`UserColumnPreference`

| Column        | Type            | Notes                                       |
| ------------- | --------------- | ------------------------------------------- |
| `Id`          | int / bigint    | Primary key, identity.                      |
| `ClientCode`  | nvarchar        |                                             |
| `UserId`      | int             |                                             |
| `ScreenKey`   | nvarchar        |                                             |
| `ColumnsJson` | nvarchar(max)   | The `Columns` array stored as a JSON string.|
| `UpdatedAt`   | datetime        | Server-set on every save.                   |

**Unique constraint:** (`ClientCode`, `UserId`, `ScreenKey`).

---

## Notes for the frontend integration (after the API is ready)

1. On page load, call **Get**. If `Data` is non-null, apply it; otherwise use defaults.
2. On any column change (show/hide, reorder, rename), call **Save** (debounced).
3. Keep `localStorage` as an offline cache/fallback so the UI still works if the
   API call fails or the user is offline.
4. `Key` values are the source of truth for data binding; only `Label`, `Visible`
   and `Order` are user-editable.
