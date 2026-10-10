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

  console.log('Navigating with hard refresh to http://localhost:3000/?cache=bust14...');
  await page.goto('http://localhost:3000/?cache=bust14', { waitUntil: 'networkidle0', timeout: 30000 });

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

  // 2. State 1 (targetY = 850)
  console.log('Scrolling to State 1 (y=850)...');
  await scrollToY(850);
  const state1Fps = await measureFps();
  const state1Path = path.join(artifactDir, 'stage2a_fix_1_state1.png');
  await page.screenshot({ path: state1Path });
  console.log(`State 1 captured: ${state1Fps} FPS -> ${state1Path}`);

  // 3. Bean rain with text (targetY = 8800)
  console.log('Scrolling to Bean Rain with text (y=8800)...');
  await scrollToY(8800);
  const beanRainFps = await measureFps();
  const beanRainPath = path.join(artifactDir, 'stage2a_fix_2_beanrain.png');
  await page.screenshot({ path: beanRainPath });
  console.log(`Bean Rain with text captured: ${beanRainFps} FPS -> ${beanRainPath}`);

  // 4. Bean rain 300px further down (targetY = 9100)
  console.log('Scrolling to Bean Rain 300px further down (y=9100)...');
  await scrollToY(9100);
  const beanRainFurtherFps = await measureFps();
  const beanRainFurtherPath = path.join(artifactDir, 'stage2a_fix_3_beanrain_300px.png');
  await page.screenshot({ path: beanRainFurtherPath });
  console.log(`Bean Rain 300px further captured: ${beanRainFurtherFps} FPS -> ${beanRainFurtherPath}`);

  await browser.close();

  const report = {
    fps: {
      state1: state1Fps,
      beanRainWithText: beanRainFps,
      beanRainFurtherDown: beanRainFurtherFps
    },
    screenshots: {
      state1: state1Path,
      beanRainWithText: beanRainPath,
      beanRainFurtherDown: beanRainFurtherPath
    },
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
