# Google Sheets Jira Sync (High Performance)

A robust Google Apps Script to batch-fetch Jira ticket summaries into Google Sheets with clickable, "Rich Text" hyperlinks.

Built to solve common Jira Cloud API issues, this script uses **Parallel Fetching** (`fetchAll`) to process hundreds of tickets in seconds, bypassing the deprecated "Search API" (410 Gone) errors by hitting the stable Issue endpoints directly.

## 🚀 Features

* **Parallel Processing:** Uses `UrlFetchApp.fetchAll()` to fetch data in bursts (30x faster than standard loops).
* **Zero Formulas:** Writes native Google Sheet "Rich Text" links. No more fragile `=HYPERLINK()` formulas that break on sort/filter.
* **Anti-Deprecation:** Bypasses the deprecated Jira `search` endpoints (Error 410/400) by using direct `/issue/` lookups.
* **Rate Limit Safe:** Processes requests in controlled batches to prevent hitting Atlassian API rate limits.
* **Auto-Cleaning:** Automatically handles uppercase/lowercase mismatches and whitespace issues in Ticket IDs.

## 📋 Prerequisites

1.  **Google Sheet:** A sheet with Ticket IDs in one column (e.g., Column C).
2.  **Jira Account:**
    * Your Jira Domain (e.g., `https://yourcompany.atlassian.net`)
    * Your Email Address.
    * **Jira API Token:** Generate one at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens).

## ⚙️ Configuration

Open the `Code.gs` file and update the configuration block at the top:

```javascript
const JIRA_DOMAIN = "[https://your-domain.atlassian.net](https://your-domain.atlassian.net)";
const USER_EMAIL = "your-email@company.com";
const API_TOKEN = "your-generated-api-token";

const SHEET_NAME = "Sheet1";
const ISSUE_COL = 3;  // Column C (Source Ticket IDs)
const SUMMARY_COL = 5; // Column E (Target for Links)
const START_ROW = 2;  // Skip header row
```

## 📦 Deployment / Setup Guide
Follow these steps to deploy this script into your Google Sheet:

# Step 1: Open the Script Editor
  1. Open your Google Sheet.
  2. Navigate to the top menu and click Extensions > Apps Script.
  3. A new tab will open with the Apps Script editor.

# Step 2: Install the Code
  1. In the editor (left sidebar), verify you have a file named Code.gs.
  2. Delete any existing code in that file.
  3. Copy the entire script from this repository's Code.gs file.
  4. Paste it into the editor.

# Step 3: Configure Variables
  1. Locate the CONFIGURATION section at the top of the script.
  2. Replace JIRA_DOMAIN, USER_EMAIL, and API_TOKEN with your actual Jira details.
  3. Adjust SHEET_NAME, ISSUE_COL, and SUMMARY_COL to match your spreadsheet layout.

# Step 4: Save and Refresh
  1. Click the Save icon (floppy disk) or press Ctrl + S.
  2. Close the Apps Script tab.
  3. Refresh (F5) your Google Sheet browser tab.

# Step 5: Authorize and Run
  1. Wait a few seconds for the custom menu "⚡ Jira Manager" to appear in the toolbar.
  2. Click ⚡ Jira Manager > Update Summaries (Fast).
  3. Authorization: Google will ask for permission to run the script.
     - Click Continue.
     - Select your Google Account.
     - Click Advanced > Go to (Script Name) (unsafe).
     - Click Allow.
  4. Run the menu item one more time to start the sync.

## 📖 Usage
1. Enter your Jira Ticket IDs in Column C (e.g., PROJ-123).
2. Click ⚡ Jira Manager > Update Summaries (Fast).
3. The script will:
   - Read the IDs.
   - Fetch summaries in parallel.
   - Populate Column E with the Summary text linked to the Jira ticket.

## 🛠️ Technical Details
Why not use JQL? Atlassian's JQL Search API (/rest/api/3/search) frequently triggers 410 Gone or 400 Bad Request errors due to strict versioning and deprecation of GET requests. This script uses the Direct Issue Endpoint (/rest/api/3/issue/{key}), which is immutable and stable.

Why is it fast? Traditional scripts fetch row-by-row (Serial). This script constructs an array of HTTP requests and fires them simultaneously using Google's infrastructure, reducing sync time for 50 rows from ~25s to ~2s.
