const puppeteer = require('puppeteer');
const fs = require('fs');

async function captureLogo() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Create a simple HTML page with the logo using the Google Font
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 40px;
          background: transparent;
        }
        .logo {
          font-family: 'Stack Sans Notch', sans-serif;
          font-weight: 600;
          font-size: 72px;
          background: linear-gradient(to bottom right, #18181b, #71717a, #a1a1aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .favicon {
          font-family: 'Stack Sans Notch', sans-serif;
          font-weight: 600;
          font-size: 280px;
          background: linear-gradient(to bottom right, #18181b, #71717a, #a1a1aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      </style>
    </head>
    <body>
      <div id="logo" class="logo">PayAdjust</div>
    </body>
    </html>
  `;

  const faviconHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Stack+Sans+Notch:wght@600&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #18181b;
          width: 512px;
          height: 512px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 80px;
        }
        .favicon {
          font-family: 'Stack Sans Notch', sans-serif;
          font-weight: 600;
          font-size: 320px;
          background: linear-gradient(to bottom right, #a1a1aa, #71717a, #52525b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      </style>
    </head>
    <body>
      <div class="favicon">PA</div>
    </body>
    </html>
  `;

  // Capture full logo
  await page.setContent(html);
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000)); // Extra time for font to render

  const logoElement = await page.$('#logo');
  await logoElement.screenshot({
    path: 'payadjust_logo.png',
    omitBackground: true
  });
  console.log('Created payadjust_logo.png');

  // Capture favicon
  await page.setViewport({ width: 512, height: 512 });
  await page.setContent(faviconHtml);
  await page.waitForFunction(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 1000));

  await page.screenshot({
    path: 'favicon_logo.png',
    omitBackground: false,
    clip: { x: 0, y: 0, width: 512, height: 512 }
  });
  console.log('Created favicon_logo.png');

  await browser.close();
}

captureLogo().catch(console.error);
