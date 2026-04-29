// ============================================================
// FILE: Code.gs
// ============================================================

const SHEET_NAME_EMAILS = "EmailList";
const SHEET_NAME_LOGS   = "OpenLogs";

// ── STEP 1: Called manually to send bulk emails ──────────────
function sendBulkEmails() {
  const startTime = new Date().getTime();
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(SHEET_NAME_EMAILS);
  const data   = sheet.getDataRange().getValues();
  const webAppUrl = "https://script.google.com/macros/s/AKfycbzvKmumO3-vUyEeLhO6Ln7u2g-G4UuBwXDFMu6TzwZNqdiCBHn8sN4zdso9Lj-DKIRc/exec"

  // Row 0 = headers: [ID, Name, Email, Subject, Body, Sent]
  for (let i = 1; i < data.length; i++) {
    if (new Date().getTime() - startTime > 300000) { // 5 min limit
      Logger.log("Time limit approaching, stopping safely.");
      break;
    }
    const [id, name, email, subject, body, sent] = data[i];

    if (sent === "YES") continue; // skip already-sent

    const trackingPixel = `<img src="${webAppUrl}?action=track&email=${encodeURIComponent(email)}&id=${id}" width="1" height="1" style="display:none;" />`;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2>Hello, ${name}!</h2>
        <p>${body}</p>
        <hr/>
        <p style="color:#aaa;font-size:12px;">You received this email because you signed up.</p>
        ${trackingPixel}
      </div>
    `;

    GmailApp.sendEmail(email, subject, "Please enable HTML to view this email.", {
      htmlBody: htmlBody,
      name: "Email Analytics System"
    });

    // Mark as sent
    sheet.getRange(i + 1, 6).setValue("YES");
    sheet.getRange(i + 1, 7).setValue(new Date());
  }

  SpreadsheetApp.getUi().alert("Emails sent successfully!");
}

// ── STEP 2: doGet — handles tracking pixel + dashboard ───────
function doGet(e) {
  const action = e.parameter.action;

  if (action === "track") {
    return handleTracking(e);
  } else if (action === "dashboard") {
    return serveDashboard();
  } else {
    // Default: show dashboard
    return serveDashboard();
  }
}

function handleTracking(e) {
  const email = e.parameter.email || "unknown";
  const id    = e.parameter.id    || "unknown";
  const time  = new Date();
  const userAgent = e.parameter.userAgent || "N/A";

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const logs  = ss.getSheetByName(SHEET_NAME_LOGS);

  logs.appendRow([id, email, time, userAgent, e.parameter]);

  // Return a 1x1 transparent GIF
  const pixel = Utilities.newBlob(
    Utilities.base64Decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
    "image/gif"
  );

  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── STEP 3: Dashboard HTML served as web app ─────────────────
function serveDashboard() {
  return HtmlService.createHtmlOutputFromFile("Dashboard")
    .setTitle("Email Analytics Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── API: Called by Dashboard JS to get analytics data ────────
function getAnalyticsData() {
  const ss         = SpreadsheetApp.getActiveSpreadsheet();
  const emailSheet = ss.getSheetByName(SHEET_NAME_EMAILS);
  const logSheet   = ss.getSheetByName(SHEET_NAME_LOGS);

  const emailData = emailSheet.getDataRange().getValues().slice(1);
  const logData   = logSheet.getDataRange().getValues().slice(1);

  const totalSent  = emailData.filter(r => r[5] === "YES").length;
  const totalOpens = logData.length;
  const openRate   = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : 0;

  // Unique openers (by email)
  const uniqueOpeners = new Set(logData.map(r => r[1])).size;

  // Opens grouped by hour
  const byHour = {};
  logData.forEach(row => {
    const d    = new Date(row[2]);
    const hour = d.getHours();
    byHour[hour] = (byHour[hour] || 0) + 1;
  });

  // Recent logs (last 20)
  const recentLogs = logData.slice(-20).reverse().map(r => ({
    id:    r[0],
    email: r[1],
    time:  new Date(r[2]).toLocaleString()
  }));

  return {
    totalSent,
    totalOpens,
    openRate,
    uniqueOpeners,
    byHour,
    recentLogs
  };
}
