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

  console.log('Navigating to http://localhost:3000/?cache=bust13...');
  await page.goto('http://localhost:3000/?cache=bust13', { waitUntil: 'networkidle0', timeout: 30000 });

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

  // 1. Wait for Preloader to finish (2.8s) and capture Hero
  console.log('Waiting for preloader and hero intro...');
  await new Promise(r => setTimeout(r, 3400));

  const heroFps = await measureFps();
  const heroPath = path.join(artifactDir, 'stage2a_1_hero.png');
  await page.screenshot({ path: heroPath });
  console.log(`Hero captured: ${heroFps} FPS -> ${heroPath}`);

  // 2. Scroll to State 1 (targetY = 800)
  console.log('Scrolling to State 1 (y=800)...');
  await scrollToY(800);
  const state1Fps = await measureFps();
  const state1Path = path.join(artifactDir, 'stage2a_2_state1.png');
  await page.screenshot({ path: state1Path });
  console.log(`State 1 captured: ${state1Fps} FPS -> ${state1Path}`);

  // 3. Scroll to Dive (targetY = 3350)
  console.log('Scrolling to Dive (y=3350)...');
  await scrollToY(3350);
  const diveFps = await measureFps();
  const divePath = path.join(artifactDir, 'stage2a_3_dive.png');
  await page.screenshot({ path: divePath });
  console.log(`Dive captured: ${diveFps} FPS -> ${divePath}`);

  // 4. Scroll to Exploded View (targetY = 6300)
  console.log('Scrolling to Exploded View (y=6300)...');
  await scrollToY(6300);
  const explodedFps = await measureFps();
  const explodedPath = path.join(artifactDir, 'stage2a_4_exploded.png');
  await page.screenshot({ path: explodedPath });
  console.log(`Exploded View captured: ${explodedFps} FPS -> ${explodedPath}`);

  // 5. Scroll to Bean Rain (targetY = 8850)
  console.log('Scrolling to Bean Rain (y=8850)...');
  await scrollToY(8850);
  const beanRainFps = await measureFps();
  const beanRainPath = path.join(artifactDir, 'stage2a_5_beanrain.png');
  await page.screenshot({ path: beanRainPath });
  console.log(`Bean Rain captured: ${beanRainFps} FPS -> ${beanRainPath}`);

  await browser.close();

  const report = {
    fps: {
      hero: heroFps,
      state1: state1Fps,
      dive: diveFps,
      exploded: explodedFps,
      beanRain: beanRainFps
    },
    screenshots: {
      hero: heroPath,
      state1: state1Path,
      dive: divePath,
      exploded: explodedPath,
      beanRain: beanRainPath
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
