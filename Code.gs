// --- CONFIGURATION ---
const JIRA_DOMAIN = "https://<domain>.atlassian.net"; 
const USER_EMAIL = "email-login-to-jira";
const API_TOKEN = "your-api-token"; // <--- RE-PASTE YOUR TOKEN HERE
const SHEET_NAME = "Sheet1"; // <--- SHEET NAME FOR LOOKUP
const ISSUE_COL = 3; // Column of Jira Ticket Number
const SUMMARY_COL = 5; // Column to Update
const START_ROW = 4; // Start from row

// Create a button to execute process
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ Jira Manager')
    .addItem('Update Summaries (Fast)', 'batchUpdateJira')
    .addToUi();
}

function batchUpdateJira() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) { SpreadsheetApp.getUi().alert("Sheet not found"); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) return;
  
  // 1. Read Keys
  const issueKeysRaw = sheet.getRange(START_ROW, ISSUE_COL, lastRow - START_ROW + 1).getValues();
  
  // Create a map of row indexes to process
  let targetRows = [];
  issueKeysRaw.forEach((row, index) => {
    const key = row[0] ? row[0].toString().replace(/\s/g, '').toUpperCase() : "";
    if (key !== "") {
      targetRows.push({ rowIndex: index, key: key });
    }
  });

  if (targetRows.length === 0) {
    SpreadsheetApp.getUi().alert("No Jira Keys found.");
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(`Parallel Fetching ${targetRows.length} items...`, "System");

  // 2. Prepare for Parallel Fetching
  let richTextOutput = new Array(issueKeysRaw.length).fill(null);
  const authHeader = "Basic " + Utilities.base64Encode(USER_EMAIL.trim() + ":" + API_TOKEN.trim());
  
  let baseUrl = JIRA_DOMAIN.trim().replace(/\/$/, "");
  if (!baseUrl.startsWith("https://")) baseUrl = "https://" + baseUrl;

  // We process in "Bursts" of 30 to prevent hitting Jira's rate limit too hard
  const BURST_SIZE = 30; 

  for (let i = 0; i < targetRows.length; i += BURST_SIZE) {
    const chunk = targetRows.slice(i, i + BURST_SIZE);
    
    // 3. Build Array of Request Objects
    const requests = chunk.map(item => {
      return {
        url: `${baseUrl}/rest/api/3/issue/${item.key}?fields=summary`,
        method: "GET",
        headers: { "Authorization": authHeader, "Accept": "application/json" },
        muteHttpExceptions: true // Critical: Prevents one 404 from crashing the whole batch
      };
    });

    // 4. FIRE ALL REQUESTS AT ONCE (The Speed Boost)
    try {
      const responses = UrlFetchApp.fetchAll(requests); // <--- This runs in parallel
      
      // 5. Process Results
      responses.forEach((response, index) => {
        const item = chunk[index]; // Map back to original row
        const code = response.getResponseCode();
        
        let richValue;
        if (code === 200) {
          const data = JSON.parse(response.getContentText());
          const summary = data.fields.summary;
          const url = `${baseUrl}/browse/${item.key}`;
          
          richValue = SpreadsheetApp.newRichTextValue()
              .setText(summary)
              .setLinkUrl(url)
              .build();
        } else if (code === 404) {
          richValue = SpreadsheetApp.newRichTextValue().setText("⚠️ Not Found").build();
        } else {
          richValue = SpreadsheetApp.newRichTextValue().setText(`⚠️ HTTP ${code}`).build();
        }

        richTextOutput[item.rowIndex] = [richValue];
      });

    } catch (e) {
      console.error("Batch Error: " + e.message);
      // Fallback: Mark this chunk as error
      chunk.forEach(item => {
         richTextOutput[item.rowIndex] = [SpreadsheetApp.newRichTextValue().setText("⚠️ Net Error").build()];
      });
    }
    
    // Tiny pause between bursts to be polite to the API
    Utilities.sleep(100);
  }

  // 6. Fill blanks and Write
  for (let i = 0; i < richTextOutput.length; i++) {
    if (richTextOutput[i] === null) {
      richTextOutput[i] = [SpreadsheetApp.newRichTextValue().setText("").build()];
    }
  }

  sheet.getRange(START_ROW, SUMMARY_COL, richTextOutput.length, 1).setRichTextValues(richTextOutput);
  SpreadsheetApp.getActiveSpreadsheet().toast("Sync Complete!", "Success");
}