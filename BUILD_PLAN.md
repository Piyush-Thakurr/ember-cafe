<USER_REQUEST>
/plan FINAL BUILD: PHASES 0 TO 7. Work through the phases in order. After each phase: hard reload, scroll the touched sections in 100px steps taking screenshots to catch any black or blank frame, check the console and FPS (55+ at 1920x1080), run git commit -am "phase N: <name>", then continue to the next phase automatically. Stop and ask me only if a phase cannot reach 55 FPS even after its stated fallback, or a console error persists. If you cannot do something exactly as written, do the closest cheaper version and tell me in the final report. Never skip silently.

GLOBAL RULES
- All text comes from content.md (including the new MENU EXTRAS and FOOTER blocks). Colours and fonts from DESIGN.md. Wherever Bodoni Moda is used large (numerals, headlines, wordmarks), use font-optical-sizing: none, "opsz" 11, weight 800 and a thin same-colour -webkit-text-stroke so no hairline disappears.
- Keep as they are: hero look, State 1 spread, bean-rain typography, the exploded-view leader-line projection logic and tags, the Process layout and copy (approved), the reservation modal behaviour.
- ONE VESSEL CONTINUITY: the same 3D cup travels through the whole page and transforms at every section boundary. There are no hard cuts and no fades through black.
- Never render pure black. The darkest allowed backdrop is #14100D, and during the dive it is a caramel/espresso gradient.
- SCROLL BUDGET (target total about 1400vh, each +-15%): hero+dive 180vh, exploded 150vh, bean rain 180vh, menu 320vh, process 220vh, atmosphere 150vh, finale 130vh, footer 70vh. Set each section's ScrollTrigger end accordingly. No dead scroll of more than 15vh at the start or end of any section.

PHASE 0: DIAGNOSIS AND SCROLL FEEL (no new features)
- Lenis: lerp 0.085, wheelMultiplier 0.9, touchMultiplier 1.4, synced through gsap.ticker with lagSmoothing(0). ScrollTrigger scrub values of 0.6 to 1 for smoothness.
- Find the black screen between the exploded view and the bean rain, and any other black or blank frame in the whole page: scroll in 100px steps, screenshot each step, find the first all-dark frame, report the cause and fix it. Check: overlay or vignette opacity reaching 1, canvas visibility or rendering paused too early (keep rendering within 1.5 viewports of every section), section backgrounds that swap without overlapping, pin-spacer gaps, two ScrollTriggers fighting over the same property, the renderer clear colour.
- The headline "Look closer. The crema is a map." has disappeared from the dive. Restore it and verify it is visible.

PHASE 1: LIVELY HERO + FLOATING NAV
- Beans: replace the near-static drift with a curl-noise flow field (slow swirling drift in 3D), per-bean spin, gentle gravity sway with wrap-around, depth-based parallax, and mouse interaction (beans within a radius are gently pushed away from the cursor and spring back). Scroll velocity adds streaking and speed. Some beans slowly orbit the cup. Keep them out of the tagline zone and the nav. Keep ~400 beans.
- Cup: slow float (a few px of vertical bob), tiny roll, steam that reacts to mouse movement.
- NAV: remove the solid bar, the border and the hairline. Floating and transparent: wordmark left, links centre, Reserve pill (solid ember, the only filled shape) right. Use mix-blend-mode: difference for the text so it stays readable over crema and espresso sections. Hide on scroll down and show on scroll up (translateY). Add a small ember dot under the link of the current section. No bar, no box, no label look.

PHASE 2: 3D TRANSITION HERO -> DIVE -> EXPLODED VIEW
- 0 to 40% of the section: each EMBER letter flies outward past the camera on its own track (scale up to about 3.5x, fading as it passes the lens). The cup tilts forward about 65 degrees so the crema faces the camera. Camera FOV 40 to 75 with an ease-in dolly toward the crema. Add a light radial zoom-blur pass (EffectComposer with a custom radial-blur ShaderPass, strength tied to scroll velocity, enabled ONLY during transitions, auto-disabled if FPS < 55).
- 40 to 65%: ripple shockwave rings expand from the centre of the crema (shader uniform). The crema (caramel gradient #C68A52 to #8A5A35) fills the screen. Headline "Look closer. The crema is a map." on two lines, masked line-by-line reveal, holding for at least 35vh of scroll with a slow parallax drift.
- 65 to 100%: the camera pulls back and up to the 3/4 overhead angle of the exploded view. The crema detaches as the crema disc, the cup body assembles under it, and the layers separate. This continues straight into the exploded view with no cut.
- EXPLODED VIEW pacing (150vh): 0 to 25% separation (power3.out); 25 to 85% hold, each of the three labels draws in turn (about 20vh each, leader lines recomputed from projected 3D positions every frame); the camera slowly orbits +-8 degrees and each layer slowly turns at its own speed while held; 85 to 100% hold before the dissolve.

PHASE 3: EXPLODED VIEW -> BEAN RAIN (the cup dissolves into beans) + SMOOTH RING
- Each layer dissolves with a noise-threshold dissolve shader (ember glowing edge) while the 400 instanced beans spawn from the layer surfaces and fly into the rain. No black frames and no overlay fade.
- Rain -> ring: interpolate each bean from its rain position to its spiral/ring position with a per-bean stagger and ease (no teleporting, no all-at-once jump). The headline enters as the beans start gathering ("400 BEANS." from the left, "ONE CUP." from the right). The ring is a clean circle of about 24vh radius at 52% height with a uniform band about 4 beans thick; the front arc is sparser so every letter stays at least 70% visible.
- Exit: the ring contracts to the centre and the beans pour into the vessel that appears for the menu on the right side. Text exits upward with a stagger.

PHASE 4: MENU, "THE TASTING TURNTABLE" (replaces the sliding card strip)
- Pinned, 320vh (about 64vh per drink). Centre-right: a big 3D vessel (about 55% of the viewport height) on a slowly rotating turntable podium with a thin ember ring. Left: a huge solid numeral for the active drink (clamp 200 to 320px), the name in italic Bodoni Moda at 72px, the one-line description, the price counting up in an odometer roll (INR symbol), the serving tag (Hot or Iced) from content.md. The hint from content.md is shown at the start. At the right edge: a vertical rail of 5 ticks (01 to 05) with the names; clicking a tick scrolls to that drink; the arrow keys step through the drinks.
- Background: the active drink's photo as a full-bleed WebGL image plane behind the vessel, dimmed to about 35% and tinted warm. It reacts to the mouse with a liquid-distortion shader and changes via a circular reveal radiating from the vessel on every drink change. Use assets/menu/drink-0N-*.jpg. If the images are missing, first try to download the drink photos from the Stitch "Menu" screen through the MCP into assets/menu/ with those names. If that is not possible, tell me and use 3D-only visuals with a warm gradient so nothing is empty. Never use random placeholders.
- Every drink has its own procedural 3D vessel and effect, tinted with the liquid hex from content.md:
  01 Ember Espresso: classic espresso cup, dark crema, thin steam.
  02 Cortado Noir: small tumbler with two layers (espresso below, milk above) and an animated latte-art swirl on top.
  03 Burnt Caramel Latte: wide cup, an animated caramel ribbon falling from above and spiralling onto the foam, small glinting instanced sugar crystals.
  04 Cold Drip 18H: tall glass with 5 to 6 ice cubes (rounded boxes, fresnel-glass shader, bobbing) and a slow drip falling from a hanging bulb every 2 seconds, creating ripples.
  05 Ember Tonic: tall glass with a clear-to-dark two-tone gradient, about 120 rising bubbles (instanced), and an orange-peel twist (helix tube in ember orange).
- Change transition: the current vessel dissolves (the Phase 3 shader) while the next forms; the turntable spins about 120 degrees; the liquid colour and the background glow tween to the new drink's hex. Fallback if below 55 FPS: scale + colour crossfade only, with the effects kept.
- Exit: the vessel shrinks and rises, then dissolves into the green coffee bean of the Process section.
- Mobile: the vessel at the top 45vh, the text below, vertical scroll.

PHASE 5: PROCESS ENTRY AND EXIT (layout and copy unchanged)
- Entry: the bean grows out of the dissolving menu vessel to its Process position, rotating; the step labels slide in with a stagger. Step 1 (GREEN) is active immediately on entry, with no dead scroll.
- Exit: after BREW the drop elongates and falls with acceleration; where it lands, an expanding circular clip-path (from the landing point) turns the background from espresso to crema, with no fade through black. The finale cup then rises into place.

PHASE 6: FINALE + FOOTER
- Finale: keep the headline, the pill and the cup shrinking into the pill. Add around it: 6 to 8 tumbling ice cubes (rounded cubes, fresnel + fake refraction, no MeshPhysicalMaterial transmission), a coffee splash crown of about 60 instanced droplets arcing from the pill's cup with a looping gravity cycle (espresso and ember tints), a few beans, and an ember ripple ring expanding from the pill every 3 seconds. Mouse parallax on all of it. Hovering the pill makes the droplets burst up and settle. Nothing may overlap the headline or the hours and address. Keep 55+ FPS.
- Footer, a designed section and not a strip: espresso background, the giant solid "EMBER" wordmark FULLY visible (about 92vw wide, crema, letters rising into place on enter, soft ember underglow), above it three columns with no bordered boxes: left the closing line, centre the hours and address, right the functional links Menu / Process / Visit / Reserve. At the bottom: the (c) EMBER ATELIER line and the "Back to top" link, which scrolls to the top with Lenis. Everything fully visible at 1920x1080 and 1366x768 (check Lenis end-of-page padding so nothing is cut). Remove every bordered rectangular label and tag look across the page. The only filled shapes are the CTA pills.

PHASE 7: POLISH, MOBILE, ACCESSIBILITY, DEPLOY PREP
- Custom cursor (dot + ring) with the labels View / Drag / Reserve, hidden on touch. Film-grain overlay at 5 to 7% opacity, pointer-events none. Magnetic buttons (nav Reserve, finale pill, footer links). Text-scramble on nav link hover. Scroll progress: a thin ember line on the right edge plus a section counter [ 05 / 08 ] at the bottom left.
- Preloader: real loading progress (fonts, textures, images), minimum 1.6s, skipped for repeat visits in the same session (sessionStorage).
- Mobile (up to 768px): hamburger button that opens a full-screen espresso overlay with big links; 150 beans, DPR at most 1.25, no shadows, no radial blur, vertical menu, stacked footer.
- Accessibility: semantic landmarks, alt text for every image (use the captions), skip link, visible ember focus rings, keyboard support for the menu and the modal, prefers-reduced-motion static fallback for every section, body-text contrast of at least 4.5:1.
- WebGL fallback: if WebGL fails, show a static CSS poster and all text.
- SEO and meta: lang, title, description, theme-color #14100D, Open Graph tags, an inline SVG favicon.
- Images: resize to at most 1920px wide, WebP where possible, lazy-loaded with width/height set.
- Cleanup: remove debug logs and dead code; only pinned CDN dependencies; all paths relative; add .gitignore, .nojekyll and a README.md (how to run, file structure, credits).
- Final QA: scroll the whole page at 1920x1080 and 1366x768 in 100px steps and list every black or blank frame, overlap or cut-off text and fix them. Then give me a FINAL REPORT: FPS per section, console status, what each phase changed, anything you downgraded, and the exact git commands to push to GitHub and enable Pages. Then WAIT.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-10T14:00:49+05:30.

The user's current state is as follows:
Active Document: c:\Users\piyus\Downloads\projects\ember cafe\css\storyboards.css (LANGUAGE_CSS)
Cursor is on line: 1
Other open documents:
- c:\Users\piyus\Downloads\projects\ember cafe\css\storyboards.css (LANGUAGE_CSS)
Browser State:
  Page 3D9A09AD38B32F502C73B31955FBA4CC (EMBER — Atelier of slow coffee) - http://localhost:3000/?cache=bust6 [ACTIVE]
    Viewport: 1904x985, Page Height: 10639

The user has mentioned some items in the form @[ITEM]. Here is extra information about the items that were mentioned by the user, in the order that they appear:

/plan is a [Slash Command]:
<PLAN>The user is requesting that you think and plan carefully before executing the upcoming task.
Carefully research the task, make sure that you and the user are aligned on the goals and requirements,
create a detailed implementation plan artifact, and get user approval on the plan before making any code changes (besides artifacts)
or running any modifying commands.

# Guidelines
- Establish a shared understanding of the task with the user. If there are any ambiguities, underspecified requirements,
or implicit assumptions, clarify them with the user before proceeding.
- Thoroughly research the codebase to establish a solid understanding of the relevant components, systems, dependencies, and architecture.
As you research, provide verbal updates of your research steps and thought process with the user, so they can follow along.
- Create an implementation plan artifact that outlines your proposed execution strategy.
Set request_feedback = true and user_facing = true in the ArtifactMetadata. The user will automatically
see any new and modified plans you create, so DO NOT re-summarize the plan.
- Only after the user explicitly approves the plan should you proceed to execution.
- Verify that your changes have the desired effects e.g. run unit tests, make sure code builds, etc. before claiming that the task is complete.
- After you've completed your task and verified that your solution works, create a walkthrough artifact to summarize your work.

# Planning Mode Artifacts
When in planning mode, you should create two special artifacts.

# Implementation Plan
Path: <Artifact Directory>/<plan_name>.md

**Purpose**: A technical design document to present your implementation plan to the user for feedback and approval.
After reading the document, the user should understand the key technical details of your plan, and be able to make an informed decision on whether to approve it.
This document should be very detailed, including code snippets, diffs, mermaid diagrams, verification strategies, and background information.

**Format**: Use the following format, omitting any irrelevant sections:

## [Goal Description]
Provide a brief description of the problem, any background context, and what the change accomplishes.

## User Review Required
Document anything that requires user review or feedback, for example, breaking changes or significant design decisions. Use GitHub alerts (IMPORTANT/WARNING/CAUTION) to highlight critical items.

## Open Questions
Any clarifying or design questions for the user that will impact the implementation plan. Use GitHub alerts (IMPORTANT/WARNING/CAUTION) to highlight critical items.

## Proposed Changes
Group files by component (e.g., package, feature area, dependency layer) and order logically (dependencies first). Separate components with horizontal rules for visual clarity.

### [Component Name]
Summary of what will change in this component with explicit code snippets and diffs. For specific files, Use [NEW] and [DELETE] to demarcate new and deleted files, for example:
#### [MODIFY] file basename
#### [NEW] file basename
#### [DELETE] file basename

## Verification Plan
Summary of how you will verify that your changes have the desired effects.

### Automated Tests
Exact commands to run automated tests

### Manual Verification
Instructions for what the user should manually verify.

# Walkthrough
Path: <Artifact Directory>/walkthrough.md

**Purpose**: After completing work, summarize what you accomplished. Update an existing walkthrough for related follow-up work rather than creating a new one.

**Document**:
- Changes made
- What was tested
- Validation results

Embed screenshots and recordings to visually demonstrate UI changes and user flows.</PLAN>
</ADDITIONAL_METADATA>