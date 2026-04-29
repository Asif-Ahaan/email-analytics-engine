# email-analytics-engine
The Email Analytics Engine is a Google Apps Script-based system that sends personalized HTML emails to multiple recipients and tracks when those emails are opened. It simulates how real-world email marketing platforms (like Mailchimp or SendGrid) measure engagement.
The system consists of five components: 
• Bulk Email Sender: Reads recipient data from a Google Sheet (EmailList tab) and sends
personalized HTML emails using GmailApp. 
• Tracking Pixel: A hidden 1×1 image embedded in every email. When the email is opened, the image
is requested from the server, triggering a log entry. 
• Request Listener (doGet): A Google Apps Script Web App endpoint that captures the tracking pixel
request and logs the open event to Google Sheets. 
• Database (Google Sheets): Two sheets — EmailList stores recipients and send status; OpenLogs
stores every open event with timestamp. 
• Analytics Dashboard: A Web App HTML page that reads the sheets and displays key metrics: total
sent, total opens, open rate, and opens by hour.
