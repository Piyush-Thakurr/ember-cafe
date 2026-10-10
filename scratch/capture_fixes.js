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

  console.log('Navigating with hard refresh to http://localhost:3000/?cache=bust30...');
  await page.goto('http://localhost:3000/?cache=bust30', { waitUntil: 'networkidle0', timeout: 30000 });

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

  // Helper to scroll to exact progress of a section's ScrollTrigger
  async function scrollToSectionProgress(sectionId, targetProgress) {
    return await page.evaluate(({ id, prog }) => {
      const triggers = window.ScrollTrigger?.getAll() || [];
      const st = triggers.find(t => t.trigger && t.trigger.id === id);
      if (st) {
        const scrollY = st.start + prog * (st.end - st.start);
        window.scrollTo(0, scrollY);
        if (window.emberLenis) {
          window.emberLenis.scrollTo(scrollY, { immediate: true });
        }
        window.ScrollTrigger.refresh();
        window.ScrollTrigger.update();
        return { start: st.start, end: st.end, targetY: scrollY };
      }
      return null;
    }, { id: sectionId, prog: targetProgress });
  }

  // 1. Wait for preloader & intro to fully complete
  console.log('Waiting for preloader and intro to fully complete...');
  await new Promise(r => setTimeout(r, 4500));

  // --- PART A: 1920x1080 CAPTURES ---

  // (c1) Exploded View at full separation at 1920x1080 (progress ~0.70 where lines are drawn)
  console.log('Scrolling to Exploded View at full separation (1920x1080)...');
  await scrollToSectionProgress('exploded', 0.68);
  await new Promise(r => setTimeout(r, 1600));
  const exploded1080Fps = await measureFps();
  const exploded1080Path = path.join(artifactDir, 'exploded_view_1920x1080.png');
  await page.screenshot({ path: exploded1080Path });
  console.log(`Exploded View (1920x1080) captured: ${exploded1080Fps} FPS -> ${exploded1080Path}`);

  // Inspect Exploded layer bounds and SVG endpoints at 1920x1080
  const explodedInspection1080 = await page.evaluate(() => {
    const coords = window.emberStage?.getExplodedLayerScreenCoords?.();
    const lOrigin = document.getElementById('line-origin')?.getAttribute('d');
    const dOrigin = { cx: document.getElementById('dot-origin')?.getAttribute('cx'), cy: document.getElementById('dot-origin')?.getAttribute('cy') };
    const lRoast = document.getElementById('line-roast')?.getAttribute('d');
    const dRoast = { cx: document.getElementById('dot-roast')?.getAttribute('cx'), cy: document.getElementById('dot-roast')?.getAttribute('cy') };
    const lNotes = document.getElementById('line-notes')?.getAttribute('d');
    const dNotes = { cx: document.getElementById('dot-notes')?.getAttribute('cx'), cy: document.getElementById('dot-notes')?.getAttribute('cy') };

    const tags = ['spoon', 'crema', 'coffee', 'cup', 'saucer'].map(id => {
      const text = document.getElementById(`tag-${id}`);
      const tick = document.getElementById(`tick-${id}`);
      const dot = document.getElementById(`dot-${id}`);
      return {
        id,
        text: text?.textContent,
        textOpacity: text ? window.getComputedStyle(text).opacity : null,
        textX: text?.getAttribute('x'),
        textY: text?.getAttribute('y'),
        tickX1: tick?.getAttribute('x1'),
        tickX2: tick?.getAttribute('x2'),
        tickY1: tick?.getAttribute('y1'),
        dotCx: dot?.getAttribute('cx'),
        dotCy: dot?.getAttribute('cy'),
        dotOpacity: dot ? window.getComputedStyle(dot).opacity : null
      };
    });

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      coords,
      origin: { d: lOrigin, dot: dOrigin },
      roast: { d: lRoast, dot: dRoast },
      notes: { d: lNotes, dot: dNotes },
      tags
    };
  });

  // (b) Bean Rain halfway at 1920x1080 (progress 0.50)
  console.log('Scrolling to Bean Rain halfway (1920x1080)...');
  await scrollToSectionProgress('bean-rain', 0.50);
  await new Promise(r => setTimeout(r, 1200));
  const beanRainHalfwayFps = await measureFps();
  const beanRainHalfwayPath = path.join(artifactDir, 'bean_rain_halfway.png');
  await page.screenshot({ path: beanRainHalfwayPath });
  console.log(`Bean Rain halfway captured: ${beanRainHalfwayFps} FPS -> ${beanRainHalfwayPath}`);

  // (a) Bean Rain at its fullest at 1920x1080 (progress 0.70)
  console.log('Scrolling to Bean Rain at its fullest (1920x1080)...');
  await scrollToSectionProgress('bean-rain', 0.70);
  await new Promise(r => setTimeout(r, 1200));
  const beanRainFullestFps = await measureFps();
  const beanRainFullestPath = path.join(artifactDir, 'bean_rain_fullest.png');
  await page.screenshot({ path: beanRainFullestPath });
  console.log(`Bean Rain at fullest captured: ${beanRainFullestFps} FPS -> ${beanRainFullestPath}`);

  // Inspect Bean Rain headline skew at rest and subline
  const beanRainInspection = await page.evaluate(() => {
    const wrap = document.querySelector('.bean-rain-headline-wrap');
    const lineLeft = document.querySelector('.line-left');
    const lineRight = document.querySelector('.line-right');
    const subline = document.querySelector('.bean-rain-subline');
    const fgCanvas = document.getElementById('webgl-beans-fg');

    const sRect = subline ? subline.getBoundingClientRect() : null;

    return {
      headlineWrapTransform: wrap ? window.getComputedStyle(wrap).transform : null,
      subline: {
        text: subline?.textContent,
        fontSize: subline ? window.getComputedStyle(subline).fontSize : null,
        opacity: subline ? window.getComputedStyle(subline).opacity : null,
        top: sRect?.top,
        left: sRect?.left,
        bottom: sRect?.bottom
      },
      lineLeft: {
        text: lineLeft?.textContent,
        color: lineLeft ? window.getComputedStyle(lineLeft).color : null
      },
      lineRight: {
        text: lineRight?.textContent,
        color: lineRight ? window.getComputedStyle(lineRight).color : null
      },
      fgCanvasDisplay: fgCanvas ? window.getComputedStyle(fgCanvas).display : null
    };
  });

  // --- PART B: 1366x768 CAPTURE ---
  console.log('Resizing to 1366x768 and capturing Exploded View...');
  await page.setViewport({ width: 1366, height: 768 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });
  await new Promise(r => setTimeout(r, 1200));

  await scrollToSectionProgress('exploded', 0.68);
  await new Promise(r => setTimeout(r, 1200));
  const exploded768Fps = await measureFps();
  const exploded768Path = path.join(artifactDir, 'exploded_view_1366x768.png');
  await page.screenshot({ path: exploded768Path });
  console.log(`Exploded View (1366x768) captured: ${exploded768Fps} FPS -> ${exploded768Path}`);

  const explodedInspection768 = await page.evaluate(() => {
    const coords = window.emberStage?.getExplodedLayerScreenCoords?.();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      coords
    };
  });

  await browser.close();

  const finalReport = {
    fps: {
      exploded1080: exploded1080Fps,
      exploded768: exploded768Fps,
      beanRainHalfway: beanRainHalfwayFps,
      beanRainFullest: beanRainFullestFps
    },
    screenshots: {
      exploded1080: exploded1080Path,
      exploded768: exploded768Path,
      beanRainHalfway: beanRainHalfwayPath,
      beanRainFullest: beanRainFullestPath
    },
    explodedInspection1080,
    explodedInspection768,
    beanRainInspection,
    consoleErrors,
    consoleMessagesCount: consoleMessages.length
  };

  console.log('---REPORT_START---');
  console.log(JSON.stringify(finalReport, null, 2));
  console.log('---REPORT_END---');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
