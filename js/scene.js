import * as THREE from 'three';
import gsap from 'gsap';

/**
 * EMBER 3D Scene Engine (Stage 2B)
 * Includes:
 * - 75% procedural cup & saucer with deep charcoal glaze, contact shadow, edge highlights
 * - Separate meshes for Exploded View: cupMesh, saucerMesh, liquidMesh, foamMesh, spoonMesh
 * - Crema shader reacting to scroll velocity
 * - Camera dolly for Dive state
 * - 400 instanced beans with spiral ring vortex state for Bean Rain
 * - Pinned cup in Menu with active drink liquid color and rotation reaction
 * - Large 3D Bean in Process (GREEN -> ROAST pulse -> GRIND 300 granules -> BREW thin stream to dark liquid drop)
 * - Docking 3D cup shrinking into Finale CTA pill
 * - Full Stage API methods for GSAP ScrollTrigger
 */

export class EmberScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.container = canvas.parentElement;
    
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    this.clock = new THREE.Clock();
    
    // Meshes and groups
    this.cupGroup = null;
    this.cupMesh = null;
    this.saucerMesh = null;
    this.contactShadowMesh = null;
    this.handleMesh = null;
    this.liquidMesh = null;
    this.foamMesh = null;
    this.coffeeMesh = null;
    this.spoonMesh = null;
    this.cremaMaterial = null;
    this.cremaDiscMaterial = null;
    this.steamParticles = null;
    this.steamMaterial = null;
    
    // Instanced Beans
    this.beanMesh = null;
    this.beanInitialData = [];

    // Stage 2B: Process 3D Objects
    this.processGroup = null;
    this.processBeanMesh = null;
    this.processBeanMaterial = null;
    this.processGranulesMesh = null;
    this.processDropletMesh = null;
    this.granulesData = [];
    this.beanSimData = [];
    this.activeDrinkIndex = 0;
    
    // Reusable 3D helpers
    this._reusableDummy = new THREE.Object3D();
    this._zeroDummy = new THREE.Object3D();
    this._zeroDummy.scale.set(0, 0, 0);
    this._zeroDummy.updateMatrix();
    this._reusableVec = new THREE.Vector3();

    // Scrub States
    this.scrub = {
      heroScale: 0.70,
      heroTiltZ: 0.0,
      heroTiltX: 0.12,
      cupPosY: -1.14,
      cameraZ: 6.1,
      cameraY: 0.25,
      cameraLookY: -0.38,
      diveProgress: 0.0,
      explodedProgress: 0.0,
      beanRainProgress: 0.0,
      menuProgress: 0.0,
      processProgress: 0.0,
      finaleProgress: 0.0,
      sectionMode: 'hero',
      scrollVelocity: 0.0
    };
    
    this.init();
  }

  init() {
    // 1. WebGL Renderer with Performance Optimizations
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const maxDpr = window.innerWidth >= 1440 ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      36,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0.25, 6.1);
    this.camera.lookAt(0, -0.38, 0);

    // Optional Foreground Canvas for Bean Rain (to pass in front of DOM text)
    this.fgCanvas = document.getElementById('webgl-beans-fg');
    if (this.fgCanvas) {
      this.fgRenderer = new THREE.WebGLRenderer({
        canvas: this.fgCanvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.fgRenderer.setSize(window.innerWidth, window.innerHeight);
      this.fgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
      this.fgRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.fgRenderer.toneMappingExposure = 1.35;

      this.sceneFg = new THREE.Scene();

      const fgRim = new THREE.DirectionalLight(0xe0541f, 3.4);
      fgRim.position.set(0, 0.5, -4.5);
      this.sceneFg.add(fgRim);

      const fgKey = new THREE.DirectionalLight(0xf1e6d3, 3.8);
      fgKey.position.set(3.8, 2.5, 4.2);
      this.sceneFg.add(fgKey);

      const fgAmb = new THREE.AmbientLight(0x24140b, 1.0);
      this.sceneFg.add(fgAmb);
    }

    // 3. Lighting Setup
    this.setupLighting();

    // 4. Procedural Geometry & Objects
    this.createCupAndSaucer();
    this.createLiquidSurface();
    this.createExplodedComponents();
    this.createSteam();
    this.createInstancedBeans();
    this.createProcessObjects();
    this.initRadialBlurPass();

    // 5. Event Listeners
    this.bindEvents();

    // 6. Start Render Loop
    this.tick = this.tick.bind(this);
    this.renderer.setAnimationLoop(this.tick);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x24140b, 1.1);
    this.scene.add(ambientLight);

    // Key light with optimized 512x512 shadow map
    this.keyLight = new THREE.DirectionalLight(0xffecd4, 2.7);
    this.keyLight.position.set(3.4, 5.2, 4.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(512, 512);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 14;
    this.keyLight.shadow.camera.left = -2.5;
    this.keyLight.shadow.camera.right = 2.5;
    this.keyLight.shadow.camera.top = 2.5;
    this.keyLight.shadow.camera.bottom = -2.5;
    this.keyLight.shadow.bias = -0.0006;
    this.scene.add(this.keyLight);

    // Ember-orange (#E0541F) rim light from behind-left
    this.emberRimLight = new THREE.DirectionalLight(0xe0541f, 3.8);
    this.emberRimLight.position.set(-5.0, 2.6, -3.4);
    this.scene.add(this.emberRimLight);

    // Soft Crema (#F1E6D3) rim light from right
    this.cremaRimLight = new THREE.DirectionalLight(0xf1e6d3, 2.0);
    this.cremaRimLight.position.set(4.6, 2.2, -2.6);
    this.scene.add(this.cremaRimLight);

    // Bounce light
    const bounceLight = new THREE.DirectionalLight(0xd94f1a, 0.45);
    bounceLight.position.set(0, -3.5, 2.0);
    this.scene.add(bounceLight);

    // Dedicated Bean Rain lighting: ember rim from behind (#E0541F), crema key from front-right (#F1E6D3)
    this.beanRainRim = new THREE.DirectionalLight(0xe0541f, 0.0);
    this.beanRainRim.position.set(0, 0.5, -4.5);
    this.scene.add(this.beanRainRim);

    this.beanRainKey = new THREE.DirectionalLight(0xf1e6d3, 0.0);
    this.beanRainKey.position.set(3.8, 2.8, 4.2);
    this.scene.add(this.beanRainKey);
  }

  createCupAndSaucer() {
    this.cupGroup = new THREE.Group();
    this.cupGroup.position.set(0, -1.14, 0);
    this.cupGroup.scale.set(0.70, 0.70, 0.70);
    this.cupGroup.rotation.set(0.12, -0.16, -0.02);

    // Deep warm charcoal-brown glaze (#2B211B)
    this.cupGlazeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b211b,
      roughness: 0.45,
      metalness: 0.10
    });

    // Saucer slightly lighter (#44342A) with softer roughness
    this.saucerGlazeMaterial = new THREE.MeshStandardMaterial({
      color: 0x44342a,
      roughness: 0.38,
      metalness: 0.12
    });

    // 1. Procedural Cup Profile
    const cupPoints = [];
    cupPoints.push(new THREE.Vector2(0.0, -0.65));
    cupPoints.push(new THREE.Vector2(0.55, -0.65));
    cupPoints.push(new THREE.Vector2(0.58, -0.58));
    cupPoints.push(new THREE.Vector2(0.68, -0.42));
    cupPoints.push(new THREE.Vector2(0.88, -0.15));
    cupPoints.push(new THREE.Vector2(1.10, 0.22));
    cupPoints.push(new THREE.Vector2(1.22, 0.62));
    cupPoints.push(new THREE.Vector2(1.25, 0.68));
    cupPoints.push(new THREE.Vector2(1.21, 0.68));
    cupPoints.push(new THREE.Vector2(1.15, 0.58));
    cupPoints.push(new THREE.Vector2(0.98, 0.20));
    cupPoints.push(new THREE.Vector2(0.72, -0.22));
    cupPoints.push(new THREE.Vector2(0.48, -0.45));
    cupPoints.push(new THREE.Vector2(0.0, -0.48));

    const cupGeometry = new THREE.LatheGeometry(cupPoints, 48);
    cupGeometry.computeVertexNormals();
    this.cupMesh = new THREE.Mesh(cupGeometry, this.cupGlazeMaterial);
    this.cupMesh.castShadow = true;
    this.cupMesh.receiveShadow = false;
    this.cupGroup.add(this.cupMesh);

    // 2. Procedural Saucer
    const saucerPoints = [];
    saucerPoints.push(new THREE.Vector2(0.0, -0.88));
    saucerPoints.push(new THREE.Vector2(0.75, -0.88));
    saucerPoints.push(new THREE.Vector2(0.82, -0.84));
    saucerPoints.push(new THREE.Vector2(1.45, -0.76));
    saucerPoints.push(new THREE.Vector2(2.15, -0.58));
    saucerPoints.push(new THREE.Vector2(2.26, -0.54));
    saucerPoints.push(new THREE.Vector2(2.23, -0.58));
    saucerPoints.push(new THREE.Vector2(1.40, -0.82));
    saucerPoints.push(new THREE.Vector2(0.75, -0.92));
    saucerPoints.push(new THREE.Vector2(0.0, -0.92));

    const saucerGeometry = new THREE.LatheGeometry(saucerPoints, 48);
    saucerGeometry.computeVertexNormals();
    this.saucerMesh = new THREE.Mesh(saucerGeometry, this.saucerGlazeMaterial);
    this.saucerMesh.castShadow = false;
    this.saucerMesh.receiveShadow = true;
    this.cupGroup.add(this.saucerMesh);

    // Faint warm highlight along the saucer rim lip
    const rimGeo = new THREE.TorusGeometry(2.24, 0.016, 12, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc89255,
      roughness: 0.28,
      metalness: 0.35,
      transparent: true,
      opacity: 0.50
    });
    this.saucerRimHighlight = new THREE.Mesh(rimGeo, rimMat);
    this.saucerRimHighlight.rotation.x = Math.PI / 2;
    this.saucerRimHighlight.position.y = -0.54;
    this.saucerMesh.add(this.saucerRimHighlight);

    // Contact shadow ring under foot
    const contactShadowGeo = new THREE.RingGeometry(0.2, 0.82, 32);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a0502,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    this.contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    this.contactShadowMesh.rotation.x = -Math.PI / 2;
    this.contactShadowMesh.position.y = -0.83;
    this.cupGroup.add(this.contactShadowMesh);

    // 3. Ergonomic Handle
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.18, 0.48, 0),
      new THREE.Vector3(1.72, 0.38, 0),
      new THREE.Vector3(1.82, 0.08, 0),
      new THREE.Vector3(1.52, -0.16, 0),
      new THREE.Vector3(0.88, -0.25, 0)
    ]);
    const handleGeometry = new THREE.TubeGeometry(handleCurve, 32, 0.082, 12, false);
    this.handleMesh = new THREE.Mesh(handleGeometry, this.cupGlazeMaterial);
    this.handleMesh.castShadow = false;
    this.handleMesh.receiveShadow = false;
    this.cupMesh.add(this.handleMesh); // Attach handle to cup body so they move together

    this.scene.add(this.cupGroup);
  }

  createLiquidSurface() {
    const cremaVertexShader = `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const cremaFragmentShader = `
      uniform float uTime;
      uniform vec3 uColorCenter;
      uniform vec3 uColorEdge;
      uniform vec3 uColor;
      uniform float uRipple;
      uniform float uShockwave;
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vec2 center = vec2(0.5);
        vec2 uv = vUv - center;
        float dist = length(uv);

        float angle = atan(uv.y, uv.x);
        float swirl = sin(angle * 3.0 + dist * 7.0 - uTime * 0.4) * 0.025;
        
        // Concentric ripples reacting dynamically to scroll velocity + expanding shockwave rings
        float shockwave = sin(dist * 38.0 - uShockwave * 26.0) * exp(-dist * 2.8) * smoothstep(0.0, 0.15, uShockwave) * (1.0 - smoothstep(0.85, 1.0, uShockwave)) * 0.09;
        float ripple = sin(dist * 32.0 - uTime * 3.0) * (0.02 + uRipple * 0.06) + shockwave;

        float gradT = clamp((dist + swirl + ripple) / 0.48, 0.0, 1.0);
        gradT = smoothstep(0.0, 1.0, gradT);
        vec3 crema = mix(uColorCenter, uColorEdge, gradT);

        // Thin darker caramelized ring near the rim
        float rimRing = smoothstep(0.40, 0.45, dist) * (1.0 - smoothstep(0.485, 0.50, dist));
        vec3 darkRimColor = uColorEdge * 0.65;
        crema = mix(crema, darkRimColor, rimRing * 0.65);

        float outerContact = smoothstep(0.47, 0.50, dist);
        crema = mix(crema, darkRimColor * 0.8, outerContact * 0.85);

        // Specular sheen
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.4));
        vec3 normal = normalize(vec3(ripple * 2.0, 1.0, swirl * 2.0));
        vec3 viewDir = normalize(vec3(0.0, 1.0, 0.35));
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.38;
        crema += spec * vec3(1.0, 0.94, 0.86);

        gl_FragColor = vec4(crema, 1.0);
      }
    `;

    this.cremaMaterial = new THREE.ShaderMaterial({
      vertexShader: cremaVertexShader,
      fragmentShader: cremaFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uColorCenter: { value: new THREE.Color(0xc68a52) },
        uColorEdge: { value: new THREE.Color(0x8a5a35) },
        uColor: { value: new THREE.Color(0x2a1208) },
        uRipple: { value: 0.0 },
        uShockwave: { value: 0.0 }
      }
    });

    const liquidGeometry = new THREE.CircleGeometry(1.10, 48);
    this.liquidMesh = new THREE.Mesh(liquidGeometry, this.cremaMaterial);
    this.liquidMesh.rotation.x = -Math.PI / 2;
    this.liquidMesh.position.y = 0.52;
    this.liquidMesh.receiveShadow = false;
    this.cupGroup.add(this.liquidMesh);
  }

  createExplodedComponents() {
    // 1. Crema Disc Mesh (Uses same caramel crema shader as hero: radial #C68A52 to #8A5A35 with ripples)
    this.cremaDiscMaterial = this.cremaMaterial.clone();
    this.cremaDiscMaterial.side = THREE.DoubleSide;
    const foamGeo = new THREE.CircleGeometry(1.06, 48);
    this.foamMesh = new THREE.Mesh(foamGeo, this.cremaDiscMaterial);
    this.foamMesh.rotation.x = -Math.PI / 2;
    this.foamMesh.position.y = 0.52;
    this.foamMesh.visible = false;
    this.cupGroup.add(this.foamMesh);

    // 2. Coffee Disc Mesh (Dark glossy liquid disc with specular highlight & thin ember edge ring)
    this.coffeeMesh = new THREE.Group();
    const coffeeCircleGeo = new THREE.CircleGeometry(1.06, 48);
    const coffeeVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const coffeeFragmentShader = `
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv - vec2(0.5);
        float dist = length(uv);
        vec3 centerCol = vec3(0.18, 0.08, 0.03); // Rich dark roasted espresso
        vec3 edgeCol = vec3(0.07, 0.02, 0.01);   // Deep dark caramelized roast
        float t = smoothstep(0.0, 0.50, dist);
        vec3 col = mix(centerCol, edgeCol, t);
        
        // Specular sheen for liquid gloss
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5));
        vec3 viewDir = normalize(vec3(0.0, 1.0, 0.35));
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(vec3(0.0, 1.0, 0.0), halfDir), 0.0), 36.0) * 0.42;
        col += spec * vec3(1.0, 0.94, 0.85);

        gl_FragColor = vec4(col, 1.0);
      }
    `;
    const coffeeMat = new THREE.ShaderMaterial({
      vertexShader: coffeeVertexShader,
      fragmentShader: coffeeFragmentShader,
      side: THREE.DoubleSide
    });
    const coffeeCircle = new THREE.Mesh(coffeeCircleGeo, coffeeMat);
    this.coffeeMesh.add(coffeeCircle);

    // Thin ember glow ring along the outer edge
    const coffeeGlowGeo = new THREE.RingGeometry(1.01, 1.065, 48);
    const coffeeGlowMat = new THREE.MeshBasicMaterial({
      color: 0xe0541f, // Ember orange #E0541F
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const coffeeGlow = new THREE.Mesh(coffeeGlowGeo, coffeeGlowMat);
    coffeeGlow.position.z = 0.002;
    this.coffeeMesh.add(coffeeGlow);

    this.coffeeMesh.rotation.x = -Math.PI / 2;
    this.coffeeMesh.position.y = 0.50;
    this.coffeeMesh.visible = false;
    this.cupGroup.add(this.coffeeMesh);

    // 3. Artisanal Brushed Brass Spoon Mesh (40% thicker, centered along the centre line)
    this.spoonMesh = new THREE.Group();
    const spoonMat = new THREE.MeshStandardMaterial({
      color: 0xd4b278, // Warm artisanal brushed brass
      roughness: 0.28,
      metalness: 0.88
    });

    // 40% thicker handle (radius 0.065 to 0.095, length 1.45)
    const spoonHandleGeo = new THREE.CylinderGeometry(0.065, 0.095, 1.45, 16);
    const spoonHandle = new THREE.Mesh(spoonHandleGeo, spoonMat);
    spoonHandle.rotation.z = Math.PI / 2;
    spoonHandle.position.set(-0.25, 0, 0);
    this.spoonMesh.add(spoonHandle);

    // 40% thicker bowl (radius 0.336)
    const spoonBowlGeo = new THREE.SphereGeometry(0.336, 20, 20);
    const spoonBowl = new THREE.Mesh(spoonBowlGeo, spoonMat);
    spoonBowl.scale.set(1.15, 1.45, 0.55);
    spoonBowl.position.set(0.65, 0, 0);
    this.spoonMesh.add(spoonBowl);

    // Centered along X=0, gentle floating tilt
    this.spoonMesh.rotation.set(0.18, 0.12, -0.08);
    this.spoonMesh.position.set(0, 0.55, 0);
    this.spoonMesh.visible = false;
    this.cupGroup.add(this.spoonMesh);
  }

  createSteam() {
    const wispCount = 24;
    const positions = new Float32Array(wispCount * 3);
    const life = new Float32Array(wispCount);
    const speeds = new Float32Array(wispCount);
    const offsets = new Float32Array(wispCount);
    const scales = new Float32Array(wispCount);

    for (let i = 0; i < wispCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.22;
      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.58;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      life[i] = Math.random();
      speeds[i] = 0.14 + Math.random() * 0.16;
      offsets[i] = Math.random() * Math.PI * 2;
      scales[i] = 0.7 + Math.random() * 0.5;
    }

    const steamGeometry = new THREE.BufferGeometry();
    steamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    steamGeometry.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
    steamGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    steamGeometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));
    steamGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const steamVertexShader = `
      uniform float uTime;
      uniform vec2 uMouse;
      attribute float aLife;
      attribute float aSpeed;
      attribute float aOffset;
      attribute float aScale;
      varying float vAlpha;

      void main() {
        vec3 pos = position;
        float progress = fract(aLife + uTime * aSpeed * 0.35);

        pos.y = 0.58 + progress * 2.3;
        float curlX = sin(uTime * 0.6 + aOffset) * 0.16 * progress;
        float curlZ = cos(uTime * 0.5 + aOffset * 1.2) * 0.12 * progress;
        pos.x += curlX + uMouse.x * 0.35 * progress;
        pos.z += curlZ + uMouse.y * 0.25 * progress;

        float fadeIn = smoothstep(0.0, 0.22, progress);
        float fadeOut = 1.0 - smoothstep(0.40, 0.95, progress);
        vAlpha = fadeIn * fadeOut * 0.11;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        float pointSz = (110.0 / max(1.2, -mvPosition.z)) * aScale * (0.8 + progress * 1.8);
        gl_PointSize = clamp(pointSz, 4.0, 90.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const steamFragmentShader = `
      uniform float uSteamAlpha;
      varying float vAlpha;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        float wispShape = smoothstep(0.5, 0.05, dist) * exp(-dist * dist * 12.0);
        vec3 steamColor = vec3(0.96, 0.89, 0.80);
        gl_FragColor = vec4(steamColor, vAlpha * wispShape * uSteamAlpha);
      }
    `;

    this.steamMaterial = new THREE.ShaderMaterial({
      vertexShader: steamVertexShader,
      fragmentShader: steamFragmentShader,
      uniforms: {
        uTime: { value: 0.0 },
        uSteamAlpha: { value: 1.0 },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.steamParticles = new THREE.Points(steamGeometry, this.steamMaterial);
    this.cupGroup.add(this.steamParticles);
  }

  createInstancedBeans() {
    const totalBeans = 400;

    const beanGeo = new THREE.SphereGeometry(0.125, 18, 18);
    const pos = beanGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      y *= 1.42;
      z *= 0.78;

      if (z > 0.02 && Math.abs(x) < 0.05) {
        z *= 0.36;
      }

      pos.setXYZ(i, x, y, z);
    }
    beanGeo.computeVertexNormals();

    // Brighter palette (#7A4A2E to #4A2A18), roughness 0.35
    const beanMaterial = new THREE.MeshStandardMaterial({
      color: 0x683c22,
      roughness: 0.35,
      metalness: 0.08
    });

    this.beanMesh = new THREE.InstancedMesh(beanGeo, beanMaterial, totalBeans);
    this.beanMesh.castShadow = false;
    this.beanMesh.receiveShadow = false;

    // Foreground bean mesh for bean rain (passes in front of DOM text)
    if (this.sceneFg) {
      this.beanMeshFg = new THREE.InstancedMesh(beanGeo, beanMaterial, totalBeans);
      this.beanMeshFg.castShadow = false;
      this.beanMeshFg.receiveShadow = false;
      this.sceneFg.add(this.beanMeshFg);
    }

    const dummy = new THREE.Object3D();
    const roastPalette = [
      new THREE.Color(0x7A4A2E),
      new THREE.Color(0x6E4026),
      new THREE.Color(0x60361F),
      new THREE.Color(0x522C16),
      new THREE.Color(0x4A2A18)
    ];

    this.beanInitialData = [];
    this.beanSimData = [];

    // Base 24vh ring radius (FOV 36, Z=6.1 -> 100vh = 3.9639 units -> 24vh = 0.951 units)
    const base24vhRadius = 0.951;

    for (let i = 0; i < totalBeans; i++) {
      // 100 sectors x 4 layers = 400 beans
      const sector = Math.floor(i / 4); // 0 to 99
      const layer = i % 4;             // 0, 1, 2, 3

      // Organic rain scatter across the viewport for falling rain phase
      const pseudoX = (((i * 37.1) % 9.6) - 4.8) + ((i % 5) - 2) * 0.12;
      const pseudoY = 0.6 + ((i * 23.3) % 4.6) - 1.4; // initial Y in [-0.8, 3.8]
      const pseudoZ = -1.2 + ((i * 17.7) % 2.2);
      const scale = 0.34 + (i % 5) * 0.022; // max ~0.43, well below 140px

      let x = pseudoX;
      let y = pseudoY;
      let z = pseudoZ;

      // Exclude subline zone (60px margin): |X| < 1.35 and Y in [-1.60, -1.02]
      if (Math.abs(x) < 1.35 && y > -1.60 && y < -1.02) {
        x += (x >= 0 ? 1.5 : -1.5);
      }

      // Initial fall speed distance over first half
      const fallDist = 2.4 + (i % 7) * 0.35;

      const rot = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      dummy.position.set(x, y, z);
      dummy.rotation.copy(rot);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      this.beanMesh.setMatrixAt(i, dummy.matrix);
      const color = roastPalette[Math.floor(Math.random() * roastPalette.length)];
      this.beanMesh.setColorAt(i, color);
      if (this.beanMeshFg) {
        this.beanMeshFg.setColorAt(i, color);
      }

      // Ring Target Coordinates (ONE clean ring, true circle of radius 24vh, uniform band 4 beans thick)
      const baseAngle = (sector / 100) * Math.PI * 2.0;
      const ringAngle = baseAngle + layer * 0.015; // slight organic stagger

      // Uniform band ~4 beans thick centered on 24vh (0.9513 units)
      const radialOffset = (layer - 1.5) * 0.038 + ((sector % 3) - 1) * 0.006;
      const targetRingRadius = base24vhRadius + radialOffset;

      // Depth: front arc vs back arc
      const baseTiltZ = (-Math.cos(ringAngle) + Math.sin(ringAngle)) * 0.7071 * 0.28;
      const isFrontArc = baseTiltZ > 0.02;

      // Front arc is much sparser than back arc so all letters stay >= 70% visible (only 1 in 6 sectors, layer 0)
      const isForeground = isFrontArc && (layer === 0 && sector % 6 === 0);
      const targetZ = isForeground 
        ? (0.10 + layer * 0.02) 
        : (isFrontArc ? (-0.08 - layer * 0.03) : (-0.12 - layer * 0.05 + baseTiltZ * 0.5));

      this.beanInitialData.push({
        origPos: new THREE.Vector3(x, y, z),
        origRot: rot,
        origScale: scale,
        fallDist: fallDist,
        sector: sector,
        layer: layer,
        ringAngle: ringAngle,
        targetRingRadius: targetRingRadius,
        targetZ: targetZ,
        isForeground: isForeground
      });

      // Simulation Data for Hero:
      // ~20 beans slowly orbit around the cup
      const isOrbit = i < 20;
      const orbitRadius = 0.88 + (i % 5) * 0.12;
      const orbitSpeed = 0.35 + (i % 4) * 0.12;
      const orbitPhase = (i / 20) * Math.PI * 2;
      const orbitTilt = ((i % 3) - 1) * 0.25;

      let heroX = pseudoX;
      let heroY = pseudoY;
      let heroZ = pseudoZ;

      // Keep out of tagline zone: bottom-left 40% width x 25% height: x in [-3.8, -0.6], y in [-2.3, -1.05]
      if (heroX > -3.8 && heroX < -0.5 && heroY > -2.3 && heroY < -1.05) {
        heroX += 2.4;
      }
      // Keep out of nav zone: top 12%: y > 1.82
      if (heroY > 1.82) {
        heroY = 1.65 - (i % 4) * 0.22;
      }

      this.beanSimData.push({
        x: heroX,
        y: heroY,
        z: heroZ,
        baseX: heroX,
        baseY: heroY,
        baseZ: heroZ,
        vx: 0,
        vy: 0,
        vz: 0,
        spinX: (Math.random() - 0.5) * 2.2,
        spinY: (Math.random() - 0.5) * 2.5,
        spinZ: (Math.random() - 0.5) * 1.8,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        scale: scale,
        isOrbit: isOrbit,
        orbitRadius: orbitRadius,
        orbitSpeed: orbitSpeed,
        orbitPhase: orbitPhase,
        orbitTilt: orbitTilt,
        flowOffset: (i * 17.3) % 100,
        gravityRate: -0.06 - (i % 6) * 0.015
      });
    }

    this.beanMesh.instanceMatrix.needsUpdate = true;
    if (this.beanMesh.instanceColor) this.beanMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.beanMesh);

    if (this.beanMeshFg) {
      const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let j = 0; j < totalBeans; j++) {
        this.beanMeshFg.setMatrixAt(j, zeroMat);
      }
      this.beanMeshFg.instanceMatrix.needsUpdate = true;
      if (this.beanMeshFg.instanceColor) this.beanMeshFg.instanceColor.needsUpdate = true;
    }
  }

  createProcessObjects() {
    this.processGroup = new THREE.Group();
    const isMobile = window.innerWidth <= 768;
    this.processGroup.position.set(isMobile ? 0 : 1.48, isMobile ? 0.9 : 0.0, 0);
    this.processGroup.visible = false;
    this.scene.add(this.processGroup);

    // 1. Large 3D Bean (reuse bean geometry, ~6x scale)
    const beanGeo = new THREE.SphereGeometry(0.72, 24, 24);
    const pos = beanGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      y *= 1.42;
      z *= 0.78;

      if (z > 0.12 && Math.abs(x) < 0.30) {
        z *= 0.36; // crease down the center
      }

      pos.setXYZ(i, x, y, z);
    }
    beanGeo.computeVertexNormals();

    this.processBeanMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x7A9A4A), // Step 1 GREEN #7A9A4A
      roughness: 0.38,
      metalness: 0.06
    });

    this.processBeanMesh = new THREE.Mesh(beanGeo, this.processBeanMaterial);
    this.processBeanMesh.castShadow = true;
    this.processGroup.add(this.processBeanMesh);

    // 2. Instanced Granules for Step 3 GRIND (300 granules)
    const granuleCount = 300;
    const granuleGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const granuleMat = new THREE.MeshStandardMaterial({
      color: 0x4A2A18, // Rich roast ground color
      roughness: 0.45,
      metalness: 0.05
    });

    this.processGranulesMesh = new THREE.InstancedMesh(granuleGeo, granuleMat, granuleCount);
    this.processGranulesMesh.visible = false;
    this.granulesData = [];

    const dummy = new THREE.Object3D();

    for (let i = 0; i < granuleCount; i++) {
      // Points inside bean volume
      const u = Math.random();
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.cbrt(u) * 0.58;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta) * 1.35;
      const z = r * Math.cos(phi) * 0.72;

      // Burst velocity direction
      const burstVec = new THREE.Vector3(x, y, z).normalize();
      const burstDist = 0.8 + Math.random() * 1.4;

      // Settled position: scattered flat bed of coffee grounds
      const settleX = x * 2.2 + (Math.random() - 0.5) * 0.6;
      const settleY = -0.55 + (Math.random() - 0.5) * 0.35;
      const settleZ = z * 2.2 + (Math.random() - 0.5) * 0.6;

      // Brew thin stream target: concentrated vertical flow into drop
      const streamX = (Math.random() - 0.5) * 0.12;
      const streamZ = (Math.random() - 0.5) * 0.12;
      const streamY = 0.65 - (i / granuleCount) * 1.5;

      const scale = 0.7 + Math.random() * 0.5;

      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      this.processGranulesMesh.setMatrixAt(i, dummy.matrix);

      this.granulesData.push({
        initPos: new THREE.Vector3(x, y, z),
        burstDir: burstVec,
        burstDist: burstDist,
        settlePos: new THREE.Vector3(settleX, settleY, settleZ),
        streamTarget: new THREE.Vector3(streamX, streamY, streamZ),
        scale: scale
      });
    }

    this.processGranulesMesh.instanceMatrix.needsUpdate = true;
    this.processGroup.add(this.processGranulesMesh);

    // 3. Liquid Droplet for Step 4 BREW
    const dropGeo = new THREE.SphereGeometry(0.22, 18, 18);
    const dropPos = dropGeo.attributes.position;
    for (let i = 0; i < dropPos.count; i++) {
      let x = dropPos.getX(i);
      let y = dropPos.getY(i);
      let z = dropPos.getZ(i);

      if (y > 0) {
        const factor = 1.0 - (y / 0.22) * 0.75;
        x *= factor;
        z *= factor;
        y *= 1.45;
      } else {
        y *= 0.92;
      }
      dropPos.setXYZ(i, x, y, z);
    }
    dropGeo.computeVertexNormals();

    const dropMat = new THREE.MeshStandardMaterial({
      color: 0x1B0F0A, // Dark espresso drop
      roughness: 0.12,
      metalness: 0.35
    });

    this.processDropletMesh = new THREE.Mesh(dropGeo, dropMat);
    this.processDropletMesh.position.set(0, -0.95, 0);
    this.processDropletMesh.scale.set(0, 0, 0);
    this.processDropletMesh.visible = false;
    this.processGroup.add(this.processDropletMesh);
  }

  initRadialBlurPass() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const maxDpr = width >= 1440 ? 1.5 : 2.0;
    const dpr = Math.min(window.devicePixelRatio, maxDpr);

    this.blurTarget = new THREE.WebGLRenderTarget(Math.floor(width * dpr), Math.floor(height * dpr), {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    this.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uStrength;
        uniform vec2 uCenter;
        varying vec2 vUv;

        void main() {
          if (uStrength <= 0.001) {
            gl_FragColor = texture2D(tDiffuse, vUv);
            return;
          }
          vec2 dir = vUv - uCenter;
          vec4 sum = vec4(0.0);
          for (int i = 0; i < 8; i++) {
            float s = 1.0 - uStrength * (float(i) / 7.0);
            sum += texture2D(tDiffuse, uCenter + dir * s);
          }
          gl_FragColor = sum / 8.0;
        }
      `,
      uniforms: {
        tDiffuse: { value: null },
        uStrength: { value: 0.0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) }
      },
      depthWrite: false,
      depthTest: false
    });

    this.blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMaterial);
    this.blurScene = new THREE.Scene();
    this.blurScene.add(this.blurQuad);

    this.lastFrameTimes = [];
    this.currentFPS = 60;
  }

  bindEvents() {
    this.onResize = this.onResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    const maxDpr = width >= 1440 ? 1.5 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));

    if (this.fgRenderer) {
      this.fgRenderer.setSize(width, height);
      this.fgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
    }

    if (this.blurTarget) {
      const dpr = Math.min(window.devicePixelRatio, maxDpr);
      this.blurTarget.setSize(Math.floor(width * dpr), Math.floor(height * dpr));
    }
  }

  onMouseMove(e) {
    const normX = (e.clientX / window.innerWidth - 0.5) * 2;
    const normY = (e.clientY / window.innerHeight - 0.5) * 2;

    this.mouse.targetX = normX;
    this.mouse.targetY = normY;
  }

  // --- STAGE 2A SCROLL SCRUBBING APIS ---

  // State 1: Cup scales ~1 -> 1.6 (base 0.70 -> 1.12), tilts ~ -7.5 deg
  setHeroScrub(progress) {
    this.scrub.sectionMode = 'hero';
    if (this.cupGroup) this.cupGroup.visible = true;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = true;

    this.scrub.heroScale = 0.70 + progress * 0.42; // scales ~1.6x
    this.scrub.heroTiltZ = -progress * 0.13;       // -7.5 degrees
    this.scrub.heroTiltX = 0.12 + progress * 0.14; // slight pitch
    this.scrub.cupPosY = -1.14 + progress * 0.28;

    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) this.liquidMesh.visible = true;
    if (this.beanRainRim) this.beanRainRim.intensity = 0.0;
    if (this.beanRainKey) this.beanRainKey.intensity = 0.0;
    this.renderer.toneMappingExposure = 1.15;

    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      this.steamMaterial.uniforms.uSteamAlpha.value = 1.0;
      if (this.steamParticles) this.steamParticles.visible = true;
    }
  }

  // State 2: Camera dollies into crema, ripple reacts to scroll velocity
  setDiveScrub(progress, velocity = 0) {
    this.scrub.sectionMode = 'dive';
    if (this.cupGroup) this.cupGroup.visible = true;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = true;

    this.scrub.diveProgress = progress;
    this.scrub.scrollVelocity = velocity;

    const enteringExploded = progress > 0.85;
    if (this.foamMesh) this.foamMesh.visible = enteringExploded;
    if (this.coffeeMesh) this.coffeeMesh.visible = enteringExploded;
    if (this.spoonMesh) this.spoonMesh.visible = enteringExploded;
    if (this.liquidMesh) this.liquidMesh.visible = !enteringExploded;
    if (this.beanRainRim) this.beanRainRim.intensity = 0.0;
    if (this.beanRainKey) this.beanRainKey.intensity = 0.0;
    this.renderer.toneMappingExposure = 1.15;

    // Fade steam smoothly during dive into crema surface to prevent point-sprite overdraw
    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      const alpha = progress < 0.25 ? 1.0 - (progress / 0.25) : (progress > 0.75 ? (progress - 0.75) / 0.25 : 0.0);
      this.steamMaterial.uniforms.uSteamAlpha.value = alpha;
      if (this.steamParticles) this.steamParticles.visible = alpha > 0.01;
    }

    // Camera dollies down into crema (0 to 0.65), then pulls back for Exploded (0.65 to 1.0)
    if (progress <= 0.40) {
      // Phase 2: 0 to 40%:
      // Cup tilts forward ~65° (1.134 rad) so crema faces camera
      // Camera FOV 40 to 75 with ease-in dolly toward crema
      const t = progress / 0.40;
      const easeDolly = t * t;
      this.camera.fov = THREE.MathUtils.lerp(40, 75, easeDolly);
      this.camera.updateProjectionMatrix();

      this.scrub.heroTiltX = THREE.MathUtils.lerp(0.26, 1.134, t);
      this.scrub.heroTiltZ = THREE.MathUtils.lerp(-0.13, 0.0, t);
      this.scrub.heroScale = THREE.MathUtils.lerp(1.12, 1.45, easeDolly);
      this.scrub.cupPosY = THREE.MathUtils.lerp(-0.86, -0.65, easeDolly);

      this.scrub.cameraZ = THREE.MathUtils.lerp(6.1, 2.2, easeDolly);
      this.scrub.cameraY = THREE.MathUtils.lerp(0.25, -0.65, easeDolly);
      this.scrub.cameraLookY = THREE.MathUtils.lerp(-0.38, -0.65, easeDolly);

      if (this.cremaMaterial && this.cremaMaterial.uniforms.uShockwave) {
        this.cremaMaterial.uniforms.uShockwave.value = 0.0;
      }
    } else if (progress <= 0.65) {
      // Phase 2: 40 to 65%:
      // Crema fills screen, ripple shockwave rings expand from centre of crema
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();

      this.scrub.heroTiltX = 1.134;
      this.scrub.heroTiltZ = 0.0;
      this.scrub.heroScale = 1.45;
      this.scrub.cupPosY = -0.65;

      this.scrub.cameraZ = 2.2;
      this.scrub.cameraY = -0.65;
      this.scrub.cameraLookY = -0.65;

      const shockwaveT = (progress - 0.40) / 0.25;
      if (this.cremaMaterial && this.cremaMaterial.uniforms.uShockwave) {
        this.cremaMaterial.uniforms.uShockwave.value = shockwaveT;
      }
    } else {
      // Phase 2: 65 to 100%:
      // Camera pulls back and up to 3/4 overhead angle of exploded view
      const p = (progress - 0.65) / 0.35;
      this.camera.fov = THREE.MathUtils.lerp(75, 36, p);
      this.camera.updateProjectionMatrix();

      this.scrub.cameraZ = THREE.MathUtils.lerp(2.2, 6.1, p);
      this.scrub.cameraY = THREE.MathUtils.lerp(-0.65, 0.40, p);
      this.scrub.cameraLookY = THREE.MathUtils.lerp(-0.65, -0.10, p);

      this.scrub.heroTiltX = THREE.MathUtils.lerp(1.134, 0.245, p);
      this.scrub.heroTiltZ = 0.0;
      this.scrub.heroScale = THREE.MathUtils.lerp(1.45, 0.58, p);
      this.scrub.cupPosY = THREE.MathUtils.lerp(-0.65, -0.06, p);

      if (this.cremaMaterial && this.cremaMaterial.uniforms.uShockwave) {
        this.cremaMaterial.uniforms.uShockwave.value = 0.0;
      }
    }

    // Ripple shader reacts to velocity
    if (this.cremaMaterial && this.cremaMaterial.uniforms.uRipple) {
      this.cremaMaterial.uniforms.uRipple.value = Math.min(Math.abs(velocity) * 0.08, 0.45);
    }
  }

  // Exploded View: cup components separate along Y centre line with even 0.50 visible gaps
  // Exploded View: camera tilted 18° down, stack scaled up 20%, even layer gaps, 25% dimmed beans
  setExplodedScrub(progress) {
    this.scrub.sectionMode = 'exploded';
    if (this.cupGroup) this.cupGroup.visible = true;
    if (this.processGroup) this.processGroup.visible = false;
    this.scrub.explodedProgress = progress;
    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      this.steamMaterial.uniforms.uSteamAlpha.value = 0.0;
      if (this.steamParticles) this.steamParticles.visible = false;
    }
    if (this.beanRainRim) this.beanRainRim.intensity = 0.0;
    if (this.beanRainKey) this.beanRainKey.intensity = 0.0;
    this.renderer.toneMappingExposure = 1.15;

    const inExploded = progress > 0.005;
    if (this.foamMesh) this.foamMesh.visible = inExploded;
    if (this.coffeeMesh) this.coffeeMesh.visible = inExploded;
    if (this.spoonMesh) this.spoonMesh.visible = inExploded;
    if (this.liquidMesh) this.liquidMesh.visible = !inExploded;

    if (!this.cupMesh || !this.saucerMesh) return;

    this.camera.fov = 36;
    this.camera.updateProjectionMatrix();

    this.scrub.cameraY = 0.40;
    this.scrub.cameraLookY = -0.10;
    this.scrub.heroTiltZ = 0.0;
    this.scrub.heroTiltX = 0.245; // ~14 degrees on X
    this.scrub.cupPosY = -0.06;
    this.scrub.heroScale = 0.58; // Scaled up ~20% (0.50 -> 0.58)

    this.cupGroup.scale.set(0.58, 0.58, 0.58);
    this.cupGroup.position.set(0, -0.06, 0);
    this.cupGroup.rotation.set(0.245, 0, 0);

    // Pacing: 0 to 25% separation with power3.out easing: 1 - (1 - p)^3
    const p = Math.min(Math.max(progress, 0.0), 1.0);
    const easedP = 1.0 - Math.pow(1.0 - p, 3.0);

    this.saucerMesh.position.y = -easedP * 1.38;
    if (this.contactShadowMesh) this.contactShadowMesh.position.y = -0.83 - easedP * 1.38;

    this.cupMesh.position.y = -easedP * 0.30;

    if (this.coffeeMesh) {
      this.coffeeMesh.position.y = THREE.MathUtils.lerp(0.50, 0.82, easedP);
    }

    if (this.foamMesh) {
      this.foamMesh.position.y = THREE.MathUtils.lerp(0.52, 1.34, easedP);
    }

    if (this.spoonMesh) {
      this.spoonMesh.position.y = THREE.MathUtils.lerp(0.55, 1.86, easedP);
      this.spoonMesh.position.x = 0;
    }

    // Reduce visible beans in this section to ~25% (100 beans), slightly dimmer, kept out of label, tag and leader-line zones
    if (!this._reusableDummy) {
      this._reusableDummy = new THREE.Object3D();
      this._zeroDummy = new THREE.Object3D();
      this._zeroDummy.scale.set(0, 0, 0);
      this._zeroDummy.updateMatrix();
      this._reusableVec = new THREE.Vector3();
    }
    const dummy = this._reusableDummy;
    const zeroDummy = this._zeroDummy;
    const count = this.beanInitialData.length;

    if (inExploded && this.beanMesh) {
      for (let i = 0; i < count; i++) {
        if (i >= 100) {
          // 75% of beans hidden
          this.beanMesh.setMatrixAt(i, zeroDummy.matrix);
        } else {
          // 25% of beans visible: dimmer and kept out of label, tag and leader zones
          const b = this.beanInitialData[i];
          let bx = b.origPos.x;
          let by = b.origPos.y;
          let bz = -3.2 - (i % 4) * 0.35; // Deeper in Z, dimmer

          // Exclude center stack zone: |X| < 1.4, Y in [-1.5, 1.5]
          if (Math.abs(bx) < 1.4 && Math.abs(by) < 1.6) {
            bx += (bx >= 0 ? 2.4 : -2.4);
          }
          // Exclude left & right label/tag corridors: |X| in [0.8, 3.2], Y in [-1.1, 1.1]
          if (Math.abs(bx) > 0.8 && Math.abs(bx) < 3.2 && by > -1.1 && by < 1.1) {
            by += (by >= 0 ? 1.4 : -1.4);
          }

          const bScale = Math.min(b.origScale, 0.28);
          dummy.position.set(bx, by, bz);
          dummy.rotation.copy(b.origRot);
          dummy.scale.set(bScale, bScale, bScale);
          dummy.updateMatrix();
          this.beanMesh.setMatrixAt(i, dummy.matrix);
        }
        if (this.beanMeshFg) {
          this.beanMeshFg.setMatrixAt(i, zeroDummy.matrix);
        }
      }
      this.beanMesh.instanceMatrix.needsUpdate = true;
      if (this.beanMeshFg) this.beanMeshFg.instanceMatrix.needsUpdate = true;
    }
  }

  // Real-time 3D projected screen coordinates (pixels) for all 5 layers
  getExplodedLayerScreenCoords() {
    if (!this.cupGroup || !this.camera) return null;

    this.cupGroup.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    const width = window.innerWidth;
    const height = window.innerHeight;

    const projectToScreen = (localVec) => {
      const v = localVec.clone();
      v.applyMatrix4(this.cupGroup.matrixWorld);
      v.project(this.camera);
      return {
        x: (v.x * 0.5 + 0.5) * width,
        y: (-v.y * 0.5 + 0.5) * height
      };
    };

    // 1. Spoon: right tip at local (0.75, spoonPosY, 0)
    const spoonY = this.spoonMesh ? this.spoonMesh.position.y : 1.86;
    const spoonRight = projectToScreen(new THREE.Vector3(0.75, spoonY, 0));

    // 2. Crema Disc: left edge and right edge (radius 1.06)
    const cremaY = this.foamMesh ? this.foamMesh.position.y : 1.34;
    const cremaLeft = projectToScreen(new THREE.Vector3(-1.06, cremaY, 0));
    const cremaRight = projectToScreen(new THREE.Vector3(1.06, cremaY, 0));

    // 3. Coffee Disc: left edge and right edge (radius 1.06)
    const coffeeY = this.coffeeMesh ? this.coffeeMesh.position.y : 0.82;
    const coffeeLeft = projectToScreen(new THREE.Vector3(-1.06, coffeeY, 0));
    const coffeeRight = projectToScreen(new THREE.Vector3(1.06, coffeeY, 0));

    // 4. Cup Body:
    // 03 NOTES: place the dot exactly on the cup's outer body surface (project a point on the cup's left outer wall)
    const cupY = this.cupMesh ? this.cupMesh.position.y : -0.30;
    const cupLeft = projectToScreen(new THREE.Vector3(-0.96, cupY + 0.16, 0.28));
    const cupRight = projectToScreen(new THREE.Vector3(1.02, cupY + 0.10, 0));

    // 5. Saucer: right edge (radius 2.20)
    const saucerY = this.saucerMesh ? this.saucerMesh.position.y : -1.38;
    const saucerRight = projectToScreen(new THREE.Vector3(2.20, saucerY - 0.54, 0));

    return {
      spoonRight,
      cremaLeft,
      cremaRight,
      coffeeLeft,
      coffeeRight,
      cupLeft,
      cupRight,
      saucerRight
    };
  }

  // State 3: Bean Rain:
  // First half = rain (beans scattered and falling).
  // Second half = beans spiral inwards into ONE clean ring of radius 24vh at 52% viewport height.
  // Ring is complete and stable at the end of the section.
  // Front arc is much sparser than back arc so all letters stay >= 70% visible.
  // Excludes 60px margin around subline.
  setBeanRainScrub(progress) {
    this.scrub.sectionMode = 'bean-rain';
    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = true;
    this.scrub.beanRainProgress = progress;
    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      this.steamMaterial.uniforms.uSteamAlpha.value = 0.0;
      if (this.steamParticles) this.steamParticles.visible = false;
    }
    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;

    // Show/hide foreground canvas (rendered only while bean rain is in view)
    if (this.fgCanvas) {
      this.fgCanvas.style.display = progress > 0.01 ? 'block' : 'none';
    }

    // Light the beans in this section: ember rim (#E0541F), crema key (#F1E6D3), tone-mapping exposure +20%
    if (this.beanRainRim) this.beanRainRim.intensity = Math.min(progress * 4.0, 3.4);
    if (this.beanRainKey) this.beanRainKey.intensity = Math.min(progress * 4.2, 3.8);
    this.renderer.toneMappingExposure = 1.15 * (1.0 + Math.min(progress * 0.25, 0.20));
    if (this.fgRenderer) this.fgRenderer.toneMappingExposure = 1.15 * (1.0 + Math.min(progress * 0.25, 0.20));

    if (!this.beanMesh || !this.beanInitialData.length) return;

    // Reset bean mesh position & rotation
    this.beanMesh.position.set(0, 0, 0);
    this.beanMesh.rotation.set(0, 0, 0);
    if (this.beanMeshFg) {
      this.beanMeshFg.position.set(0, 0, 0);
      this.beanMeshFg.rotation.set(0, 0, 0);
    }

    // Camera transitions smoothly to level (centered at 50vh, looking at (0,0,0))
    this.scrub.cameraY = 0.0;
    this.scrub.cameraLookY = 0.0;
    this.scrub.cameraZ = 6.1;
    this.camera.position.set(0, 0, 6.1);
    this.camera.lookAt(0, 0, 0);

    // Smooth continuous transition from exploded view into bean vortex (no hard cut or blank frame)
    if (progress < 0.22) {
      const fade = 1.0 - (progress / 0.22);
      this.scrub.heroScale = 0.58 * fade;
      this.scrub.cupPosY = -0.06 - (1.0 - fade) * 1.5;
      if (this.cupGroup) {
        this.cupGroup.scale.set(this.scrub.heroScale, this.scrub.heroScale, this.scrub.heroScale);
        this.cupGroup.position.set(0, this.scrub.cupPosY, 0);
        this.cupGroup.visible = fade > 0.01;
      }
    } else {
      this.scrub.heroScale = 0.0;
      this.scrub.cupPosY = -5.0;
      if (this.cupGroup) {
        this.cupGroup.scale.set(0, 0, 0);
        this.cupGroup.visible = false;
      }
    }

    if (!this._reusableDummy) {
      this._reusableDummy = new THREE.Object3D();
      this._zeroDummy = new THREE.Object3D();
      this._zeroDummy.scale.set(0, 0, 0);
      this._zeroDummy.updateMatrix();
      this._reusableVec = new THREE.Vector3();
    }
    const dummy = this._reusableDummy;
    const zeroDummy = this._zeroDummy;
    const tempVec = this._reusableVec;
    const count = this.beanInitialData.length;

    const ringCenterY = -0.08; // Mathematically 52% of viewport height at FOV 36, Z 6.1

    if (progress <= 0.50) {
      // -------------------------------------------------------------------
      // FIRST HALF: RAIN (beans scattered and falling downwards along Y)
      // -------------------------------------------------------------------
      const pRain = progress / 0.50; // 0.0 to 1.0

      for (let i = 0; i < count; i++) {
        const b = this.beanInitialData[i];

        let curX = b.origPos.x + Math.sin(pRain * 2.5 + i) * 0.12;
        let curY = b.origPos.y - pRain * b.fallDist;
        let curZ = b.origPos.z;

        // Keep falling beans away from subline (exclude 60px margin): |X| < 1.35 and Y in [-1.55, -1.08]
        if (Math.abs(curX) < 1.35 && curY > -1.55 && curY < -1.08) {
          curX += (curX >= 0 ? 1.45 : -1.45);
        }

        const rotX = b.origRot.x + pRain * Math.PI * 2.8;
        const rotY = b.origRot.y + pRain * Math.PI * 2.2;
        const beanScale = Math.min(b.origScale, 0.44);

        tempVec.set(curX, curY, curZ);
        dummy.position.copy(tempVec);
        dummy.rotation.set(rotX, rotY, b.origRot.z);
        dummy.scale.set(beanScale, beanScale, beanScale);
        dummy.updateMatrix();

        // During rain phase, beans render on background canvas
        this.beanMesh.setMatrixAt(i, dummy.matrix);
        if (this.beanMeshFg) {
          this.beanMeshFg.setMatrixAt(i, zeroDummy.matrix);
        }
      }
    } else {
      // -------------------------------------------------------------------
      // SECOND HALF: SPIRAL INWARDS INTO ONE CLEAN RING (24vh radius, 52% height)
      // Complete and stable at the end of the section (progress >= 0.92)
      // -------------------------------------------------------------------
      const t = (progress - 0.50) / 0.50; // 0.0 to 1.0
      // Complete and stable at the end of the section
      const e = THREE.MathUtils.smoothstep(t, 0.0, 0.84); // Reaches 1.0 at t=0.84 (progress=0.92)

      const spiralTurns = 2.0;

      for (let i = 0; i < count; i++) {
        const b = this.beanInitialData[i];

        // Rain end position at p = 0.50
        const rainEndX = b.origPos.x + Math.sin(2.5 + i) * 0.12;
        const rainEndY = b.origPos.y - b.fallDist;
        const rainEndZ = b.origPos.z;

        // Ring target position: ONE clean true circle of radius 24vh, centered at (0, -0.08)
        const currentAngle = b.ringAngle + (1.0 - e) * spiralTurns * Math.PI;
        const targetX = Math.cos(currentAngle) * b.targetRingRadius;
        const targetY = ringCenterY + Math.sin(currentAngle) * b.targetRingRadius;
        const targetZ = b.targetZ;

        // Smooth transition from rain position to clean ring position
        const curX = THREE.MathUtils.lerp(rainEndX, targetX, e);
        const curY = THREE.MathUtils.lerp(rainEndY, targetY, e);
        const curZ = THREE.MathUtils.lerp(rainEndZ, targetZ, e);

        const rotX = b.origRot.x + (1.0 + e) * Math.PI * 2.0;
        const rotY = b.origRot.y + (1.0 + e) * Math.PI * 2.4;
        const beanScale = Math.min(b.origScale, 0.44);

        tempVec.set(curX, curY, curZ);
        dummy.position.copy(tempVec);
        dummy.rotation.set(rotX, rotY, b.origRot.z);
        dummy.scale.set(beanScale, beanScale, beanScale);
        dummy.updateMatrix();

        // Foreground vs background depth split:
        // Front arc is much sparser than back arc (only b.isForeground beans render in foreground canvas)
        // All letters of "400 BEANS." and "ONE CUP." stay >= 70% (in fact > 90%) visible!
        if (this.beanMeshFg && b.isForeground && e > 0.15) {
          this.beanMeshFg.setMatrixAt(i, dummy.matrix);
          this.beanMesh.setMatrixAt(i, zeroDummy.matrix);
        } else {
          this.beanMesh.setMatrixAt(i, dummy.matrix);
          if (this.beanMeshFg) {
            this.beanMeshFg.setMatrixAt(i, zeroDummy.matrix);
          }
        }
      }
    }

    this.beanMesh.instanceMatrix.needsUpdate = true;
    if (this.beanMeshFg) {
      this.beanMeshFg.instanceMatrix.needsUpdate = true;
    }
  }

  // Liquid color tweening (Stage API)
  setLiquidColor(hexColor) {
    if (this.cremaMaterial && this.cremaMaterial.uniforms.uColor) {
      const targetColor = new THREE.Color(hexColor);
      this.cremaMaterial.uniforms.uColor.value.copy(targetColor);
    }
  }

  // --- STAGE 2B METHODS ---

  setMenuScrub(progress) {
    this.scrub.sectionMode = 'menu';
    this.scrub.menuProgress = progress;

    // Reset exploded layers back to assembled cup
    if (this.saucerMesh) this.saucerMesh.position.y = 0;
    if (this.contactShadowMesh) this.contactShadowMesh.position.y = -0.83;
    if (this.cupMesh) this.cupMesh.position.y = 0;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) this.liquidMesh.visible = true;

    // Cup pinned in right third (~65% left is cards)
    // On desktop X=1.85, Y=0.0, Z=0.0; on mobile X=0, Y=0.9
    const isMobile = window.innerWidth <= 768;
    const targetX = isMobile ? 0 : 1.85;
    const targetY = isMobile ? 0.9 : 0.0;
    const targetScale = isMobile ? 0.42 : 0.52;

    if (this.cupGroup) {
      this.cupGroup.visible = true;
      this.cupGroup.position.set(targetX, targetY, 0);
      this.cupGroup.scale.set(targetScale, targetScale, targetScale);
      // Cards scroll progress causes subtle tilt & rotation
      this.cupGroup.rotation.x = 0.18 + Math.sin(progress * Math.PI) * 0.05;
      this.cupGroup.rotation.z = -0.05;
    }

    // Hide beans or keep very sparse
    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
    if (this.fgCanvas) this.fgCanvas.style.display = 'none';
    if (this.processGroup) this.processGroup.visible = false;

    // Camera level
    this.camera.position.set(0, 0, 6.1);
    this.camera.lookAt(0, 0, 0);
    this.renderer.toneMappingExposure = 1.15;
  }

  setDrinkActive(index) {
    this.activeDrinkIndex = index;
    const drinkColors = [
      '#2A1208', // 01 Ember Espresso
      '#8A5A35', // 02 Cortado Noir
      '#C68A52', // 03 Burnt Caramel Latte
      '#1B0F0A', // 04 Cold Drip 18H
      '#D9822B'  // 05 Ember Tonic
    ];
    const hex = drinkColors[index] || '#2A1208';
    this.setLiquidColor(hex);

    // If not in menu mode, immediately activate menu mode
    if (this.scrub.sectionMode !== 'menu') {
      this.setMenuScrub(0);
    }

    // Cup rotates a little (rotateY) on drink change
    if (this.cupGroup) {
      const targetRotY = -0.25 + (index - 2) * 0.20;
      gsap.to(this.cupGroup.rotation, {
        y: targetRotY,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
  }

  setProcessScrub(progress) {
    this.scrub.sectionMode = 'process';
    this.scrub.processProgress = progress;

    // Hide cup, beans, fg canvas
    if (this.cupGroup) this.cupGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
    if (this.fgCanvas) this.fgCanvas.style.display = 'none';

    if (!this.processGroup) return;
    this.processGroup.visible = true;

    const isMobile = window.innerWidth <= 768;
    this.processGroup.position.set(isMobile ? 0 : 1.48, isMobile ? 0.9 : 0.0, 0);

    // Camera level
    this.camera.position.set(0, 0, 6.1);
    this.camera.lookAt(0, 0, 0);

    const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
    const colorGreen = new THREE.Color(0x7A9A4A);
    const colorRoast = new THREE.Color(0x5A3220);

    if (progress < 0.25) {
      // Step 1: 01 GREEN (#7A9A4A)
      this.processBeanMesh.visible = true;
      this.processBeanMesh.scale.set(1.0, 1.0, 1.0);
      this.processBeanMaterial.color.copy(colorGreen);
      this.processGranulesMesh.visible = false;
      this.processDropletMesh.visible = false;
    } else if (progress < 0.50) {
      // Step 2: 02 ROAST (#7A9A4A -> #5A3220 with small scale pulse)
      const t = (progress - 0.25) / 0.25;
      this.processBeanMesh.visible = true;
      this.processBeanMaterial.color.lerpColors(colorGreen, colorRoast, t);
      
      // Small scale pulse peaking around t=0.5
      const pulse = 1.0 + Math.sin(t * Math.PI) * 0.16;
      this.processBeanMesh.scale.set(pulse, pulse, pulse);

      this.processGranulesMesh.visible = false;
      this.processDropletMesh.visible = false;
    } else if (progress < 0.75) {
      // Step 3: 03 GRIND (bean breaks into ~300 granules that scatter and settle)
      const t = (progress - 0.50) / 0.25;
      this.processBeanMesh.visible = t < 0.15;
      if (t < 0.15) {
        const shrink = 1.0 - (t / 0.15);
        this.processBeanMesh.scale.set(shrink, shrink, shrink);
      } else {
        this.processBeanMesh.scale.set(0, 0, 0);
      }

      this.processGranulesMesh.visible = true;
      this.processDropletMesh.visible = false;

      // Scatter and settle granules
      const burstPeak = Math.sin(Math.min(t * 1.5, 1.0) * Math.PI);
      for (let i = 0; i < this.granulesData.length; i++) {
        const g = this.granulesData[i];
        const curX = THREE.MathUtils.lerp(g.initPos.x + g.burstDir.x * g.burstDist * burstPeak, g.settlePos.x, t);
        const curY = THREE.MathUtils.lerp(g.initPos.y + g.burstDir.y * g.burstDist * burstPeak, g.settlePos.y, t);
        const curZ = THREE.MathUtils.lerp(g.initPos.z + g.burstDir.z * g.burstDist * burstPeak, g.settlePos.z, t);

        dummy.position.set(curX, curY, curZ);
        dummy.scale.set(g.scale, g.scale, g.scale);
        dummy.rotation.set(curX * 3, curY * 3, curZ * 3);
        dummy.updateMatrix();
        this.processGranulesMesh.setMatrixAt(i, dummy.matrix);
      }
      this.processGranulesMesh.instanceMatrix.needsUpdate = true;
    } else {
      // Step 4: 04 BREW (granules fall into thin stream fading into dark liquid drop)
      const t = (progress - 0.75) / 0.25;
      this.processBeanMesh.visible = false;
      this.processGranulesMesh.visible = t < 0.95;
      this.processDropletMesh.visible = true;

      // Granules fall into stream and fade
      for (let i = 0; i < this.granulesData.length; i++) {
        const g = this.granulesData[i];
        const streamProgress = Math.min((t * 1.3) + (i % 20) * 0.015, 1.0);
        const curX = THREE.MathUtils.lerp(g.settlePos.x, g.streamTarget.x, streamProgress);
        const curY = THREE.MathUtils.lerp(g.settlePos.y, g.streamTarget.y - t * 0.8, streamProgress);
        const curZ = THREE.MathUtils.lerp(g.settlePos.z, g.streamTarget.z, streamProgress);

        const fadeScale = Math.max(0, g.scale * (1.0 - t * 1.1));
        dummy.position.set(curX, curY, curZ);
        dummy.scale.set(fadeScale, fadeScale, fadeScale);
        dummy.rotation.set(0, curY * 4, 0);
        dummy.updateMatrix();
        this.processGranulesMesh.setMatrixAt(i, dummy.matrix);
      }
      this.processGranulesMesh.instanceMatrix.needsUpdate = true;

      // Dark liquid drop grows and gently pulses
      const dropScale = Math.min(t * 1.3, 1.0);
      const bobY = -0.95 + Math.sin(t * Math.PI * 4) * 0.04;
      this.processDropletMesh.scale.set(dropScale, dropScale * 1.1, dropScale);
      this.processDropletMesh.position.y = bobY;
    }
  }

  setAtmosphereScrub(progress) {
    this.scrub.sectionMode = 'atmosphere';
    if (this.cupGroup) this.cupGroup.visible = false;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
  }

  setFinaleScrub(progress) {
    this.scrub.sectionMode = 'finale';
    this.scrub.finaleProgress = progress;

    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
    if (this.fgCanvas) this.fgCanvas.style.display = 'none';

    // Assemble cup
    if (this.saucerMesh) this.saucerMesh.position.y = 0;
    if (this.cupMesh) this.cupMesh.position.y = 0;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) this.liquidMesh.visible = true;

    if (!this.cupGroup) return;
    this.cupGroup.visible = true;

    // Find the pill cup target element in the DOM
    const targetEl = document.getElementById('pill-cup-target');
    let targetWorldX = 0;
    let targetWorldY = 0;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Project into 3D world space at Z=0
      const ndcX = (centerX / window.innerWidth) * 2 - 1;
      const ndcY = -(centerY / window.innerHeight) * 2 + 1;

      // Camera FOV 36, Z 6.1
      const vFOV = (36 * Math.PI) / 180;
      const halfHeight = Math.tan(vFOV / 2) * 6.1;
      const halfWidth = halfHeight * (window.innerWidth / window.innerHeight);

      targetWorldX = ndcX * halfWidth;
      targetWorldY = ndcY * halfHeight;
    }

    // Shrinks (scrub) from ~0.55 down to ~0.052 (perfect fit inside 48px target circle!)
    const p = Math.max(0, Math.min(progress, 1.0));
    const startX = 0;
    const startY = 0.5;
    const startScale = 0.55;
    const endScale = 0.052;

    const curScale = THREE.MathUtils.lerp(startScale, endScale, p);
    const curX = THREE.MathUtils.lerp(startX, targetWorldX, p);
    const curY = THREE.MathUtils.lerp(startY, targetWorldY, p);

    this.cupGroup.position.set(curX, curY, 0);
    this.cupGroup.scale.set(curScale, curScale, curScale);
    this.cupGroup.rotation.x = 0.24;
    this.cupGroup.rotation.z = 0.0;

    if (this.steamParticles) {
      this.steamParticles.visible = p < 0.6;
    }

    this.camera.position.set(0, 0, 6.1);
    this.camera.lookAt(0, 0, 0);
  }

  tick() {
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Mouse Easing & Scrub Blending
    if (!this.isReducedMotion) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.045;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.045;

      const isHeroMode = ['hero', 'dive', 'exploded'].includes(this.scrub.sectionMode);

      if (this.cupGroup && isHeroMode) {
        const currentScale = this.scrub.heroScale;
        this.cupGroup.scale.set(currentScale, currentScale, currentScale);

        if (this.scrub.explodedProgress > 0.005) {
          // Exploded view: camera slowly orbits +-8 degrees, layers slowly turn
          const orbitAngle = Math.sin(elapsedTime * 0.45) * 0.14; // +-8 deg
          this.cupGroup.rotation.set(this.scrub.heroTiltX, 0, this.scrub.heroTiltZ);
          this.cupGroup.position.set(0, this.scrub.cupPosY, 0);
          this.camera.position.set(Math.sin(orbitAngle) * 6.1, this.scrub.cameraY, Math.cos(orbitAngle) * 6.1);
          this.camera.lookAt(0, this.scrub.cameraLookY, 0);

          if (this.spoonMesh) this.spoonMesh.rotation.y = elapsedTime * 0.18;
          if (this.foamMesh) this.foamMesh.rotation.y = elapsedTime * -0.14;
          if (this.coffeeMesh) this.coffeeMesh.rotation.y = elapsedTime * 0.16;
          if (this.cupMesh) this.cupMesh.rotation.y = elapsedTime * -0.09;
          if (this.saucerMesh) this.saucerMesh.rotation.y = elapsedTime * 0.07;
        } else {
          // Hero / Dive float & roll
          const isHero = this.scrub.sectionMode === 'hero';
          const verticalBob = isHero ? Math.sin(elapsedTime * 1.6) * 0.038 : 0;
          const rollBob = isHero ? Math.cos(elapsedTime * 1.4) * 0.018 : 0;
          const pitchBob = isHero ? Math.sin(elapsedTime * 1.1) * 0.015 : 0;

          const targetRotX = this.scrub.heroTiltX + this.mouse.y * 0.10 + pitchBob;
          const targetRotY = -0.16 + Math.sin(elapsedTime * 0.28) * 0.04 + this.mouse.x * 0.16;
          const targetRotZ = this.scrub.heroTiltZ + rollBob;

          this.cupGroup.rotation.x += (targetRotX - this.cupGroup.rotation.x) * 0.08;
          this.cupGroup.rotation.y += (targetRotY - this.cupGroup.rotation.y) * 0.08;
          this.cupGroup.rotation.z += (targetRotZ - this.cupGroup.rotation.z) * 0.08;

          this.cupGroup.position.y += ((this.scrub.cupPosY + verticalBob) - this.cupGroup.position.y) * 0.08;

          // Camera dolly lerp
          this.camera.position.z += (this.scrub.cameraZ - this.camera.position.z) * 0.08;
          this.camera.position.y += (this.scrub.cameraY - this.camera.position.y) * 0.08;
          this.camera.lookAt(0, this.scrub.cameraLookY, 0);
        }
      }

      // Idle rotations for Stage 2B sections
      if (this.scrub.sectionMode === 'menu' && this.cupGroup) {
        const isMobile = window.innerWidth <= 768;
        this.cupGroup.position.x = isMobile ? 0 : 1.85;
        this.cupGroup.position.y = (isMobile ? 0.9 : 0.0) + Math.sin(elapsedTime * 1.5) * 0.03;
        const targetScale = isMobile ? 0.42 : 0.52;
        this.cupGroup.scale.set(targetScale, targetScale, targetScale);
        this.cupGroup.rotation.y += delta * 0.35;
      } else if (this.scrub.sectionMode === 'process' && this.processBeanMesh && this.processBeanMesh.visible) {
        this.processBeanMesh.rotation.y += delta * 0.40;
        this.processBeanMesh.rotation.x = 0.15 + Math.sin(elapsedTime * 0.6) * 0.08;
      } else if (this.scrub.sectionMode === 'finale' && this.cupGroup) {
        this.cupGroup.rotation.y += delta * 0.75;
      }

      // Lively Hero: Curl-Noise Flow Field, per-bean spin, gravity sway, mouse push & orbit
      if (this.beanMesh && this.scrub.sectionMode === 'hero' && this.beanSimData && this.beanSimData.length) {
        const t = elapsedTime;
        const mouseWorldX = this.mouse.x * 3.6;
        const mouseWorldY = this.mouse.y * 2.0;
        const scrollVelocity = this.scrub.scrollVelocity || 0;
        const scrollSpeedBoost = 1.0 + Math.abs(scrollVelocity) * 2.2;
        const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
        const totalBeans = this.beanSimData.length;

        for (let i = 0; i < totalBeans; i++) {
          const b = this.beanSimData[i];

          if (b.isOrbit) {
            // Orbiting the cup
            const angle = b.orbitPhase + t * b.orbitSpeed * 0.5;
            b.x = Math.cos(angle) * b.orbitRadius;
            b.z = Math.sin(angle) * b.orbitRadius;
            b.y = this.scrub.cupPosY + 0.35 + Math.sin(angle * 2.0 + b.orbitTilt) * 0.12;

            b.rotX += b.spinX * delta;
            b.rotY += b.spinY * delta;
          } else {
            // Curl-noise flow field (swirling 3D drift)
            const fx = (Math.sin(b.y * 1.1 + t * 0.35 + b.flowOffset) * 0.18 - Math.cos(b.z * 1.3 - t * 0.28) * 0.14) * scrollSpeedBoost;
            const fy = (Math.sin(b.z * 1.2 + t * 0.40) * 0.16 - Math.cos(b.x * 1.0 - t * 0.32) * 0.14 + b.gravityRate) * scrollSpeedBoost;
            const fz = (Math.sin(b.x * 1.4 + t * 0.30) * 0.18 - Math.cos(b.y * 1.1 - t * 0.38) * 0.12) * scrollSpeedBoost;

            b.vx += (fx - b.vx) * 0.08;
            b.vy += (fy - b.vy) * 0.08;
            b.vz += (fz - b.vz) * 0.08;

            // Mouse interaction: push away within radius and spring back
            const dx = b.x - mouseWorldX;
            const dy = b.y - mouseWorldY;
            const distSq = dx * dx + dy * dy;
            const repulseRadius = 1.35;
            if (distSq < repulseRadius * repulseRadius && distSq > 0.001) {
              const dist = Math.sqrt(distSq);
              const force = (1.0 - dist / repulseRadius) * 2.4 * delta;
              b.vx += (dx / dist) * force;
              b.vy += (dy / dist) * force;
            }

            // Move bean
            b.x += b.vx * delta * 1.8;
            b.y += b.vy * delta * 1.8;
            b.z += b.vz * delta * 1.8;
            b.vx *= 0.96;
            b.vy *= 0.96;
            b.vz *= 0.96;

            // Per-bean spin
            b.rotX += b.spinX * delta * (1.0 + Math.abs(b.vx) * 2.0);
            b.rotY += b.spinY * delta * (1.0 + Math.abs(b.vy) * 2.0);
            b.rotZ += b.spinZ * delta;

            // Zone avoidance: Tagline zone (bottom-left 40% width x 25% height)
            if (b.x > -3.8 && b.x < -0.5 && b.y > -2.3 && b.y < -1.05) {
              b.vx += 1.0 * delta;
              b.vy += 1.0 * delta;
            }
            // Zone avoidance: Nav zone (top 12%)
            if (b.y > 1.82) {
              b.y = 1.80;
              b.vy = -0.6;
            }

            // Boundary wrap-around
            if (b.y < -2.4) {
              b.y = 2.4;
              b.x = ((Math.random() - 0.5) * 8.0);
            } else if (b.y > 2.45) {
              b.y = -2.35;
            }
            if (b.x < -4.8) b.x = 4.7;
            if (b.x > 4.8) b.x = -4.7;
            if (b.z < -4.2) b.z = 0.2;
            if (b.z > 0.5) b.z = -3.8;
          }

          // Depth-based parallax: shallow Z moves more with mouse
          const depthFactor = THREE.MathUtils.mapLinear(b.z, -4.2, 0.5, 0.35, 1.3);
          const px = b.x + this.mouse.x * 0.18 * depthFactor;
          const py = b.y - this.mouse.y * 0.14 * depthFactor;
          const pz = b.z;

          // Streaking elongation during fast scroll
          const streakScaleY = Math.min(b.scale * (1.0 + Math.abs(scrollVelocity) * 0.6), b.scale * 1.8);

          dummy.position.set(px, py, pz);
          dummy.rotation.set(b.rotX, b.rotY, b.rotZ);
          dummy.scale.set(b.scale, streakScaleY, b.scale);
          dummy.updateMatrix();
          this.beanMesh.setMatrixAt(i, dummy.matrix);
        }
        this.beanMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2. Shaders Progression
    if (this.cremaMaterial && this.cremaMaterial.uniforms) {
      this.cremaMaterial.uniforms.uTime.value = elapsedTime;
    }

    if (this.cremaDiscMaterial && this.cremaDiscMaterial.uniforms) {
      this.cremaDiscMaterial.uniforms.uTime.value = elapsedTime;
    }

    if (this.steamMaterial && this.steamMaterial.uniforms) {
      this.steamMaterial.uniforms.uTime.value = elapsedTime;
      if (this.steamMaterial.uniforms.uMouse) {
        this.steamMaterial.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      }
    }

    // Track FPS
    const now = performance.now();
    if (!this.lastFrameTimes) this.lastFrameTimes = [];
    this.lastFrameTimes.push(now);
    while (this.lastFrameTimes.length > 0 && this.lastFrameTimes[0] < now - 1000) {
      this.lastFrameTimes.shift();
    }
    this.currentFPS = this.lastFrameTimes.length;

    // 3. Render Frame with Radial Zoom Blur enabled ONLY during transitions (Hero -> Dive, Dive -> Exploded)
    const isTransitioning = this.scrub.sectionMode === 'dive' && (this.scrub.diveProgress < 0.40 || this.scrub.diveProgress > 0.65);
    const vel = Math.abs(this.scrub.scrollVelocity || 0);
    const blurStrength = (isTransitioning && vel > 0.05 && this.currentFPS >= 55) ? Math.min(vel * 0.12, 0.18) : 0.0;
    this.scrub.scrollVelocity *= 0.88;
    if (Math.abs(this.scrub.scrollVelocity) < 0.001) this.scrub.scrollVelocity = 0;

    if (this.scrub.sectionMode !== 'atmosphere') {
      if (blurStrength > 0.002 && this.blurTarget && this.blurScene && this.blurCamera) {
        this.renderer.setRenderTarget(this.blurTarget);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        this.blurMaterial.uniforms.tDiffuse.value = this.blurTarget.texture;
        this.blurMaterial.uniforms.uStrength.value = blurStrength;
        this.renderer.render(this.blurScene, this.blurCamera);
      } else {
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.scene, this.camera);
      }
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.clear();
    }

    // Render foreground beans layer only when foreground beans are active (progress > 0.50)
    if (this.fgRenderer && this.sceneFg) {
      if (this.scrub.beanRainProgress > 0.50 && this.scrub.sectionMode === 'bean-rain') {
        this.fgRenderer.render(this.sceneFg, this.camera);
      } else {
        this.fgRenderer.clear();
      }
    }
  }

  // Full Stage API
  getStageAPI() {
    return {
      cup: this.cupGroup,
      cupMesh: this.cupMesh,
      saucer: this.saucerMesh,
      liquid: this.liquidMesh,
      foam: this.foamMesh,
      coffee: this.coffeeMesh,
      spoon: this.spoonMesh,
      beans: this.beanMesh,
      processGroup: this.processGroup,
      processBean: this.processBeanMesh,
      camera: this.camera,
      scene: this.scene,
      renderer: this.renderer,
      getExplodedLayerScreenCoords: this.getExplodedLayerScreenCoords.bind(this),
      setLiquidColor: this.setLiquidColor.bind(this),
      setHeroScrub: this.setHeroScrub.bind(this),
      setDiveScrub: this.setDiveScrub.bind(this),
      setExplodedScrub: this.setExplodedScrub.bind(this),
      setBeanRainScrub: this.setBeanRainScrub.bind(this),
      setMenuScrub: this.setMenuScrub.bind(this),
      setDrinkActive: this.setDrinkActive.bind(this),
      setProcessScrub: this.setProcessScrub.bind(this),
      setAtmosphereScrub: this.setAtmosphereScrub.bind(this),
      setFinaleScrub: this.setFinaleScrub.bind(this),
      renderState: {
        clock: this.clock,
        mouse: this.mouse,
        scrub: this.scrub
      }
    };
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.dispose();
  }
}
