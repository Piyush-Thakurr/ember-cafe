/**
 * EMBER Dev-Only ScrollTrigger Audit Suite (js/audit.js)
 * Activated with ?audit=1
 * Validates:
 * 1. Every ScrollTrigger start/end in vh
 * 2. FAIL on any two pinned ranges that overlap
 * 3. FAIL on any gap > 15vh with nothing animating
 * 4. FAIL on any trigger without invalidateOnRefresh: true
 */

export function initAudit() {
  console.log('[EMBER AUDIT] Initializing dev-only audit (?audit=1)...');

  const runAudit = () => {
    if (!window.ScrollTrigger) {
      console.warn('[EMBER AUDIT] ScrollTrigger not found yet, retrying...');
      setTimeout(runAudit, 200);
      return;
    }

    const triggers = window.ScrollTrigger.getAll();
    if (!triggers || triggers.length === 0) {
      console.warn('[EMBER AUDIT] No ScrollTriggers registered yet, retrying...');
      setTimeout(runAudit, 200);
      return;
    }

    const vh = window.innerHeight;
    const reportTriggers = [];
    const pinnedTriggers = [];
    const errors = [];

    triggers.forEach((st, idx) => {
      const triggerEl = st.trigger;
      const id = triggerEl ? (triggerEl.id || triggerEl.className || `trigger-${idx}`) : `st-${idx}`;
      const isPinned = !!st.pin;
      const hasInvalidate = st.vars && st.vars.invalidateOnRefresh === true;

      const triggerInfo = {
        index: idx,
        id,
        startPx: Math.round(st.start),
        endPx: Math.round(st.end),
        startVh: Number(((st.start / vh) * 100).toFixed(1)),
        endVh: Number(((st.end / vh) * 100).toFixed(1)),
        lengthVh: Number((((st.end - st.start) / vh) * 100).toFixed(1)),
        isPinned,
        invalidateOnRefresh: hasInvalidate
      };

      reportTriggers.push(triggerInfo);
      if (isPinned) {
        pinnedTriggers.push(triggerInfo);
      }

      // Check 1: InvalidateOnRefresh check
      if (!hasInvalidate) {
        errors.push(`[RULE FAIL] Trigger "${id}" is missing invalidateOnRefresh: true`);
      }
    });

    // Check 2: Pinned ranges overlap check
    pinnedTriggers.sort((a, b) => a.startPx - b.startPx);
    for (let i = 0; i < pinnedTriggers.length - 1; i++) {
      const curr = pinnedTriggers[i];
      const next = pinnedTriggers[i + 1];
      // Allow max 2px sub-pixel rounding tolerance
      if (curr.endPx > next.startPx + 2) {
        errors.push(`[RULE FAIL] Pinned range overlap: "${curr.id}" (${curr.startVh}vh -> ${curr.endVh}vh) overlaps with "${next.id}" (${next.startVh}vh -> ${next.endVh}vh)`);
      }
    }

    // Check 3: Dead gap > 15vh between pinned sections with nothing animating
    for (let i = 0; i < pinnedTriggers.length - 1; i++) {
      const curr = pinnedTriggers[i];
      const next = pinnedTriggers[i + 1];
      const gapPx = next.startPx - curr.endPx;
      const gapVh = (gapPx / vh) * 100;
      if (gapVh > 15) {
        // Check if there is an unpinned animating trigger in this gap
        const hasTriggerInGap = reportTriggers.some(t => 
          !t.isPinned && t.startPx < next.startPx && t.endPx > curr.endPx
        );
        if (!hasTriggerInGap) {
          errors.push(`[RULE FAIL] Dead scroll gap of ${gapVh.toFixed(1)}vh (> 15vh) between "${curr.id}" and "${next.id}" with nothing animating`);
        }
      }
    }

    const pass = errors.length === 0;

    const auditResult = {
      pass,
      viewport: { width: window.innerWidth, height: vh },
      totalDocumentVh: Number((document.documentElement.scrollHeight / vh).toFixed(2)),
      triggers: reportTriggers,
      pinnedTriggers,
      errors
    };

    window.__emberAudit = auditResult;

    // Output to console table
    console.group(`[EMBER AUDIT] Result: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.table(reportTriggers.map(t => ({
      ID: t.id,
      Start: `${t.startVh}vh (${t.startPx}px)`,
      End: `${t.endVh}vh (${t.endPx}px)`,
      Length: `${t.lengthVh}vh`,
      Pinned: t.isPinned ? 'YES' : 'NO',
      'invalidateOnRefresh': t.invalidateOnRefresh ? 'YES' : 'FAIL'
    })));
    if (!pass) {
      console.error('[EMBER AUDIT] Errors detected:', errors);
    }
    console.groupEnd();

    // Render dev HUD overlay
    renderAuditHud(auditResult);
  };

  // Run audit after fonts and layout settle
  if (document.fonts) {
    document.fonts.ready.then(() => setTimeout(runAudit, 400));
  } else {
    setTimeout(runAudit, 600);
  }

  // Re-run on resize or refresh
  window.addEventListener('resize', () => setTimeout(runAudit, 300));
}

function renderAuditHud(audit) {
  let hud = document.getElementById('audit-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'audit-hud';
    hud.style.position = 'fixed';
    hud.style.top = '10px';
    hud.style.right = '10px';
    hud.style.maxHeight = '90vh';
    hud.style.width = '380px';
    hud.style.overflowY = 'auto';
    hud.style.backgroundColor = 'rgba(20, 16, 13, 0.95)';
    hud.style.border = audit.pass ? '1px solid #7A9A4A' : '1px solid #E0541F';
    hud.style.borderRadius = '6px';
    hud.style.padding = '12px';
    hud.style.zIndex = '999999';
    hud.style.color = '#ECE1CE';
    hud.style.fontFamily = 'monospace';
    hud.style.fontSize = '11px';
    hud.style.boxShadow = '0 8px 32px rgba(0,0,0,0.7)';
    document.body.appendChild(hud);
  }

  hud.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #33241C;padding-bottom:6px;">
      <strong style="color:${audit.pass ? '#7A9A4A' : '#E0541F'};font-size:12px;">
        AUDIT: ${audit.pass ? 'PASSED (0 Errors)' : 'FAILED (' + audit.errors.length + ' Errors)'}
      </strong>
      <span>Doc: ${audit.totalDocumentVh}vh</span>
    </div>
    ${audit.errors.length > 0 ? `
      <div style="background:rgba(224,84,31,0.15);border:1px solid #E0541F;border-radius:4px;padding:6px;margin-bottom:8px;color:#FF8A65;">
        ${audit.errors.map(e => `<div>• ${e}</div>`).join('')}
      </div>
    ` : ''}
    <div style="font-weight:bold;margin-bottom:4px;color:#C68A52;">PINNED SECTIONS (${audit.pinnedTriggers.length}):</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      ${audit.pinnedTriggers.map(t => `
        <tr style="border-bottom:1px solid #221812;">
          <td style="padding:2px 0;"><strong>#${t.id}</strong></td>
          <td style="text-align:right;color:#E0541F;">${t.startVh}vh -> ${t.endVh}vh</td>
          <td style="text-align:right;color:#ECE1CE;opacity:0.6;">(${t.lengthVh}vh)</td>
        </tr>
      `).join('')}
    </table>
  `;
}
