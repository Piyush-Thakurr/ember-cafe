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

  console.log('Navigating to http://localhost:3000/?cache=bustStage2B...');
  await page.goto('http://localhost:3000/?cache=bustStage2B', { waitUntil: 'networkidle0', timeout: 30000 });

  // Function to measure FPS over 60 frames with 10 warmup frames
  async function measureFps() {
    return await page.evaluate(() => {
      return new Promise(resolve => {
        let warmup = 10;
        let frameCount = 0;
        let startTime = 0;
        function loop() {
          if (warmup > 0) {
            warmup--;
            if (warmup === 0) startTime = performance.now();
            requestAnimationFrame(loop);
            return;
          }
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
    await new Promise(r => setTimeout(r, 1200));
  }

  // Wait for preloader to finish (3.4s)
  console.log('Waiting for preloader to finish...');
  await new Promise(r => setTimeout(r, 3400));

  // Get positions of sections via ScrollTrigger
  const sectionPositions = await page.evaluate(() => {
    const triggers = window.ScrollTrigger.getAll();
    const map = {};
    triggers.forEach(t => {
      if (t.vars.trigger) {
        map[t.vars.trigger] = {
          start: t.start,
          end: t.end
        };
      }
    });
    return map;
  });
  console.log('ScrollTrigger triggers detected:', sectionPositions);

  const fpsResults = {};

  // ----------------------------------------------------
  // 1. MENU: Two different drinks active
  // ----------------------------------------------------
  console.log('1. Navigating to Menu section...');
  const menuTrigger = sectionPositions['#menu'];
  const menuStartY = menuTrigger ? menuTrigger.start : 10800;
  await scrollToY(menuStartY);

  // Activate Drink 01 (Ember Espresso)
  console.log('Activating card 01 (Ember Espresso)...');
  await page.evaluate(() => {
    window.emberStage?.setDrinkActive?.(0);
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach((c, i) => c.classList.toggle('is-active', i === 0));
  });
  await new Promise(r => setTimeout(r, 1800));

  fpsResults.menu_drink1 = await measureFps();
  const pathMenu1 = path.join(artifactDir, 'stage2b_1_menu_drink1.png');
  await page.screenshot({ path: pathMenu1 });
  console.log(`Menu Drink 01 captured: ${fpsResults.menu_drink1} FPS -> ${pathMenu1}`);

  // Scroll track partially and activate Drink 03 (Burnt Caramel Latte)
  console.log('Scrolling track and activating card 03 (Burnt Caramel Latte)...');
  const menuMidY = menuTrigger ? menuTrigger.start + 650 : 11450;
  await scrollToY(menuMidY);
  await page.evaluate(() => {
    window.emberStage?.setDrinkActive?.(2);
    const cards = document.querySelectorAll('.menu-card');
    cards.forEach((c, i) => c.classList.toggle('is-active', i === 2));
  });
  await new Promise(r => setTimeout(r, 1200));

  fpsResults.menu_drink3 = await measureFps();
  const pathMenu3 = path.join(artifactDir, 'stage2b_2_menu_drink3.png');
  await page.screenshot({ path: pathMenu3 });
  console.log(`Menu Drink 03 captured: ${fpsResults.menu_drink3} FPS -> ${pathMenu3}`);

  // ----------------------------------------------------
  // 2. PROCESS: Step 1 (GREEN), Step 3 (GRIND), Step 4 (BREW)
  // ----------------------------------------------------
  console.log('2. Navigating to Process section...');
  const processTrigger = sectionPositions['#process'];
  const procStart = processTrigger ? processTrigger.start : 14040;
  const procEnd = processTrigger ? processTrigger.end : 16632;
  const procSpan = procEnd - procStart;

  // Step 1: GREEN (progress ~ 0.12)
  console.log('Process Step 1: GREEN...');
  await scrollToY(procStart + procSpan * 0.12);
  await new Promise(r => setTimeout(r, 800));
  fpsResults.process_step1 = await measureFps();
  const pathProc1 = path.join(artifactDir, 'stage2b_3_process_step1.png');
  await page.screenshot({ path: pathProc1 });
  console.log(`Process Step 1 captured: ${fpsResults.process_step1} FPS -> ${pathProc1}`);

  // Step 3: GRIND (progress ~ 0.62)
  console.log('Process Step 3: GRIND...');
  await scrollToY(procStart + procSpan * 0.62);
  await new Promise(r => setTimeout(r, 800));
  fpsResults.process_step3 = await measureFps();
  const pathProc3 = path.join(artifactDir, 'stage2b_4_process_step3.png');
  await page.screenshot({ path: pathProc3 });
  console.log(`Process Step 3 captured: ${fpsResults.process_step3} FPS -> ${pathProc3}`);

  // Step 4: BREW (progress ~ 0.90)
  console.log('Process Step 4: BREW...');
  await scrollToY(procStart + procSpan * 0.90);
  await new Promise(r => setTimeout(r, 800));
  fpsResults.process_step4 = await measureFps();
  const pathProc4 = path.join(artifactDir, 'stage2b_5_process_step4.png');
  await page.screenshot({ path: pathProc4 });
  console.log(`Process Step 4 captured: ${fpsResults.process_step4} FPS -> ${pathProc4}`);

  // ----------------------------------------------------
  // 3. ATMOSPHERE: Marquee & Gallery revealed
  // ----------------------------------------------------
  console.log('3. Navigating to Atmosphere section...');
  const atmoTrigger = sectionPositions['#atmosphere'];
  const atmoStartY = atmoTrigger ? atmoTrigger.start + 950 : 17582;
  await scrollToY(atmoStartY);
  await page.evaluate(() => {
    window.emberStage?.setAtmosphereScrub?.(0);
    document.querySelectorAll('.image-reveal-frame').forEach(f => f.classList.add('is-revealed'));
  });
  await new Promise(r => setTimeout(r, 2500));
  fpsResults.atmosphere = await measureFps();
  const pathAtmo = path.join(artifactDir, 'stage2b_6_atmosphere.png');
  await page.screenshot({ path: pathAtmo });
  console.log(`Atmosphere captured: ${fpsResults.atmosphere} FPS -> ${pathAtmo}`);

  // ----------------------------------------------------
  // 4. FINALE: 3D Cup shrunk and landed in the pill
  // ----------------------------------------------------
  console.log('4. Navigating to Finale section...');
  await page.evaluate(() => {
    const el = document.getElementById('finale-reserve-btn');
    if (el) {
      el.scrollIntoView({ block: 'center', inline: 'center' });
    }
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => {
    window.emberStage?.setFinaleScrub?.(1.0);
  });
  await new Promise(r => setTimeout(r, 1200));
  fpsResults.finale = await measureFps();
  const pathFinale = path.join(artifactDir, 'stage2b_7_finale_cup_pill.png');
  await page.screenshot({ path: pathFinale });
  console.log(`Finale captured: ${fpsResults.finale} FPS -> ${pathFinale}`);

  // -------------------------------------------------------------------------
  // 5. RESERVATION MODAL: Open dialog
  // -------------------------------------------------------------------------
  console.log('5. Opening Reservation Modal...');
  await page.evaluate(() => {
    const btn = document.getElementById('finale-reserve-btn') || document.getElementById('nav-reserve-btn');
    btn?.click();
  });
  await new Promise(r => setTimeout(r, 600));
  fpsResults.modal = await measureFps();
  const pathModal = path.join(artifactDir, 'stage2b_8_modal_open.png');
  await page.screenshot({ path: pathModal });
  console.log(`Modal captured: ${fpsResults.modal} FPS -> ${pathModal}`);

  await browser.close();

  const report = {
    fps: fpsResults,
    screenshots: {
      menu_drink1: pathMenu1,
      menu_drink3: pathMenu3,
      process_step1: pathProc1,
      process_step3: pathProc3,
      process_step4: pathProc4,
      atmosphere: pathAtmo,
      finale_cup_pill: pathFinale,
      modal_open: pathModal
    },
    consoleErrors,
    consoleMessages
  };

  console.log('=== STAGE 2B REPORT ===');
  console.log(JSON.stringify(report, null, 2));
}

run().catch(err => {
  console.error('Capture execution error:', err);
  process.exit(1);
});
