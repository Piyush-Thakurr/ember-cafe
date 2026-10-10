import * as THREE from 'three';

/**
 * EMBER 3D Scene Engine (Stage 2A)
 * Includes:
 * - 75% procedural cup & saucer with deep charcoal glaze, contact shadow, edge highlights
 * - Separate meshes for Exploded View: cupMesh, saucerMesh, liquidMesh, foamMesh, spoonMesh
 * - Crema shader reacting to scroll velocity
 * - Camera dolly for Dive state
 * - 400 instanced beans with spiral ring vortex state for Bean Rain
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
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vec2 center = vec2(0.5);
        vec2 uv = vUv - center;
        float dist = length(uv);

        float angle = atan(uv.y, uv.x);
        float swirl = sin(angle * 3.0 + dist * 7.0 - uTime * 0.4) * 0.025;
        
        // Concentric ripples reacting dynamically to scroll velocity
        float ripple = sin(dist * 32.0 - uTime * 3.0) * (0.02 + uRipple * 0.06);

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
        uRipple: { value: 0.0 }
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
        pos.x += curlX;
        pos.z += curlZ;

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
        uSteamAlpha: { value: 1.0 }
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
    this.scrub.heroScale = 0.70 + progress * 0.42; // scales ~1.6x
    this.scrub.heroTiltZ = -progress * 0.13;       // -7.5 degrees
    this.scrub.heroTiltX = 0.12 + progress * 0.14; // slight pitch
    this.scrub.cupPosY = -1.14 + progress * 0.28;

    if (this.foamMesh) this.foamMesh.visible = false;
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
    this.scrub.diveProgress = progress;
    this.scrub.scrollVelocity = velocity;

    if (this.foamMesh) this.foamMesh.visible = false;
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
    if (progress <= 0.65) {
      const p = progress / 0.65;
      this.scrub.cameraZ = 6.1 - p * 3.1;
      this.scrub.cameraY = 0.25 - p * 0.35;
      this.scrub.cameraLookY = -0.38 - p * 0.20;
    } else {
      const p = (progress - 0.65) / 0.35;
      this.scrub.cameraZ = 3.0 + p * 3.1;
      this.scrub.cameraY = -0.10 + p * 0.35;
      this.scrub.cameraLookY = -0.58 + p * 0.20;
    }

    // Ripple shader reacts to velocity
    if (this.cremaMaterial && this.cremaMaterial.uniforms.uRipple) {
      this.cremaMaterial.uniforms.uRipple.value = Math.min(Math.abs(velocity) * 0.08, 0.45);
    }
  }

  // Exploded View: cup components separate along Y centre line with even 0.50 visible gaps
  // Exploded View: camera tilted 18° down, stack scaled up 20%, even layer gaps, 25% dimmed beans
  setExplodedScrub(progress) {
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

    // Tilt camera ~18° down on stack: camera at Y=0.40 looking at Y=-0.10, layers tilted 14° on X
    // Discs show their top faces as open ellipses, reading as caramel crema shader & dark glossy coffee disc
    this.scrub.cameraZ = 6.1;
    this.scrub.cameraY = 0.40;
    this.scrub.cameraLookY = -0.10;

    this.scrub.heroTiltZ = 0.0;
    this.scrub.heroTiltX = 0.245; // ~14 degrees on X
    this.scrub.cupPosY = -0.06;
    this.scrub.heroScale = 0.58; // Scaled up ~20% (0.50 -> 0.58) to use empty vertical space

    // Direct synchronization to avoid any lerp lag
    this.cupGroup.scale.set(0.58, 0.58, 0.58);
    this.cupGroup.position.set(0, -0.06, 0);
    this.cupGroup.rotation.set(0.245, 0, 0);
    this.camera.position.set(0, 0.40, 6.1);
    this.camera.lookAt(0, -0.10, 0);

    // 5 Layers separation along Y centre line with even gaps (all 4 gaps ~0.45 - 0.52):
    // Spoon:   0.55 -> +1.86
    // Crema:   0.52 -> +1.34
    // Coffee:  0.50 -> +0.82
    // Cup:     0.0  -> -0.30 (rim at +0.38, foot at -0.95)
    // Saucer:  0.0  -> -1.38 (visible front rim at -1.38)

    const p = progress;
    this.saucerMesh.position.y = -p * 1.38;
    if (this.contactShadowMesh) this.contactShadowMesh.position.y = -0.83 - p * 1.38;

    this.cupMesh.position.y = -p * 0.30;

    if (this.coffeeMesh) {
      this.coffeeMesh.position.y = THREE.MathUtils.lerp(0.50, 0.82, p);
    }

    if (this.foamMesh) {
      this.foamMesh.position.y = THREE.MathUtils.lerp(0.52, 1.34, p);
    }

    if (this.spoonMesh) {
      this.spoonMesh.position.y = THREE.MathUtils.lerp(0.55, 1.86, p);
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

    // Cup collapses and recedes smoothly so bean vortex takes center stage
    this.scrub.heroScale = 0.0;
    this.scrub.cupPosY = -5.0;
    if (this.cupGroup) this.cupGroup.scale.set(0, 0, 0);

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

  tick() {
    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Mouse Easing & Scrub Blending
    if (!this.isReducedMotion) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.045;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.045;

      if (this.cupGroup) {
        const currentScale = this.scrub.heroScale;
        this.cupGroup.scale.set(currentScale, currentScale, currentScale);

        if (this.scrub.explodedProgress > 0.005) {
          // Exploded view: lock directly to scrub values for precise projection
          this.cupGroup.rotation.set(this.scrub.heroTiltX, 0, this.scrub.heroTiltZ);
          this.cupGroup.position.set(0, this.scrub.cupPosY, 0);
          this.camera.position.set(0, this.scrub.cameraY, this.scrub.cameraZ);
          this.camera.lookAt(0, this.scrub.cameraLookY, 0);
        } else {
          const targetRotX = this.scrub.heroTiltX + this.mouse.y * 0.10;
          const targetRotY = -0.16 + Math.sin(elapsedTime * 0.28) * 0.04 + this.mouse.x * 0.16;
          const targetRotZ = this.scrub.heroTiltZ;

          this.cupGroup.rotation.x += (targetRotX - this.cupGroup.rotation.x) * 0.08;
          this.cupGroup.rotation.y += (targetRotY - this.cupGroup.rotation.y) * 0.08;
          this.cupGroup.rotation.z += (targetRotZ - this.cupGroup.rotation.z) * 0.08;

          this.cupGroup.position.y += (this.scrub.cupPosY - this.cupGroup.position.y) * 0.08;

          // Camera dolly lerp
          this.camera.position.z += (this.scrub.cameraZ - this.camera.position.z) * 0.08;
          this.camera.position.y += (this.scrub.cameraY - this.camera.position.y) * 0.08;
          this.camera.lookAt(0, this.scrub.cameraLookY, 0);
        }
      }

      // Idle bean drift (only when not scrubbing bean rain to maintain 60 FPS)
      if (this.beanMesh && this.scrub.beanRainProgress < 0.05) {
        this.beanMesh.position.x += (this.mouse.x * 0.22 - this.beanMesh.position.x) * 0.04;
        this.beanMesh.position.y += (-this.mouse.y * 0.18 - this.beanMesh.position.y) * 0.04;
        this.beanMesh.rotation.y = Math.sin(elapsedTime * 0.22) * 0.035;
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
    }

    // 3. Render Frame
    this.renderer.render(this.scene, this.camera);

    // Render foreground beans layer only when foreground beans are active (progress > 0.50)
    if (this.fgRenderer && this.sceneFg) {
      if (this.scrub.beanRainProgress > 0.50) {
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
      camera: this.camera,
      scene: this.scene,
      renderer: this.renderer,
      getExplodedLayerScreenCoords: this.getExplodedLayerScreenCoords.bind(this),
      setLiquidColor: this.setLiquidColor.bind(this),
      setHeroScrub: this.setHeroScrub.bind(this),
      setDiveScrub: this.setDiveScrub.bind(this),
      setExplodedScrub: this.setExplodedScrub.bind(this),
      setBeanRainScrub: this.setBeanRainScrub.bind(this),
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
