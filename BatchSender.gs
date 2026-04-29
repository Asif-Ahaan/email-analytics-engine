// ============================================================
// FILE: BatchSender.gs
// Handles 1000+ emails by batching with time-based triggers
// ============================================================

const BATCH_SIZE = 50; // Send 50 per run (safe within 6 min)

function startBatchSend() {
  // Reset the pointer
  const props = PropertiesService.getScriptProperties();
  props.setProperty("currentRow", "1"); // start from row index 1 (after header)

  // Create a trigger to run every minute
  ScriptApp.newTrigger("sendNextBatch")
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log("Batch sending started.");
}

function sendNextBatch() {
  const props      = PropertiesService.getScriptProperties();
  let   currentRow = parseInt(props.getProperty("currentRow") || "1");

  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const sheet      = ss.getSheetByName(SHEET_NAME_EMAILS);
  const data       = sheet.getDataRange().getValues();
  const webAppUrl  = ScriptApp.getService().getUrl();

  let sent = 0;

  while (currentRow < data.length && sent < BATCH_SIZE) {
    const [id, name, email, subject, body, sentFlag] = data[currentRow];

    if (sentFlag !== "YES") {
      const trackingPixel = `<img src="${webAppUrl}?action=track&email=${encodeURIComponent(email)}&id=${id}" width="1" height="1" style="display:none;" />`;

      const htmlBody = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2>Hello, ${name}!</h2>
          <p>${body}</p>
          ${trackingPixel}
        </div>
      `;

      GmailApp.sendEmail(email, subject, "Please enable HTML.", { htmlBody });
      sheet.getRange(currentRow + 1, 6).setValue("YES");
      sheet.getRange(currentRow + 1, 7).setValue(new Date());
      sent++;
    }

    currentRow++;
  }

  props.setProperty("currentRow", currentRow.toString());

  // If all done, delete the trigger
  if (currentRow >= data.length) {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(t => {
      if (t.getHandlerFunction() === "sendNextBatch") {
        ScriptApp.deleteTrigger(t);
      }
    });
    Logger.log("All emails sent! Trigger removed.");
  }
}