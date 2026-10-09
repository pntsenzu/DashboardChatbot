---
name: google-sheets-testlog
description: Read test logs from Google Sheets spreadsheets and use findings to fix code, update skills, and improve quality.
---

# Google Sheets Test Log — Skill

## Overview
This skill teaches agents how to use the MCP Google Sheets tools to read test logs from spreadsheets, interpret test results, and apply fixes to the Senzu Dashboard Chatbot codebase.

## MCP Server: `google-sheets`
Authentication is handled via a Google Cloud Service Account configured in `.opencode/mcp.json`.

- **Service Account Key**: `D:\senzubase\Web QA Agent\senzu-system-18d922a2a753.json`
- **Authentication**: The `client_email` in the service account JSON must have **Editor** access on the target spreadsheet.

## Available MCP Tools (Google Sheets)

### Read Operations
| Tool | Description |
|---|---|
| `list_spreadsheets` | List spreadsheets in a Drive folder |
| `search_spreadsheets` | Search spreadsheets by name |
| `list_sheets` | List tabs/sheets in a spreadsheet |
| `get_sheet_data` | Read data from a specific range |
| `get_multiple_sheet_data` | Read data from multiple ranges at once |
| `get_sheet_formulas` | Read cell formulas |
| `find_in_spreadsheet` | Search for text within a spreadsheet |

### Write Operations
| Tool | Description |
|---|---|
| `update_cells` | Write data to a range |
| `batch_update_cells` | Write data to multiple ranges |
| `create_spreadsheet` | Create a new spreadsheet |
| `create_sheet` | Add a new tab/sheet |
| `add_rows` | Append rows to a sheet |
| `add_columns` | Add columns to a sheet |
| `rename_sheet` | Rename a tab/sheet |
| `copy_sheet` | Copy a sheet to another spreadsheet |
| `share_spreadsheet` | Share spreadsheet with users |

## Workflow: Reading Test Logs

### Step 1: Find the Test Log Spreadsheet
```
Use `list_spreadsheets` or `search_spreadsheets` with a keyword (e.g., "test log", "QA").
Note the `spreadsheet_id` from the result.
```

### Step 2: List Available Sheets/Tabs
```
Use `list_sheets` with the spreadsheet_id to see all tabs.
Common tab names: "Test Cases", "Results", "Bugs", "Regression".
```

### Step 3: Read Test Data
```
Use `get_sheet_data` with:
- spreadsheet_id: the ID from step 1
- sheet: the tab name (e.g., "Sheet1")
- range: optional A1 notation (e.g., "A1:G100")

The first row is typically headers:
  Test ID | Feature | Step | Expected | Actual | Status | Notes
```

### Step 4: Interpret Results
- **PASS**: No action needed.
- **FAIL**: Read the "Expected" vs "Actual" columns. Identify the component/page/API causing the issue.
- **BLOCKED**: Check dependencies or environment issues.
- **SKIP**: Review if the test is still relevant.

### Step 5: Apply Fixes
Based on test log findings:
1. **UI Bug** → Fix component in `components/` or page in `app/`.
2. **API Issue** → Check `lib/rpc.ts` or the data-api skill for correct function usage.
3. **Missing Feature** → Create or update components, add new skills if needed.
4. **Design Mismatch** → Refer to `ui-design-spec.html` for correct styles.

### Step 6: Update Test Status (Optional)
After fixing, use `update_cells` to mark the test as PASS:
```
Use `update_cells` with:
- spreadsheet_id: the ID
- sheet: the tab name
- range: e.g., "F5" (the Status cell)
- values: [["PASS"]]
```

## Important Notes
- The spreadsheet must be **shared** with the service account's `client_email` (found in the JSON key file).
- All IDs are from the spreadsheet URL: `https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit`
- Ranges use A1 notation: `"A1:C10"`, `"Sheet1!B2:D"`, or just `"A:Z"` for all columns.
- The server supports both `DRIVE_FOLDER_ID` (to scope access) and direct `spreadsheet_id` access.
