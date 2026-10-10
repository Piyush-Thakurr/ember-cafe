const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function run() {
  const artifactDir = 'C:\\Users\\piyus\\.gemini\\antigravity-ide\\brain\\8778cb6b-2f11-45c8-9fb0-d86bb2e5a149';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  
  const consoleMessages = [];
  const consoleErrors = [];

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
  });

  console.log('Navigating with hard refresh to http://localhost:3000/?cache=bust19...');
  await page.goto('http://localhost:3000/?cache=bust19', { waitUntil: 'networkidle0', timeout: 30000 });

  // Function to measure FPS over 60 frames
  async function measureFps() {
    return await page.evaluate(() => {
      return new Promise(resolve => {
        let frameCount = 0;
        let startTime = performance.now();
        function loop() {
          frameCount++;
          if (frameCount >= 60) {
            let endTime = performance.now();
            let duration = (endTime - startTime) / 1000;
            let fps = frameCount / duration;
            resolve(fps.toFixed(2));
          } else {
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      });
    });
  }

  async function scrollToY(targetY) {
    await page.evaluate((y) => {
      if (window.emberLenis) {
        window.emberLenis.scrollTo(y, { immediate: true });
      } else {
        window.scrollTo({ top: y, behavior: 'instant' });
      }
      if (window.ScrollTrigger) {
        window.ScrollTrigger.update();
      }
    }, targetY);
    await new Promise(r => setTimeout(r, 1600));
  }

  // 1. Wait for preloader & hero intro to complete
  console.log('Waiting for preloader and intro...');
  await new Promise(r => setTimeout(r, 3400));

  // 2. Exploded view (c: targetY = 6300)
  console.log('Scrolling to Exploded View (y=6300)...');
  await scrollToY(6300);
  const explodedFps = await measureFps();
  const explodedPath = path.join(artifactDir, 'exploded_view_fixed.png');
  await page.screenshot({ path: explodedPath });
  console.log(`Exploded View captured: ${explodedFps} FPS -> ${explodedPath}`);

  // 3. Bean rain halfway (b: targetY = 8700)
  console.log('Scrolling to Bean Rain halfway (y=8700)...');
  await scrollToY(8700);
  const beanRainHalfwayFps = await measureFps();
  const beanRainHalfwayPath = path.join(artifactDir, 'bean_rain_halfway.png');
  await page.screenshot({ path: beanRainHalfwayPath });
  console.log(`Bean Rain halfway captured: ${beanRainHalfwayFps} FPS -> ${beanRainHalfwayPath}`);

  // 4. Bean rain at its fullest (a: targetY = 9300)
  console.log('Scrolling to Bean Rain at its fullest (y=9300)...');
  await scrollToY(9300);
  const beanRainFullestFps = await measureFps();
  const beanRainFullestPath = path.join(artifactDir, 'bean_rain_fullest.png');
  await page.screenshot({ path: beanRainFullestPath });
  console.log(`Bean Rain at fullest captured: ${beanRainFullestFps} FPS -> ${beanRainFullestPath}`);

  // Check metrics & DOM inspection
  const domInspection = await page.evaluate(() => {
    const lineLeft = document.querySelector('.line-left');
    const lineRight = document.querySelector('.line-right');
    const subline = document.querySelector('.bean-rain-subline');
    const fgCanvas = document.getElementById('webgl-beans-fg');

    const lRect = lineLeft ? lineLeft.getBoundingClientRect() : null;
    const rRect = lineRight ? lineRight.getBoundingClientRect() : null;
    const sRect = subline ? subline.getBoundingClientRect() : null;

    return {
      lineLeft: {
        text: lineLeft ? lineLeft.textContent : null,
        fontFamily: lineLeft ? window.getComputedStyle(lineLeft).fontFamily : null,
        fontSize: lineLeft ? window.getComputedStyle(lineLeft).fontSize : null,
        color: lineLeft ? window.getComputedStyle(lineLeft).color : null,
        left: lRect ? lRect.left : null,
        right: lRect ? lRect.right : null,
        width: lRect ? lRect.width : null
      },
      lineRight: {
        text: lineRight ? lineRight.textContent : null,
        fontFamily: lineRight ? window.getComputedStyle(lineRight).fontFamily : null,
        fontSize: lineRight ? window.getComputedStyle(lineRight).fontSize : null,
        color: lineRight ? window.getComputedStyle(lineRight).color : null,
        fontStyle: lineRight ? window.getComputedStyle(lineRight).fontStyle : null,
        left: rRect ? rRect.left : null,
        right: rRect ? rRect.right : null,
        width: rRect ? rRect.width : null
      },
      subline: {
        text: subline ? subline.textContent : null,
        fontSize: subline ? window.getComputedStyle(subline).fontSize : null,
        top: sRect ? sRect.top : null
      },
      fgCanvas: {
        display: fgCanvas ? window.getComputedStyle(fgCanvas).display : null,
        zIndex: fgCanvas ? window.getComputedStyle(fgCanvas).zIndex : null
      }
    };
  });

  await browser.close();

  const report = {
    fps: {
      explodedView: explodedFps,
      beanRainHalfway: beanRainHalfwayFps,
      beanRainFullest: beanRainFullestFps
    },
    screenshots: {
      explodedView: explodedPath,
      beanRainHalfway: beanRainHalfwayPath,
      beanRainFullest: beanRainFullestPath
    },
    domInspection,
    consoleErrors,
    consoleMessages
  };

  console.log('---FINAL REPORT JSON---');
  console.log(JSON.stringify(report, null, 2));
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
