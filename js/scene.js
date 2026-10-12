import * as THREE from 'three';
window.THREE = THREE;
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

    // Section 5: Atelier Tasting Studio
    this.menuSceneGroup = null;
    this.menuAuraMesh = null;
    this.menuAuraMaterial = null;
    this.menuPhotoMesh = null;
    this.menuPhotoMaterial = null;
    this.menuTextures = [];
    this.menuVesselGroup = null;
    this.vessel0Espresso = null;
    this.vessel1Cortado = null;
    this.vessel2Caramel = null;
    this.vessel3Tonic = null;
    this.cremaVortexMaterial = null;
    this.sugarHaloMesh = null;
    this.sugarHaloData = [];
    this.tonicBubbleSimData = [];

    // Stage 2B / Phase 6: Finale 3D Objects
    this.finaleGroup = null;
    this.finaleIceCubes = [];
    this.splashMesh = null;
    this.splashData = [];
    this.finaleBeans = [];
    this.finaleRippleRing = null;
    this.splashBurst = 1.0;
    this._finaleTargetX = 0;
    this._finaleTargetY = 0;
    
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
    this.renderer.setClearColor(0x000000, 0);

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
      this.fgRenderer.setClearColor(0x000000, 0);

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
    this.createTurntableMenu();
    this.createFinaleObjects();
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

  setupDissolveMaterial(mat) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uDissolve = { value: 0.0 };
      mat.userData.shader = shader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vWorldPos;\n'
      ).replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;\n'
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        '#include <common>\nuniform float uDissolve;\nvarying vec3 vWorldPos;\n'
      ).replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uDissolve > 0.001) {
          float n = sin(vWorldPos.x * 12.0 + vWorldPos.y * 14.0) * cos(vWorldPos.y * 12.0 + vWorldPos.z * 16.0);
          n = fract(n * 43.758 + vWorldPos.y * 8.5);
          if (n < uDissolve) discard;
          float edge = smoothstep(uDissolve, uDissolve + 0.09, n);
          if (edge < 1.0) {
            vec3 ember = vec3(1.0, 0.38, 0.12);
            gl_FragColor.rgb = mix(ember * 4.0, gl_FragColor.rgb, edge);
          }
        }
        `
      );
    };
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
    this.setupDissolveMaterial(this.cupGlazeMaterial);

    // Saucer slightly lighter (#44342A) with softer roughness
    this.saucerGlazeMaterial = new THREE.MeshStandardMaterial({
      color: 0x44342a,
      roughness: 0.38,
      metalness: 0.12
    });
    this.setupDissolveMaterial(this.saucerGlazeMaterial);

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
      uniform float uDissolve;
      uniform float uOpacity;
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

        if (uDissolve > 0.001) {
          float n = (sin(vUv.x * 24.0) * cos(vUv.y * 24.0) + 1.0) * 0.5;
          float hash = fract(sin(dot(vUv * 16.0, vec2(12.9898, 78.233))) * 43758.5453);
          n = mix(n, hash, 0.30);
          if (n < uDissolve) discard;
          float edge = smoothstep(uDissolve, uDissolve + 0.08, n);
          if (edge < 1.0) {
            vec3 ember = vec3(0.88, 0.33, 0.12);
            crema = mix(ember * 3.0, crema, edge);
          }
        }

        gl_FragColor = vec4(crema, uOpacity);
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
        uShockwave: { value: 0.0 },
        uDissolve: { value: 0.0 },
        uOpacity: { value: 1.0 }
      }
    });

    const liquidGeometry = new THREE.CircleGeometry(1.10, 48);
    this.liquidMesh = new THREE.Mesh(liquidGeometry, this.cremaMaterial);
    this.liquidMesh.rotation.order = 'YXZ';
    this.liquidMesh.rotation.x = -Math.PI / 2;
    this.liquidMesh.rotation.y = 0;
    this.liquidMesh.rotation.z = 0;
    this.liquidMesh.position.y = 0.52;
    this.liquidMesh.receiveShadow = false;
    this.cupGroup.add(this.liquidMesh);
  }

  createExplodedComponents() {
    // 1. Crema Disc Mesh (Uses same caramel crema shader as hero: radial #C68A52 to #8A5A35 with ripples)
    this.cremaDiscMaterial = this.cremaMaterial.clone();
    this.cremaDiscMaterial.side = THREE.DoubleSide;
    this.cremaDiscMaterial.transparent = true;
    const foamGeo = new THREE.CircleGeometry(1.06, 48);
    this.foamMesh = new THREE.Mesh(foamGeo, this.cremaDiscMaterial);
    this.foamMesh.rotation.order = 'YXZ';
    this.foamMesh.rotation.x = -Math.PI / 2;
    this.foamMesh.rotation.y = 0;
    this.foamMesh.rotation.z = 0;
    this.foamMesh.position.set(0, 0.52, 0);
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
      uniform float uDissolve;
      uniform float uOpacity;
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

        if (uDissolve > 0.001) {
          float n = (sin(vUv.x * 24.0) * cos(vUv.y * 24.0) + 1.0) * 0.5;
          float hash = fract(sin(dot(vUv * 16.0, vec2(12.9898, 78.233))) * 43758.5453);
          n = mix(n, hash, 0.30);
          if (n < uDissolve) discard;
          float edge = smoothstep(uDissolve, uDissolve + 0.08, n);
          if (edge < 1.0) {
            vec3 ember = vec3(0.88, 0.33, 0.12);
            col = mix(ember * 3.0, col, edge);
          }
        }

        gl_FragColor = vec4(col, uOpacity);
      }
    `;
    const coffeeMat = new THREE.ShaderMaterial({
      vertexShader: coffeeVertexShader,
      fragmentShader: coffeeFragmentShader,
      uniforms: {
        uDissolve: { value: 0.0 },
        uOpacity: { value: 1.0 }
      },
      side: THREE.DoubleSide,
      transparent: true
    });
    this.coffeeMaterial = coffeeMat;
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
    this.coffeeGlowMat = coffeeGlowMat;
    const coffeeGlow = new THREE.Mesh(coffeeGlowGeo, coffeeGlowMat);
    coffeeGlow.position.z = 0.002;
    this.coffeeMesh.add(coffeeGlow);

    this.coffeeMesh.rotation.order = 'YXZ';
    this.coffeeMesh.rotation.x = -Math.PI / 2;
    this.coffeeMesh.rotation.y = 0;
    this.coffeeMesh.rotation.z = 0;
    this.coffeeMesh.position.set(0, 0.50, 0);
    this.coffeeMesh.visible = false;
    this.cupGroup.add(this.coffeeMesh);

    // 3. Artisanal Brushed Brass Spoon Mesh (40% thicker, centered along the centre line)
    this.spoonMesh = new THREE.Group();
    const spoonMat = new THREE.MeshStandardMaterial({
      color: 0xd4b278, // Warm artisanal brushed brass
      roughness: 0.28,
      metalness: 0.88,
      transparent: true,
      opacity: 1.0
    });
    this.setupDissolveMaterial(spoonMat);
    this.spoonMaterial = spoonMat;

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

  setLayerOpacities(opacities = {}) {
    const spoonOp = opacities.spoon !== undefined ? opacities.spoon : 1.0;
    const cremaOp = opacities.crema !== undefined ? opacities.crema : 1.0;
    const coffeeOp = opacities.coffee !== undefined ? opacities.coffee : 1.0;
    const cupOp = opacities.cup !== undefined ? opacities.cup : 1.0;
    const saucerOp = opacities.saucer !== undefined ? opacities.saucer : 1.0;

    if (this.spoonMaterial) {
      this.spoonMaterial.transparent = spoonOp < 0.999;
      this.spoonMaterial.opacity = spoonOp;
    }
    if (this.cremaDiscMaterial && this.cremaDiscMaterial.uniforms && this.cremaDiscMaterial.uniforms.uOpacity) {
      this.cremaDiscMaterial.transparent = cremaOp < 0.999;
      this.cremaDiscMaterial.uniforms.uOpacity.value = cremaOp;
    }
    if (this.coffeeMaterial && this.coffeeMaterial.uniforms && this.coffeeMaterial.uniforms.uOpacity) {
      this.coffeeMaterial.transparent = coffeeOp < 0.999;
      this.coffeeMaterial.uniforms.uOpacity.value = coffeeOp;
    }
    if (this.coffeeGlowMat) {
      this.coffeeGlowMat.opacity = 0.85 * coffeeOp;
    }
    if (this.cupGlazeMaterial) {
      this.cupGlazeMaterial.transparent = cupOp < 0.999;
      this.cupGlazeMaterial.opacity = cupOp;
    }
    if (this.saucerGlazeMaterial) {
      this.saucerGlazeMaterial.transparent = saucerOp < 0.999;
      this.saucerGlazeMaterial.opacity = saucerOp;
    }
  }

  setLayersDissolve(val) {
    const d = THREE.MathUtils.clamp(val, 0.0, 1.0);
    if (this.cupGlazeMaterial?.userData?.shader?.uniforms?.uDissolve) {
      this.cupGlazeMaterial.userData.shader.uniforms.uDissolve.value = d;
    }
    if (this.saucerGlazeMaterial?.userData?.shader?.uniforms?.uDissolve) {
      this.saucerGlazeMaterial.userData.shader.uniforms.uDissolve.value = d;
    }
    if (this.spoonMaterial?.userData?.shader?.uniforms?.uDissolve) {
      this.spoonMaterial.userData.shader.uniforms.uDissolve.value = d;
    }
    if (this.cremaDiscMaterial?.uniforms?.uDissolve) {
      this.cremaDiscMaterial.uniforms.uDissolve.value = d;
    }
    if (this.coffeeMaterial?.uniforms?.uDissolve) {
      this.coffeeMaterial.uniforms.uDissolve.value = d;
    }
    if (this.saucerRimHighlight) {
      this.saucerRimHighlight.visible = d < 0.35;
    }
    if (this.contactShadowMesh) {
      this.contactShadowMesh.material.opacity = (1.0 - d) * 0.55;
    }
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
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const totalBeans = isMobile ? 150 : 400;

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
    const numSectors = Math.max(1, Math.floor(totalBeans / 4));
    const perLayer = Math.max(1, Math.floor(totalBeans / 5));

    for (let i = 0; i < totalBeans; i++) {
      const sector = Math.floor(i / 4);
      const layer = i % 4;

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
      const baseAngle = (sector / numSectors) * Math.PI * 2.0;
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

      // Phase 3: Spawn position on the 5 separating exploded layer surfaces
      const layerIdx = i % 5;
      let localX = 0, localY = 0, localZ = 0;
      if (layerIdx === 0) {
        // Spoon
        const theta = (i / totalBeans) * Math.PI * 2;
        localX = 0.05 + Math.cos(theta) * 0.22;
        localY = 1.86 + Math.sin(theta) * 0.12;
        localZ = ((i % 7) - 3) * 0.02;
      } else if (layerIdx === 1) {
        // Crema disc
        const r = Math.sqrt((i % perLayer) / perLayer) * 0.98;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = 1.34;
        localZ = Math.sin(theta) * r * 0.35;
      } else if (layerIdx === 2) {
        // Coffee disc
        const r = Math.sqrt((i % perLayer) / perLayer) * 0.92;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = 0.82;
        localZ = Math.sin(theta) * r * 0.35;
      } else if (layerIdx === 3) {
        // Cup body
        const h = ((i % perLayer) / perLayer);
        const r = 0.65 + h * 0.40;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = -0.55 + h * 0.50;
        localZ = Math.sin(theta) * r * 0.35;
      } else {
        // Saucer
        const r = 0.60 + Math.sqrt((i % perLayer) / perLayer) * 1.35;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = -1.38;
        localZ = Math.sin(theta) * r * 0.35;
      }
      const spawnX = localX * 0.58;
      const spawnY = -0.06 + (localY * Math.cos(0.245) - localZ * Math.sin(0.245)) * 0.58;
      const spawnZ = (localY * Math.sin(0.245) + localZ * Math.cos(0.245)) * 0.58;
      const spawnPos = new THREE.Vector3(spawnX, spawnY, spawnZ);

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
        isForeground: isForeground,
        spawnPos: spawnPos
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
    const granuleGeo = new THREE.DodecahedronGeometry(0.045, 0);
    const granuleMat = new THREE.MeshStandardMaterial({
      color: 0x4A2A18, // Rich roast ground color
      roughness: 0.55,
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

  setLayersDissolve(amount) {
    const alpha = Math.max(0.0, Math.min(1.0, 1.0 - amount));
    const layers = [this.spoonMesh, this.foamMesh, this.coffeeMesh, this.cupMesh, this.saucerMesh];
    for (let i = 0; i < layers.length; i++) {
      const mesh = layers[i];
      if (mesh && mesh.material) {
        mesh.material.transparent = true;
        mesh.material.opacity = alpha;
        mesh.visible = alpha > 0.01;
      }
    }
  }

  createTurntableMenu() {
    const isMobile = window.innerWidth <= 768;

    // =========================================================================
    // 0. MASTER ATELIER MENU GROUP
    // =========================================================================
    this.menuSceneGroup = new THREE.Group();
    this.menuSceneGroup.visible = false;
    this.scene.add(this.menuSceneGroup);

    // Backwards-compatibility dummy group & materials for legacy triggers
    this.panoramaDrumGroup = new THREE.Group();
    this.menuSceneGroup.add(this.panoramaDrumGroup);
    this.drumMaterials = [];
    this.drumPanels = [];

    // =========================================================================
    // 1. LIQUID CAUSTICS & ATMOSPHERIC AURA SHADER PLANE
    // =========================================================================
    const auraGeo = new THREE.PlaneGeometry(18, 12, 1, 1);
    const auraVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const auraFragmentShader = `
      uniform float uTime;
      uniform vec3 uColorBase;
      uniform vec3 uColorCaustic;
      uniform vec3 uColorGlow;
      uniform float uOpacity;
      uniform vec2 uMouse;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;
        vec2 p = (uv - 0.5) * vec2(1.7, 1.0);

        // Fluid time flow
        float t = uTime * 0.28;
        vec2 flow = vec2(
          sin(p.y * 3.2 + t * 0.6) * 0.12,
          cos(p.x * 3.5 - t * 0.5) * 0.12
        );
        p += flow + uMouse * 0.04;

        // Multi-harmonic liquid caustic filaments
        float c1 = sin(p.x * 7.5 + p.y * 5.2 + t * 1.5);
        float c2 = cos(p.x * 5.8 - p.y * 7.1 - t * 1.2);
        float c3 = sin((p.x + p.y) * 8.6 + t * 1.8);
        float c4 = cos((p.x * 1.2 - p.y * 1.5) * 6.0 - t * 0.9);
        float caustic = pow(clamp((c1 + c2 + c3 + c4) * 0.25 + 0.50, 0.0, 1.0), 3.2);

        // Radial spotlight centered toward right visual showcase
        vec2 center = vec2(0.60, 0.52);
        float d = length(uv - center);
        float radial = smoothstep(1.05, 0.08, d);

        // Color grading
        vec3 col = uColorBase;
        col = mix(col, uColorCaustic, caustic * 0.82 * radial);
        col += uColorGlow * pow(radial, 2.2) * 0.38;

        // Micro-film grain
        float grain = (fract(sin(dot(uv * (uTime * 0.05 + 1.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.035;
        col += grain;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), clamp(uOpacity, 0.0, 1.0));
      }
    `;

    this.menuAuraMaterial = new THREE.ShaderMaterial({
      vertexShader: auraVertexShader,
      fragmentShader: auraFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColorBase: { value: new THREE.Color(0x0e0906) },
        uColorCaustic: { value: new THREE.Color(0xb84a14) },
        uColorGlow: { value: new THREE.Color(0xe88c38) },
        uOpacity: { value: 0.0 },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      transparent: true,
      depthWrite: false
    });

    this.menuAuraMesh = new THREE.Mesh(auraGeo, this.menuAuraMaterial);
    this.menuAuraMesh.position.set(0, 0, -4.6);
    this.menuSceneGroup.add(this.menuAuraMesh);

    // =========================================================================
    // 2. THE EDITORIAL FLOATING LENS WITH LIQUID INK-DISPLACEMENT SHADER
    // =========================================================================
    const texLoader = new THREE.TextureLoader();
    const photoUrls = [
      'assets/menu/drink-01-ember-espresso.jpg',
      'assets/menu/drink-02-cortado-noir.jpg',
      'assets/menu/drink-03-burnt-caramel-latte.jpg',
      'assets/menu/drink-05-ember-tonic.jpg'
    ];
    this.menuTextures = photoUrls.map(url => {
      const tex = texLoader.load(url);
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      return tex;
    });

    const photoVertexShader = `
      varying vec2 vUv;
      uniform float uTransition;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Fluid physical elevation wave during drink morph
        float env = sin(uTransition * 3.14159265);
        float wave = sin(uv.x * 8.0 + uTransition * 6.28) * sin(uv.y * 6.0) * env * 0.14;
        pos.z += wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const photoFragmentShader = `
      uniform sampler2D uTexCurrent;
      uniform sampler2D uTexNext;
      uniform float uTransition;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 uv = vUv;

        // Liquid wave ripple displacement
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(uv, center);
        float env = sin(uTransition * 3.14159265);
        float rip = sin(dist * 20.0 - uTransition * 12.0) * env * 0.045;

        // Chromatic dispersion (RGB split along ripple vector)
        vec2 dir = normalize(uv - center + 0.0001);
        vec2 uvR = uv + dir * rip * 1.35;
        vec2 uvG = uv + dir * rip;
        vec2 uvB = uv - dir * rip * 1.35;

        vec4 colA = vec4(
          texture2D(uTexCurrent, uvR).r,
          texture2D(uTexCurrent, uvG).g,
          texture2D(uTexCurrent, uvB).b,
          1.0
        );

        vec4 colB = vec4(
          texture2D(uTexNext, uvR).r,
          texture2D(uTexNext, uvG).g,
          texture2D(uTexNext, uvB).b,
          1.0
        );

        float blend = smoothstep(0.0, 1.0, uTransition);
        vec4 finalCol = mix(colA, colB, blend);

        // Warm atelier color grade & contrast
        vec3 graded = (finalCol.rgb - 0.5) * 1.12 + 0.5;
        graded = mix(graded, graded * vec3(1.08, 1.01, 0.94) + vec3(0.02, 0.012, 0.003), 0.30);

        // Specular luxury light sheen sweeping diagonally across plate
        float sheenPos = uTransition * 2.5 - 0.75;
        float sheen = smoothstep(0.32, 0.0, abs((uv.x + uv.y) * 0.5 - sheenPos)) * env * 0.35;
        graded += vec3(sheen * 1.0, sheen * 0.88, sheen * 0.70);

        // Soft peripheral vignette
        vec2 vigUv = (uv - 0.5) * vec2(1.0, 1.12);
        float vig = smoothstep(0.85, 0.32, length(vigUv));
        graded *= mix(0.78, 1.0, vig);

        // Rounded bevel mask
        vec2 dBox = abs(uv - 0.5) * 2.0;
        float corner = length(max(dBox - vec2(0.88, 0.84), 0.0));
        float alpha = smoothstep(0.12, 0.08, corner);

        // 1.5px warm bronze luxury border
        float border = smoothstep(0.08, 0.10, corner) - smoothstep(0.10, 0.12, corner);
        graded += vec3(0.88, 0.64, 0.38) * border * 0.75;

        gl_FragColor = vec4(clamp(graded, 0.0, 1.0), alpha * uOpacity);
      }
    `;

    this.menuPhotoMaterial = new THREE.ShaderMaterial({
      vertexShader: photoVertexShader,
      fragmentShader: photoFragmentShader,
      uniforms: {
        uTexCurrent: { value: this.menuTextures[0] },
        uTexNext: { value: this.menuTextures[0] },
        uTransition: { value: 0.0 },
        uOpacity: { value: 1.0 },
        uTime: { value: 0.0 }
      },
      transparent: true,
      depthWrite: false
    });

    const photoGeo = new THREE.PlaneGeometry(2.75, 1.95, 48, 48);
    this.menuPhotoMesh = new THREE.Mesh(photoGeo, this.menuPhotoMaterial);
    const photoX = isMobile ? 0 : 1.30;
    const photoY = isMobile ? -0.42 : 0.05;
    const photoZ = isMobile ? -0.35 : 0.05;
    this.menuPhotoMesh.position.set(photoX, photoY, photoZ);
    this.menuSceneGroup.add(this.menuPhotoMesh);

    // =========================================================================
    // 3. THE 4 BESPOKE 3D MASTERPIECE VESSELS & LIVING FLUIDS
    // =========================================================================
    this.menuVesselGroup = new THREE.Group();
    const vesselX = isMobile ? 0 : 1.05;
    const vesselY = isMobile ? 0.65 : -0.22;
    const vesselZ = isMobile ? 0.8 : 1.45;
    this.menuVesselGroup.position.set(vesselX, vesselY, vesselZ);
    const vesselScale = isMobile ? 0.42 : 0.48;
    this.menuVesselGroup.scale.set(vesselScale, vesselScale, vesselScale);
    this.menuVesselGroup.rotation.set(0.18, -0.20, -0.04);
    this.menuSceneGroup.add(this.menuVesselGroup);
    this.turntableGroup = this.menuVesselGroup; // backwards compat alias

    // Sub-groups for each bespoke drink vessel
    this.vessel0Espresso = new THREE.Group();
    this.vessel1Cortado = new THREE.Group();
    this.vessel2Caramel = new THREE.Group();
    this.vessel3Tonic = new THREE.Group();
    this.menuVesselGroup.add(this.vessel0Espresso);
    this.menuVesselGroup.add(this.vessel1Cortado);
    this.menuVesselGroup.add(this.vessel2Caramel);
    this.menuVesselGroup.add(this.vessel3Tonic);

    this.vessel0Espresso.visible = true;
    this.vessel1Cortado.visible = false;
    this.vessel2Caramel.visible = false;
    this.vessel3Tonic.visible = false;

    // Contact shadow helper
    const makeShadow = (radius, opacity = 0.55) => {
      const geo = new THREE.RingGeometry(0.08, radius, 32);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0x070402, transparent: true, opacity, depthWrite: false });
      return new THREE.Mesh(geo, mat);
    };

    // Helper: Optical Crystal Glass Shader (zero milkiness, sharp diamond rim & refraction highlights)
    const createCrystalGlassMaterial = (specularTint = 0xffffff, rimPower = 2.4, opacityMin = 0.16, opacityMax = 0.86) => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uLightDir: { value: new THREE.Vector3(0.6, 0.8, 0.5).normalize() },
          uRimColor: { value: new THREE.Color(specularTint) }
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vViewDir = normalize(cameraPosition - worldPos.xyz);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform vec3 uLightDir;
          uniform vec3 uRimColor;
          varying vec3 vNormal;
          varying vec3 vViewDir;
          void main() {
            vec3 n = normalize(vNormal);
            if (!gl_FrontFacing) n = -n;
            vec3 v = normalize(vViewDir);
            float fresnel = pow(1.0 - max(dot(n, v), 0.0), ${rimPower.toFixed(2)});
            vec3 h = normalize(uLightDir + v);
            float spec = pow(max(dot(n, h), 0.0), 32.0);
            vec3 col = mix(vec3(0.04, 0.03, 0.02), uRimColor, fresnel);
            col += vec3(1.0, 0.98, 0.92) * spec * 0.95;
            float alpha = mix(${opacityMin.toFixed(2)}, ${opacityMax.toFixed(2)}, fresnel);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
      });
    };

    // -------------------------------------------------------------------------
    // VESSEL 0: 01 EMBER ESPRESSO (Japanese Volcanic Demitasse + Crema Vortex)
    // -------------------------------------------------------------------------
    const volcanicMat = new THREE.MeshStandardMaterial({
      color: 0x171311,
      roughness: 0.72,
      metalness: 0.08
    });
    const goldGlazeMat = new THREE.MeshStandardMaterial({
      color: 0xf5c468,
      roughness: 0.14,
      metalness: 0.95
    });

    // Sleek Demitasse Cup Lathe (compact radius, elegant Japanese silhouette)
    const cupPoints = [
      new THREE.Vector2(0.0, -0.52),
      new THREE.Vector2(0.40, -0.52),
      new THREE.Vector2(0.46, -0.45),
      new THREE.Vector2(0.58, -0.28),
      new THREE.Vector2(0.74, 0.05),
      new THREE.Vector2(0.86, 0.38),
      new THREE.Vector2(0.88, 0.46),
      new THREE.Vector2(0.85, 0.46),
      new THREE.Vector2(0.80, 0.38),
      new THREE.Vector2(0.68, 0.05),
      new THREE.Vector2(0.50, -0.25),
      new THREE.Vector2(0.32, -0.42),
      new THREE.Vector2(0.0, -0.44)
    ];
    const cupGeo = new THREE.LatheGeometry(cupPoints, 48);
    const espCupMesh = new THREE.Mesh(cupGeo, volcanicMat);
    espCupMesh.castShadow = true;
    this.vessel0Espresso.add(espCupMesh);

    // 24k Kintsugi Gold Rim Torus
    const espRimGeo = new THREE.TorusGeometry(0.87, 0.022, 16, 64);
    espRimGeo.rotateX(Math.PI / 2);
    const espRimMesh = new THREE.Mesh(espRimGeo, goldGlazeMat);
    espRimMesh.position.y = 0.46;
    this.vessel0Espresso.add(espRimMesh);

    // Ergonomic Japanese Demitasse Handle
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.84, 0.32, 0),
      new THREE.Vector3(1.26, 0.22, 0),
      new THREE.Vector3(1.30, 0.02, 0),
      new THREE.Vector3(1.08, -0.15, 0),
      new THREE.Vector3(0.66, -0.22, 0)
    ]);
    const handleGeo = new THREE.TubeGeometry(handleCurve, 32, 0.065, 12, false);
    const espHandle = new THREE.Mesh(handleGeo, volcanicMat);
    this.vessel0Espresso.add(espHandle);

    // Sleek Tea-Ceremony Saucer (compact radius 1.25, zero text encroachment)
    const saucerPoints = [
      new THREE.Vector2(0.0, -0.66),
      new THREE.Vector2(0.52, -0.66),
      new THREE.Vector2(0.58, -0.62),
      new THREE.Vector2(0.92, -0.55),
      new THREE.Vector2(1.25, -0.45),
      new THREE.Vector2(1.22, -0.48),
      new THREE.Vector2(0.90, -0.58),
      new THREE.Vector2(0.52, -0.68),
      new THREE.Vector2(0.0, -0.68)
    ];
    const saucerGeo = new THREE.LatheGeometry(saucerPoints, 48);
    const espSaucer = new THREE.Mesh(saucerGeo, volcanicMat);
    this.vessel0Espresso.add(espSaucer);

    const espSaucerRimGeo = new THREE.TorusGeometry(1.24, 0.016, 12, 64);
    espSaucerRimGeo.rotateX(Math.PI / 2);
    const espSaucerRim = new THREE.Mesh(espSaucerRimGeo, goldGlazeMat);
    espSaucerRim.position.y = -0.45;
    this.vessel0Espresso.add(espSaucerRim);

    const espShadow = makeShadow(1.0, 0.6);
    espShadow.position.y = -0.69;
    this.vessel0Espresso.add(espShadow);

    // Crema Vortex Shader Disc
    const cremaVortexVertex = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const cremaVortexFragment = `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5;
        float r = length(p);
        float a = atan(p.y, p.x);
        // Swirling crema spiral
        float spiral = a + r * 5.5 - uTime * 0.42;
        float foam1 = sin(spiral * 4.0 + r * 16.0) * 0.5 + 0.5;
        float foam2 = sin(spiral * 8.0 - r * 22.0) * 0.5 + 0.5;
        float foam = (foam1 * 0.65 + foam2 * 0.35) * smoothstep(0.49, 0.15, r);
        vec3 darkCore = vec3(0.08, 0.03, 0.01);
        vec3 amberCrema = vec3(0.74, 0.45, 0.18);
        vec3 microFoam = vec3(0.92, 0.70, 0.42);
        vec3 col = mix(darkCore, amberCrema, foam * 0.88 + 0.12);
        col += microFoam * pow(foam, 3.2) * 0.45;
        gl_FragColor = vec4(col, 1.0);
      }
    `;
    this.cremaVortexMaterial = new THREE.ShaderMaterial({
      vertexShader: cremaVortexVertex,
      fragmentShader: cremaVortexFragment,
      uniforms: { uTime: { value: 0 } }
    });
    const cremaGeo = new THREE.CircleGeometry(0.80, 36);
    cremaGeo.rotateX(-Math.PI / 2);
    const cremaMesh = new THREE.Mesh(cremaGeo, this.cremaVortexMaterial);
    cremaMesh.position.y = 0.38;
    this.vessel0Espresso.add(cremaMesh);

    // Volumetric Steam Wisps
    const steamGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xF2E4D2, transparent: true, opacity: 0.26 });
    this.espressoSteam = new THREE.InstancedMesh(steamGeo, steamMat, 18);
    this.espressoSteamData = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 18; i++) {
      this.espressoSteamData.push({
        x: (Math.random() - 0.5) * 0.38,
        y: 0.45 + i * 0.06,
        z: (Math.random() - 0.5) * 0.38,
        speed: 0.24 + Math.random() * 0.22
      });
      dummy.position.set(0, -10, 0);
      dummy.updateMatrix();
      this.espressoSteam.setMatrixAt(i, dummy.matrix);
    }
    this.espressoSteam.instanceMatrix.needsUpdate = true;
    this.vessel0Espresso.add(this.espressoSteam);

    // -------------------------------------------------------------------------
    // VESSEL 1: 02 CORTADO NOIR (8-Faceted Crystal Gibraltar Tumbler)
    // -------------------------------------------------------------------------
    const crystalGlassMat = createCrystalGlassMaterial(0xfff6ec, 2.4, 0.16, 0.85);

    // Gibraltar Faceted Glass Profile: 8 radial segments create genuine crystal facets!
    const gibOuterGeo = new THREE.CylinderGeometry(0.78, 0.54, 1.40, 8, 4, false);
    const gibOuterMesh = new THREE.Mesh(gibOuterGeo, crystalGlassMat);
    gibOuterMesh.position.y = 0.06;
    gibOuterMesh.renderOrder = 2;
    this.vessel1Cortado.add(gibOuterMesh);

    // Heavy solid crystal sham (base)
    const gibBaseGeo = new THREE.CylinderGeometry(0.54, 0.52, 0.28, 8, 2, false);
    const gibBaseMesh = new THREE.Mesh(gibBaseGeo, crystalGlassMat);
    gibBaseMesh.position.y = -0.62;
    gibBaseMesh.renderOrder = 2;
    this.vessel1Cortado.add(gibBaseMesh);

    // Stratified Two-Tone Liquid (Espresso base + Steamed Milk top)
    const stratVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const stratFragmentShader = `
      varying vec2 vUv;
      void main() {
        float y = vUv.y;
        vec3 espressoCol = vec3(0.11, 0.04, 0.015);
        vec3 milkCol = vec3(0.93, 0.88, 0.81);
        float blend = smoothstep(0.38, 0.60, y);
        vec3 col = mix(espressoCol, milkCol, blend);
        gl_FragColor = vec4(col, 0.98);
      }
    `;
    const stratMat = new THREE.ShaderMaterial({
      vertexShader: stratVertexShader,
      fragmentShader: stratFragmentShader
    });
    const stratGeo = new THREE.CylinderGeometry(0.72, 0.48, 1.20, 24);
    const stratMesh = new THREE.Mesh(stratGeo, stratMat);
    stratMesh.position.y = 0.10;
    stratMesh.renderOrder = 1;
    this.vessel1Cortado.add(stratMesh);

    // Latte art microfoam top disc
    const cortadoTopCanvas = document.createElement('canvas');
    cortadoTopCanvas.width = 512;
    cortadoTopCanvas.height = 512;
    const cCtx = cortadoTopCanvas.getContext('2d');
    cCtx.fillStyle = '#EEE4D5';
    cCtx.fillRect(0, 0, 512, 512);
    cCtx.strokeStyle = '#6E3E1A';
    cCtx.lineWidth = 14;
    cCtx.beginPath();
    cCtx.arc(256, 256, 160, 0.25, Math.PI - 0.25);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.arc(256, 256, 100, Math.PI + 0.25, Math.PI * 2 - 0.25);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.arc(256, 256, 45, 0, Math.PI * 2);
    cCtx.fillStyle = '#8E5224';
    cCtx.fill();
    const cortadoTopTex = new THREE.CanvasTexture(cortadoTopCanvas);
    const cortadoTopGeo = new THREE.CircleGeometry(0.72, 32);
    cortadoTopGeo.rotateX(-Math.PI / 2);
    const cortadoTopMesh = new THREE.Mesh(cortadoTopGeo, new THREE.MeshStandardMaterial({
      map: cortadoTopTex,
      roughness: 0.35
    }));
    cortadoTopMesh.position.y = 0.70;
    cortadoTopMesh.renderOrder = 1;
    this.vessel1Cortado.add(cortadoTopMesh);

    // Floating Zero-G Coffee Essence Prisms (8 delicate orbiting crystal gems)
    const gemGeo = new THREE.OctahedronGeometry(0.042);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xe8b070,
      roughness: 0.15,
      metalness: 0.65
    });
    this.cortadoGemsMesh = new THREE.InstancedMesh(gemGeo, gemMat, 8);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = 0.98 + (i % 2) * 0.18;
      const y = -0.20 + (i / 8) * 0.85;
      dummy.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r);
      dummy.rotation.set(i * 0.5, i * 0.8, 0);
      dummy.updateMatrix();
      this.cortadoGemsMesh.setMatrixAt(i, dummy.matrix);
    }
    this.cortadoGemsMesh.instanceMatrix.needsUpdate = true;
    this.cortadoGemsMesh.renderOrder = 2;
    this.vessel1Cortado.add(this.cortadoGemsMesh);

    const gibShadow = makeShadow(0.85, 0.55);
    gibShadow.position.y = -0.77;
    this.vessel1Cortado.add(gibShadow);

    // -------------------------------------------------------------------------
    // VESSEL 2: 03 BURNT CARAMEL LATTE (Ceramic Coupe & Zero-G Sugar Halo)
    // -------------------------------------------------------------------------
    const coupeClayMat = new THREE.MeshStandardMaterial({
      color: 0x291d17,
      roughness: 0.75,
      metalness: 0.10
    });

    // Flared coupe profile: compact radius 1.15 so it never reaches the left text
    const coupePoints = [
      new THREE.Vector2(0.0, -0.38),
      new THREE.Vector2(0.48, -0.38),
      new THREE.Vector2(0.54, -0.32),
      new THREE.Vector2(0.82, -0.08),
      new THREE.Vector2(1.12, 0.25),
      new THREE.Vector2(1.16, 0.32),
      new THREE.Vector2(1.11, 0.32),
      new THREE.Vector2(1.04, 0.24),
      new THREE.Vector2(0.76, -0.04),
      new THREE.Vector2(0.42, -0.28),
      new THREE.Vector2(0.0, -0.30)
    ];
    const coupeGeo = new THREE.LatheGeometry(coupePoints, 48);
    const coupeMesh = new THREE.Mesh(coupeGeo, coupeClayMat);
    coupeMesh.renderOrder = 1;
    this.vessel2Caramel.add(coupeMesh);

    // Polished bronze rim accent torus
    const coupeRimGeo = new THREE.TorusGeometry(1.14, 0.018, 12, 48);
    coupeRimGeo.rotateX(Math.PI / 2);
    const coupeRimMat = new THREE.MeshStandardMaterial({
      color: 0xd49b5c,
      roughness: 0.20,
      metalness: 0.85
    });
    const coupeRimMesh = new THREE.Mesh(coupeRimGeo, coupeRimMat);
    coupeRimMesh.position.y = 0.32;
    coupeRimMesh.renderOrder = 1;
    this.vessel2Caramel.add(coupeRimMesh);

    // Caramel Brûlée Foam Surface
    const caramelFoamGeo = new THREE.CircleGeometry(1.08, 36);
    caramelFoamGeo.rotateX(-Math.PI / 2);
    const caramelFoamMat = new THREE.MeshStandardMaterial({
      color: 0xC27A36,
      roughness: 0.25,
      metalness: 0.15
    });
    const caramelFoamMesh = new THREE.Mesh(caramelFoamGeo, caramelFoamMat);
    caramelFoamMesh.position.y = 0.26;
    caramelFoamMesh.renderOrder = 1;
    this.vessel2Caramel.add(caramelFoamMesh);

    // Torched swirl ring on surface
    const swirlTorusGeo = new THREE.TorusGeometry(0.55, 0.038, 12, 48);
    swirlTorusGeo.rotateX(Math.PI / 2);
    const swirlTorusMat = new THREE.MeshStandardMaterial({
      color: 0x461C06,
      roughness: 0.22,
      metalness: 0.10
    });
    const swirlTorusMesh = new THREE.Mesh(swirlTorusGeo, swirlTorusMat);
    swirlTorusMesh.position.y = 0.27;
    swirlTorusMesh.renderOrder = 1;
    this.vessel2Caramel.add(swirlTorusMesh);

    // Zero-Gravity Crystalline Suspension ("The Alchemical Halo")
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xFFB347,
      roughness: 0.12,
      metalness: 0.55
    });
    const octGeo = new THREE.OctahedronGeometry(0.048);
    this.sugarHaloMesh = new THREE.InstancedMesh(octGeo, crystalMat, 20);
    this.sugarHaloData = [];
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const rad = 1.25 + (i % 3) * 0.18;
      const y = 0.32 + Math.sin(i * 1.5) * 0.28;
      this.sugarHaloData.push({
        baseAngle: ang,
        radius: rad,
        baseY: y,
        speed: 0.35 + (i % 4) * 0.15,
        rotSpeedX: (Math.random() - 0.5) * 2.5,
        rotSpeedY: (Math.random() - 0.5) * 2.5
      });
      dummy.position.set(Math.cos(ang) * rad, y, Math.sin(ang) * rad);
      dummy.updateMatrix();
      this.sugarHaloMesh.setMatrixAt(i, dummy.matrix);
    }
    this.sugarHaloMesh.instanceMatrix.needsUpdate = true;
    this.sugarHaloMesh.renderOrder = 2;
    this.vessel2Caramel.add(this.sugarHaloMesh);

    const coupeShadow = makeShadow(1.0, 0.55);
    coupeShadow.position.y = -0.39;
    this.vessel2Caramel.add(coupeShadow);

    // -------------------------------------------------------------------------
    // VESSEL 3: 04 EMBER TONIC (Fluted Crystal Highball, Ice Spear & Tonic)
    // -------------------------------------------------------------------------
    const highballGlassMat = createCrystalGlassMaterial(0xebf5ff, 2.6, 0.16, 0.88);

    // Tall Architectural Fluted Highball Glass (24 facets)
    const hbGeo = new THREE.CylinderGeometry(0.64, 0.60, 2.15, 24, 4, false);
    const hbMesh = new THREE.Mesh(hbGeo, highballGlassMat);
    hbMesh.position.y = 0.30;
    hbMesh.renderOrder = 2;
    this.vessel3Tonic.add(hbMesh);

    // Solid Crystal Sham Base (1-inch thick)
    const hbBaseGeo = new THREE.CylinderGeometry(0.60, 0.58, 0.38, 24, 2, false);
    const hbBaseMesh = new THREE.Mesh(hbBaseGeo, highballGlassMat);
    hbBaseMesh.position.y = -0.82;
    hbBaseMesh.renderOrder = 2;
    this.vessel3Tonic.add(hbBaseMesh);

    // Clear-Ice Spear inside highball
    const iceSpearMat = createCrystalGlassMaterial(0xdef2fe, 2.0, 0.35, 0.92);
    const iceSpearGeo = new THREE.BoxGeometry(0.32, 1.65, 0.32);
    const iceSpearMesh = new THREE.Mesh(iceSpearGeo, iceSpearMat);
    iceSpearMesh.position.set(0.04, 0.30, 0.0);
    iceSpearMesh.rotation.y = 0.30;
    iceSpearMesh.renderOrder = 1;
    this.vessel3Tonic.add(iceSpearMesh);

    // Sparkling Amber Tonic Liquid
    const tonicLiquidMat = new THREE.MeshStandardMaterial({
      color: 0xdf7a24,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.84
    });
    const tonicLiquidGeo = new THREE.CylinderGeometry(0.58, 0.54, 1.65, 24);
    const tonicLiquidMesh = new THREE.Mesh(tonicLiquidGeo, tonicLiquidMat);
    tonicLiquidMesh.position.y = 0.26;
    tonicLiquidMesh.renderOrder = 1;
    this.vessel3Tonic.add(tonicLiquidMesh);

    // Effervescent Micro-Bubbles
    const bubbleGeo = new THREE.SphereGeometry(0.022, 6, 6);
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xFFF5E6, transparent: true, opacity: 0.75 });
    this.tonicBubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, 65);
    this.tonicBubbleSimData = [];
    for (let i = 0; i < 65; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.48;
      this.tonicBubbleSimData.push({
        x: Math.cos(ang) * r,
        y: -0.55 + Math.random() * 1.55,
        z: Math.sin(ang) * r,
        speed: 0.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2
      });
      dummy.position.set(0, -10, 0);
      dummy.updateMatrix();
      this.tonicBubbles.setMatrixAt(i, dummy.matrix);
    }
    this.tonicBubbles.instanceMatrix.needsUpdate = true;
    this.tonicBubbles.renderOrder = 1;
    this.vessel3Tonic.add(this.tonicBubbles);

    // Candied Citrus Zest Ribbon
    const zestCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.40, -0.42, 0.28),
      new THREE.Vector3(-0.35, 0.12, 0.35),
      new THREE.Vector3(-0.28, 0.65, -0.35),
      new THREE.Vector3(0.36, 1.08, -0.18),
      new THREE.Vector3(0.50, 1.25, 0.12)
    ]);
    const zestGeo = new THREE.TubeGeometry(zestCurve, 32, 0.038, 8, false);
    const zestMat = new THREE.MeshStandardMaterial({
      color: 0xFF7A18,
      roughness: 0.35,
      metalness: 0.10
    });
    const zestMesh = new THREE.Mesh(zestGeo, zestMat);
    zestMesh.renderOrder = 1;
    this.vessel3Tonic.add(zestMesh);

    const hbShadow = makeShadow(0.80, 0.6);
    hbShadow.position.y = -1.02;
    this.vessel3Tonic.add(hbShadow);
  }

  createFinaleObjects() {
    this.finaleGroup = new THREE.Group();
    this.finaleGroup.visible = false;
    this.scene.add(this.finaleGroup);

    // Helper: RoundedBoxGeometry with smooth beveled/curved edges
    const createRoundedBoxGeometry = (width = 0.30, height = 0.30, depth = 0.30, segments = 4, radius = 0.055) => {
      const box = new THREE.BoxGeometry(width, height, depth, segments, segments, segments);
      const pos = box.attributes.position;
      const normal = box.attributes.normal;
      const count = pos.count;
      const hw = width * 0.5 - radius;
      const hh = height * 0.5 - radius;
      const hd = depth * 0.5 - radius;
      const p = new THREE.Vector3();
      const c = new THREE.Vector3();
      const d = new THREE.Vector3();

      for (let i = 0; i < count; i++) {
        p.fromBufferAttribute(pos, i);
        c.set(
          Math.max(-hw, Math.min(hw, p.x)),
          Math.max(-hh, Math.min(hh, p.y)),
          Math.max(-hd, Math.min(hd, p.z))
        );
        d.subVectors(p, c);
        const len = d.length();
        if (len > 0.0001) {
          d.normalize();
          p.copy(c).addScaledVector(d, radius);
          pos.setXYZ(i, p.x, p.y, p.z);
          normal.setXYZ(i, d.x, d.y, d.z);
        }
      }
      box.computeVertexNormals();
      return box;
    };

    // 1. 7 RoundedBox Ice Cubes (Fresnel glass look, bright rim, inner highlight, opacity 0.55, contact shadows)
    this.finaleIceCubes = [];
    const iceGeo = createRoundedBoxGeometry(0.30, 0.30, 0.30, 4, 0.055);
    const iceMat = new THREE.ShaderMaterial({
      uniforms: {
        uFresnelColor: { value: new THREE.Color(0xffffff) },       // Bright crisp white rim highlight
        uCoreColor: { value: new THREE.Color(0x9fc3dc) },          // Soft glacial cyan core
        uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.6).normalize() },
        uOpacity: { value: 0.55 }                                  // Strictly 0.55 opacity
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vViewDir = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uFresnelColor;
        uniform vec3 uCoreColor;
        uniform vec3 uLightDir;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewDir);
          float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.0);
          vec3 h = normalize(uLightDir + v);
          float spec = pow(max(dot(n, h), 0.0), 28.0) * 0.75;
          vec3 col = mix(uCoreColor, uFresnelColor, fresnel * 0.85 + spec * 0.5);
          col += spec * uFresnelColor;
          float alpha = mix(0.40, 0.95, fresnel) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    // Contact shadow geometry & shader
    const shadowGeo = new THREE.CircleGeometry(0.18, 24);
    const shadowMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.28 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float r = length(vUv - vec2(0.5)) * 2.0;
          if (r > 1.0) discard;
          float alpha = smoothstep(1.0, 0.0, r) * uOpacity;
          gl_FragColor = vec4(0.08, 0.06, 0.05, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    // 7 cube settled target configurations (flanking cup neatly on left and right sides)
    const cubeConfigs = [
      { x: -0.95, y: -0.04, z: 0.15, scale: 0.30, rx: 0.8, ry: 1.1, rz: 0.5, stagger: 0.00 },
      { x: -1.35, y: -0.12, z: -0.10, scale: 0.33, rx: 1.2, ry: 0.7, rz: 0.9, stagger: 0.04 },
      { x: -1.75, y: 0.06, z: 0.18, scale: 0.28, rx: 0.6, ry: 1.3, rz: 0.4, stagger: 0.08 },
      { x: 0.95, y: -0.06, z: 0.16, scale: 0.31, rx: 1.0, ry: 0.9, rz: 1.2, stagger: 0.02 },
      { x: 1.35, y: 0.08, z: -0.08, scale: 0.34, rx: 0.7, ry: 1.4, rz: 0.6, stagger: 0.06 },
      { x: 1.75, y: -0.05, z: 0.12, scale: 0.29, rx: 1.1, ry: 0.6, rz: 0.8, stagger: 0.10 },
      { x: 1.15, y: 0.18, z: 0.20, scale: 0.27, rx: 0.9, ry: 1.0, rz: 1.1, stagger: 0.12 }
    ];

    cubeConfigs.forEach(cfg => {
      const mesh = new THREE.Mesh(iceGeo, iceMat);
      mesh.scale.set(cfg.scale, cfg.scale, cfg.scale);
      mesh.position.set(cfg.x, cfg.y, cfg.z);

      const shadow = new THREE.Mesh(shadowGeo, shadowMat.clone());
      shadow.position.set(cfg.x, cfg.y - 0.08, cfg.z - 0.05);

      this.finaleGroup.add(shadow);
      this.finaleGroup.add(mesh);

      this.finaleIceCubes.push({
        mesh,
        shadow,
        cfg,
        rotSpeed: new THREE.Vector3(cfg.rx, cfg.ry, cfg.rz)
      });
    });

    // 2. Coffee Spill: Organic noise-edged shader blob spreading from saucer at 25% opacity
    const spillGeo = new THREE.PlaneGeometry(2.4, 2.4, 32, 32);
    const spillMat = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0.0 },
        uColor: { value: new THREE.Color(0x14100D) },
        uOpacity: { value: 0.25 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          if (uProgress <= 0.001) {
            discard;
          }
          vec2 p = vUv - vec2(0.5);
          float r = length(p);
          float angle = atan(p.y, p.x);
          
          float lobes = 0.22 * sin(3.0 * angle + 0.5) 
                      + 0.16 * sin(5.0 * angle - 1.2) 
                      + 0.10 * sin(7.0 * angle + 2.1)
                      + 0.08 * noise(p * 8.0);
                      
          float maxRadius = 0.38 * (1.0 + lobes);
          float currentRadius = maxRadius * clamp(uProgress, 0.0, 1.0);
          
          if (r > currentRadius) {
            discard;
          }
          
          float alpha = smoothstep(currentRadius, currentRadius - 0.02, r) * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    this.finaleSpillMesh = new THREE.Mesh(spillGeo, spillMat);
    this.finaleSpillMesh.position.set(0, 0, -0.01);
    this.finaleGroup.add(this.finaleSpillMesh);

    // 3. Coffee Splash Crown of 80 Instanced Droplets (stretched along velocity)
    this.splashCount = 80;
    const splashGeo = new THREE.ConeGeometry(0.024, 0.065, 8);
    splashGeo.rotateX(Math.PI / 2);
    const splashMat = new THREE.MeshStandardMaterial({
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.95
    });
    this.splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, this.splashCount);
    this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.splashData = [];
    const colEspresso1 = new THREE.Color(0x14100D);
    const colEspresso2 = new THREE.Color(0x281309);
    const colEmber1 = new THREE.Color(0xD94F1A);
    const colEmber2 = new THREE.Color(0xE0541F);

    for (let i = 0; i < this.splashCount; i++) {
      const isEmber = (i % 3 === 0);
      const col = isEmber ? (i % 6 === 0 ? colEmber2 : colEmber1) : (i % 2 === 0 ? colEspresso1 : colEspresso2);
      this.splashMesh.setColorAt(i, col);

      const angle = (i / this.splashCount) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.15);
      const speedR = 0.30 + (i % 7) * 0.06;
      const speedY = 0.85 + (i % 5) * 0.12;
      const phase = (i / this.splashCount) * 1.5;
      const period = 1.1 + (i % 4) * 0.1;

      this.splashData.push({
        angle,
        speedR,
        speedY,
        phase,
        period,
        baseScale: 0.75 + (i % 3) * 0.2
      });
    }
    if (this.splashMesh.instanceColor) this.splashMesh.instanceColor.needsUpdate = true;
    this.finaleGroup.add(this.splashMesh);

    // 4. Ember Ripple Ring expanding across the page on impact
    const ringGeo = new THREE.RingGeometry(0.08, 0.14, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xE0541F,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.finaleRippleRing = new THREE.Mesh(ringGeo, ringMat);
    this.finaleRippleRing.rotation.x = 0;
    this.finaleGroup.add(this.finaleRippleRing);

    this.splashBurst = 1.0;
  }

  burstFinaleSplash() {
    this.splashBurst = 2.5;
  }

  initRadialBlurPass() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const maxDpr = width >= 1440 ? 1.5 : 2.0;
    const dpr = Math.min(window.devicePixelRatio, maxDpr);

    this.blurTarget = new THREE.WebGLRenderTarget(Math.floor(width * 0.5), Math.floor(height * 0.5), {
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
      this.blurTarget.setSize(Math.floor(width * 0.5), Math.floor(height * 0.5));
    }
  }

  onMouseMove(e) {
    const normX = (e.clientX / window.innerWidth - 0.5) * 2;
    const normY = (e.clientY / window.innerHeight - 0.5) * 2;

    this.mouse.targetX = normX;
    this.mouse.targetY = normY;
  }

  // --- STAGE 2A SCROLL SCRUBBING APIS ---

  // State 1: Cup scales ~0.70 -> 1.15, tilts forward ~65° on X so crema faces camera by 15% checkpoint
  setHeroScrub(progress) {
    this.scrub.sectionMode = 'hero';
    if (this.cupGroup) this.cupGroup.visible = true;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
    if (this.beanMesh) this.beanMesh.visible = true;

    const p = Math.min(Math.max(progress, 0.0), 1.0);
    // At checkpoint 15% (51vh / 60vh = 0.85): letters fly past camera, cup tilts forward ~65 deg (1.134 rad)
    const tiltT = Math.max(0.0, (p - 0.35) / 0.65);
    const easeTilt = tiltT * tiltT;

    this.scrub.heroScale = THREE.MathUtils.lerp(0.70, 1.15, p);
    this.scrub.heroTiltZ = -0.02 * (1.0 - easeTilt);
    this.scrub.heroTiltX = THREE.MathUtils.lerp(0.12, 1.134, easeTilt); // 65 deg tilt on X!
    this.scrub.cupPosY = THREE.MathUtils.lerp(-1.14, -0.75, p);

    this.scrub.cameraZ = 6.1;
    this.scrub.cameraY = THREE.MathUtils.lerp(0.25, 0.10, easeTilt);
    this.scrub.cameraLookY = THREE.MathUtils.lerp(-0.38, -0.65, easeTilt);
    this.camera.fov = 36;
    this.camera.updateProjectionMatrix();

    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) this.liquidMesh.visible = true;
    if (this.beanRainRim) this.beanRainRim.intensity = 0.0;
    if (this.beanRainKey) this.beanRainKey.intensity = 0.0;
    this.renderer.toneMappingExposure = 1.15;

    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      this.steamMaterial.uniforms.uSteamAlpha.value = 1.0 - easeTilt;
      if (this.steamParticles) this.steamParticles.visible = easeTilt < 0.9;
    }
  }

  // State 2: Camera dollies into crema, ripple shockwaves expand, smooth pullback for Exploded
  setDiveScrub(progress, velocity = 0) {
    this.scrub.sectionMode = 'dive';
    if (this.cupGroup) this.cupGroup.visible = true;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
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

    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      this.steamMaterial.uniforms.uSteamAlpha.value = 0.0;
      if (this.steamParticles) this.steamParticles.visible = false;
    }

    if (progress <= 0.35) {
      // 0 to 35% of Dive (checkpoint 30% of 340vh = 102vh):
      // Cup is tilted 65 deg; camera dollies in until crema fills the screen!
      const t = progress / 0.35;
      const easeDolly = t * t;
      this.camera.fov = THREE.MathUtils.lerp(36, 75, easeDolly);
      this.camera.updateProjectionMatrix();

      this.scrub.heroTiltX = 1.134; // 65 degrees
      this.scrub.heroTiltZ = 0.0;
      this.scrub.heroScale = THREE.MathUtils.lerp(1.15, 1.45, easeDolly);
      this.scrub.cupPosY = THREE.MathUtils.lerp(-0.75, -0.65, easeDolly);

      this.scrub.cameraZ = THREE.MathUtils.lerp(6.1, 2.2, easeDolly);
      this.scrub.cameraY = THREE.MathUtils.lerp(0.10, -0.65, easeDolly);
      this.scrub.cameraLookY = -0.65;

      if (this.cremaMaterial && this.cremaMaterial.uniforms.uShockwave) {
        this.cremaMaterial.uniforms.uShockwave.value = 0.0;
      }
    } else if (progress <= 0.75) {
      // 35% to 75% of Dive (checkpoints 40% to 55% of 340vh = 136vh to 187vh):
      // Crema fills screen, concentric ripple shockwaves expand
      this.camera.fov = 75;
      this.camera.updateProjectionMatrix();

      this.scrub.heroTiltX = 1.134;
      this.scrub.heroTiltZ = 0.0;
      this.scrub.heroScale = 1.45;
      this.scrub.cupPosY = -0.65;

      this.scrub.cameraZ = 2.2;
      this.scrub.cameraY = -0.65;
      this.scrub.cameraLookY = -0.65;

      const shockwaveT = (progress - 0.35) / 0.40;
      if (this.cremaMaterial && this.cremaMaterial.uniforms.uShockwave) {
        this.cremaMaterial.uniforms.uShockwave.value = shockwaveT;
      }
    } else {
      // 75% to 100% of Dive:
      // Camera pulls back and up to 3/4 overhead angle of Exploded View
      const p = (progress - 0.75) / 0.25;
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

    if (this.cremaMaterial && this.cremaMaterial.uniforms.uRipple) {
      this.cremaMaterial.uniforms.uRipple.value = Math.min(Math.abs(velocity) * 0.12, 0.45);
    }
  }

  // Exploded View: 5 layers separate with even 0.52 gaps along vertical center axis
  // Focus-step system: camera eases to 3/4 close-up of each layer; non-focused layers fade to 20%
  setExplodedScrub(progress) {
    this.scrub.sectionMode = 'exploded';
    if (this.cupGroup) this.cupGroup.visible = true;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
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

    this.cupGroup.scale.set(0.58, 0.58, 0.58);
    this.cupGroup.position.set(0, -0.06, 0);
    this.cupGroup.rotation.set(0.245, 0, 0);

    // Separation: 0 to 22% with power3.out easing
    const pSep = Math.min(Math.max(progress / 0.22, 0.0), 1.0);
    const easedP = 1.0 - Math.pow(1.0 - pSep, 3.0);

    this.saucerMesh.position.y = -easedP * 1.38;
    if (this.contactShadowMesh) this.contactShadowMesh.position.y = -0.83 - easedP * 1.38;
    this.cupMesh.position.y = -easedP * 0.30;

    const coffeeY = THREE.MathUtils.lerp(0.50, 0.82, easedP);
    const foamY = THREE.MathUtils.lerp(0.52, 1.34, easedP);
    const spoonY = THREE.MathUtils.lerp(0.55, 1.86, easedP);

    if (this.coffeeMesh) {
      this.coffeeMesh.position.set(0, coffeeY, 0);
    }
    if (this.foamMesh) {
      this.foamMesh.position.set(0, foamY, 0);
    }
    if (this.spoonMesh) {
      this.spoonMesh.position.set(0, spoonY, 0);
    }

    // Pacing across focus steps:
    // 0 to 0.22: Full stack separation (overview)
    // 0.22 to 0.45: Step 1 (Crema) close-up
    // 0.45 to 0.68: Step 2 (Coffee) close-up
    // 0.68 to 0.90: Step 3 (Cup) close-up
    // 0.90 to 1.0: Pull back to full stack for R2 dissolve

    let targetCamY = 0.40;
    let targetLookY = -0.10;
    let targetCamZ = 6.1;
    let targetFov = 36;

    if (progress < 0.22) {
      // Full stack overview
      this.setLayerOpacities({ spoon: 1.0, crema: 1.0, coffee: 1.0, cup: 1.0, saucer: 1.0 });
    } else if (progress < 0.45) {
      // Step 1: Crema close-up (foam is at 1.34)
      const t = Math.min(1.0, (progress - 0.22) / 0.08);
      targetCamY = THREE.MathUtils.lerp(0.40, 1.35, t);
      targetLookY = THREE.MathUtils.lerp(-0.10, 1.25, t);
      targetCamZ = THREE.MathUtils.lerp(6.1, 4.8, t);
      targetFov = THREE.MathUtils.lerp(36, 32, t);
      const fadeOther = THREE.MathUtils.lerp(1.0, 0.20, t);
      this.setLayerOpacities({ spoon: fadeOther, crema: 1.0, coffee: fadeOther, cup: fadeOther, saucer: fadeOther });
    } else if (progress < 0.68) {
      // Step 2: Coffee close-up (coffee is at 0.82)
      const t = Math.min(1.0, (progress - 0.45) / 0.08);
      targetCamY = THREE.MathUtils.lerp(1.35, 0.85, t);
      targetLookY = THREE.MathUtils.lerp(1.25, 0.75, t);
      targetCamZ = 4.8;
      targetFov = 32;
      const fadeCrema = THREE.MathUtils.lerp(1.0, 0.20, t);
      this.setLayerOpacities({ spoon: 0.20, crema: fadeCrema, coffee: 1.0, cup: 0.20, saucer: 0.20 });
    } else if (progress < 0.90) {
      // Step 3: Cup close-up (cup is at -0.30)
      const t = Math.min(1.0, (progress - 0.68) / 0.08);
      targetCamY = THREE.MathUtils.lerp(0.85, -0.20, t);
      targetLookY = THREE.MathUtils.lerp(0.75, -0.30, t);
      targetCamZ = 4.8;
      targetFov = 32;
      const fadeCoffee = THREE.MathUtils.lerp(1.0, 0.20, t);
      this.setLayerOpacities({ spoon: 0.20, crema: 0.20, coffee: fadeCoffee, cup: 1.0, saucer: 0.20 });
    } else {
      // 0.90 to 1.0: Pull back to full stack for R2 handover
      const t = Math.min(1.0, (progress - 0.90) / 0.10);
      targetCamY = THREE.MathUtils.lerp(-0.20, 0.40, t);
      targetLookY = THREE.MathUtils.lerp(-0.30, -0.10, t);
      targetCamZ = THREE.MathUtils.lerp(4.8, 6.1, t);
      targetFov = THREE.MathUtils.lerp(32, 36, t);
      const restoreOther = THREE.MathUtils.lerp(0.20, 1.0, t);
      this.setLayerOpacities({ spoon: restoreOther, crema: restoreOther, coffee: restoreOther, cup: 1.0, saucer: restoreOther });
    }

    this.scrub.cameraY = targetCamY;
    this.scrub.cameraLookY = targetLookY;
    this.scrub.cameraZ = targetCamZ;
    this.camera.fov = targetFov;
    this.camera.updateProjectionMatrix();

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

    if (inExploded && this.beanMesh && !this._beansInExploded) {
      this._beansInExploded = true;
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
    } else if (!inExploded) {
      this._beansInExploded = false;
    }
  }

  // 3D projected screen coordinates for the focus marker on layer surfaces
  getExplodedFocusCoords(step) {
    if (!this.cupGroup || !this.camera) return null;

    this.cupGroup.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!this._projVec) this._projVec = new THREE.Vector3();
    const pv = this._projVec;
    const m = this.cupGroup.matrixWorld;
    const cam = this.camera;

    const projectToScreen = (x, y, z) => {
      pv.set(x, y, z).applyMatrix4(m).project(cam);
      return {
        x: (pv.x * 0.5 + 0.5) * width,
        y: (-pv.y * 0.5 + 0.5) * height
      };
    };

    if (step === 1) {
      // Step 1: Crema disc surface (foamMesh is at position.y)
      const foamY = this.foamMesh ? this.foamMesh.position.y : 1.34;
      return projectToScreen(-0.35, foamY + 0.02, 0.15);
    } else if (step === 2) {
      // Step 2: Coffee disc surface (coffeeMesh is at position.y)
      const coffeeY = this.coffeeMesh ? this.coffeeMesh.position.y : 0.82;
      return projectToScreen(0.35, coffeeY + 0.02, 0.15);
    } else if (step === 3) {
      // Step 3: Cup wall surface (cupMesh is at position.y)
      const cupY = this.cupMesh ? this.cupMesh.position.y : -0.30;
      return projectToScreen(-0.45, cupY + 0.35, 0.65);
    }
    return null;
  }

  // Real-time 3D projected screen coordinates (pixels) for all 5 layers (zero heap allocation)
  getExplodedLayerScreenCoords() {
    if (!this.cupGroup || !this.camera) return null;

    this.cupGroup.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (!this._projVec) this._projVec = new THREE.Vector3();
    const pv = this._projVec;
    const m = this.cupGroup.matrixWorld;
    const cam = this.camera;

    const projectToScreen = (x, y, z) => {
      pv.set(x, y, z).applyMatrix4(m).project(cam);
      return {
        x: (pv.x * 0.5 + 0.5) * width,
        y: (-pv.y * 0.5 + 0.5) * height
      };
    };

    // 1. Spoon: right tip at local (0.75, spoonPosY, 0)
    const spoonY = this.spoonMesh ? this.spoonMesh.position.y : 1.86;
    const spoonRight = projectToScreen(0.75, spoonY, 0);

    // 2. Crema Disc: left edge and right edge (radius 1.06)
    const cremaY = this.foamMesh ? this.foamMesh.position.y : 1.34;
    const cremaLeft = projectToScreen(-1.06, cremaY, 0);
    const cremaRight = projectToScreen(1.06, cremaY, 0);

    // 3. Coffee Disc: left edge and right edge (radius 1.06)
    const coffeeY = this.coffeeMesh ? this.coffeeMesh.position.y : 0.82;
    const coffeeLeft = projectToScreen(-1.06, coffeeY, 0);
    const coffeeRight = projectToScreen(1.06, coffeeY, 0);

    // 4. Cup Body:
    const cupY = this.cupMesh ? this.cupMesh.position.y : -0.30;
    const cupLeft = projectToScreen(-0.96, cupY + 0.16, 0.28);
    const cupRight = projectToScreen(1.02, cupY + 0.10, 0);

    // 5. Saucer: right edge (radius 2.20)
    const saucerY = this.saucerMesh ? this.saucerMesh.position.y : -1.38;
    const saucerRight = projectToScreen(2.20, saucerY - 0.54, 0);

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
    this.scrub.explodedProgress = 0.0;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
    if (this.menuSceneGroup) this.menuSceneGroup.visible = false;
    if (this.menuVesselGroup) this.menuVesselGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = true;
    this.scrub.beanRainProgress = progress;
    if (this.steamMaterial && this.steamMaterial.uniforms.uSteamAlpha) {
      this.steamMaterial.uniforms.uSteamAlpha.value = 0.0;
      if (this.steamParticles) this.steamParticles.visible = false;
    }
    const inDissolve = progress < 0.25;
    if (this.foamMesh) this.foamMesh.visible = inDissolve;
    if (this.coffeeMesh) this.coffeeMesh.visible = inDissolve;
    if (this.spoonMesh) this.spoonMesh.visible = inDissolve;
    if (this.liquidMesh) this.liquidMesh.visible = false;
    if (this.cupMesh) {
      this.cupMesh.visible = inDissolve;
      this.cupMesh.position.y = -0.30;
    }
    if (this.saucerMesh) {
      this.saucerMesh.visible = inDissolve;
      this.saucerMesh.position.y = -1.38;
    }
    if (this.coffeeMesh) this.coffeeMesh.position.y = 0.82;
    if (this.foamMesh) this.foamMesh.position.y = 1.34;
    if (this.spoonMesh) this.spoonMesh.position.y = 1.86;

    // Show/hide foreground canvas (rendered only while front-arc beans pass in front of text)
    if (this.fgCanvas) {
      this.fgCanvas.style.display = (progress >= 0.45 && progress <= 0.85) ? 'block' : 'none';
    }

    // Light the beans in this section: ember rim (#E0541F), crema key (#F1E6D3), tone-mapping exposure +20%
    if (this.beanRainRim) this.beanRainRim.intensity = 3.4;
    if (this.beanRainKey) this.beanRainKey.intensity = 3.8;
    this.renderer.toneMappingExposure = 1.38;
    if (this.fgRenderer) this.fgRenderer.toneMappingExposure = 1.38;

    if (!this.beanMesh || !this.beanInitialData.length) return;

    // Reset bean mesh position & rotation
    this.beanMesh.position.set(0, 0, 0);
    this.beanMesh.rotation.set(0, 0, 0);
    if (this.beanMeshFg) {
      this.beanMeshFg.position.set(0, 0, 0);
      this.beanMeshFg.rotation.set(0, 0, 0);
    }

    // Camera transitions smoothly from exploded 3/4 angle to level ring angle
    const camT = Math.min(progress / 0.25, 1.0);
    this.scrub.cameraY = THREE.MathUtils.lerp(0.40, 0.0, camT);
    this.scrub.cameraLookY = THREE.MathUtils.lerp(-0.10, 0.0, camT);
    this.scrub.cameraZ = 6.1;
    this.camera.position.set(0, this.scrub.cameraY, 6.1);
    this.camera.lookAt(0, this.scrub.cameraLookY, 0);

    // Continuous transition from exploded view:
    // Layers dissolve with noise-threshold glowing ember edge across progress 0.0 to 0.25
    if (inDissolve) {
      const dissolve = Math.min(progress / 0.22, 1.0);
      this.setLayersDissolve(dissolve);
      this.scrub.heroScale = 0.58;
      this.scrub.cupPosY = -0.06;
      if (this.cupGroup) {
        this.cupGroup.scale.set(0.58, 0.58, 0.58);
        this.cupGroup.position.set(0, -0.06, 0);
        this.cupGroup.rotation.set(0.245, 0, 0);
        this.cupGroup.visible = true;
      }
    } else {
      if (this.cupGroup && this.cupGroup.visible) {
        this.cupGroup.visible = false;
        this.setLayersDissolve(0.0);
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

    if (progress <= 0.45) {
      // -------------------------------------------------------------------
      // PHASE 1: DISSOLVE & BEAN SPAWN INTO RAIN (0.0 to 0.45)
      // Beans spawn from layer surfaces and fly into falling rain scatter
      // -------------------------------------------------------------------
      const pRain = progress / 0.45;

      for (let i = 0; i < count; i++) {
        const b = this.beanInitialData[i];
        const spawnStagger = (i / 400) * 0.10;
        const tSpawn = THREE.MathUtils.clamp((progress - spawnStagger) / 0.30, 0.0, 1.0);
        const eSpawn = 1.0 - Math.pow(1.0 - tSpawn, 2.0); // ease-out

        let rainX = b.origPos.x + Math.sin(pRain * 2.5 + i) * 0.12;
        let rainY = b.origPos.y - pRain * b.fallDist;
        let rainZ = b.origPos.z;

        // Keep falling beans away from subline (exclude 60px margin): |X| < 1.35 and Y in [-1.55, -1.08]
        if (Math.abs(rainX) < 1.35 && rainY > -1.55 && rainY < -1.08) {
          rainX += (rainX >= 0 ? 1.45 : -1.45);
        }

        const spawnPos = b.spawnPos || b.origPos;
        let curX = THREE.MathUtils.lerp(spawnPos.x, rainX, eSpawn);
        let curY = THREE.MathUtils.lerp(spawnPos.y, rainY, eSpawn);
        let curZ = THREE.MathUtils.lerp(spawnPos.z, rainZ, eSpawn);

        const rotX = b.origRot.x + progress * Math.PI * 4.0;
        const rotY = b.origRot.y + progress * Math.PI * 3.5;
        const beanScale = THREE.MathUtils.lerp(0.28, Math.min(b.origScale, 0.44), eSpawn);

        tempVec.set(curX, curY, curZ);
        dummy.position.copy(tempVec);
        dummy.rotation.set(rotX, rotY, b.origRot.z);
        dummy.scale.set(beanScale, beanScale, beanScale);
        dummy.updateMatrix();

        // During spawn & rain phase, beans render on background canvas
        this.beanMesh.setMatrixAt(i, dummy.matrix);
        if (this.beanMeshFg) {
          this.beanMeshFg.setMatrixAt(i, zeroDummy.matrix);
        }
      }
    } else if (progress <= 0.85) {
      // -------------------------------------------------------------------
      // PHASE 2: RAIN -> CLEAN RING GATHER (0.45 to 0.85)
      // Per-bean stagger & smoothstep ease into 24vh circular ring at 52% height
      // -------------------------------------------------------------------
      for (let i = 0; i < count; i++) {
        const b = this.beanInitialData[i];

        // Rain end position at p = 0.45
        let rainEndX = b.origPos.x + Math.sin(2.5 + i) * 0.12;
        let rainEndY = b.origPos.y - b.fallDist;
        let rainEndZ = b.origPos.z;
        if (Math.abs(rainEndX) < 1.35 && rainEndY > -1.55 && rainEndY < -1.08) {
          rainEndX += (rainEndX >= 0 ? 1.45 : -1.45);
        }

        // Per-bean stagger into spiral ring
        const stagger = ((i % 100) / 100) * 0.16;
        const tGather = THREE.MathUtils.clamp((progress - 0.45 - stagger) / 0.20, 0.0, 1.0);
        const eGather = THREE.MathUtils.smoothstep(tGather, 0.0, 1.0);

        // Ring target position: ONE clean true circle of radius 24vh, centered at (0, -0.08)
        const spiralTurns = 1.8;
        const currentAngle = b.ringAngle + (1.0 - eGather) * spiralTurns * Math.PI;
        const targetX = Math.cos(currentAngle) * b.targetRingRadius;
        const targetY = ringCenterY + Math.sin(currentAngle) * b.targetRingRadius;
        const targetZ = b.targetZ;

        const curX = THREE.MathUtils.lerp(rainEndX, targetX, eGather);
        const curY = THREE.MathUtils.lerp(rainEndY, targetY, eGather);
        const curZ = THREE.MathUtils.lerp(rainEndZ, targetZ, eGather);

        const rotX = b.origRot.x + (1.0 + eGather) * Math.PI * 2.0;
        const rotY = b.origRot.y + (1.0 + eGather) * Math.PI * 2.4;
        const beanScale = Math.min(b.origScale, 0.44);

        tempVec.set(curX, curY, curZ);
        dummy.position.copy(tempVec);
        dummy.rotation.set(rotX, rotY, b.origRot.z);
        dummy.scale.set(beanScale, beanScale, beanScale);
        dummy.updateMatrix();

        // Foreground vs background depth split:
        // Front arc is much sparser than back arc so all letters stay >= 70% visible
        if (this.beanMeshFg && b.isForeground && eGather > 0.15) {
          this.beanMeshFg.setMatrixAt(i, dummy.matrix);
          this.beanMesh.setMatrixAt(i, zeroDummy.matrix);
        } else {
          this.beanMesh.setMatrixAt(i, dummy.matrix);
          if (this.beanMeshFg) {
            this.beanMeshFg.setMatrixAt(i, zeroDummy.matrix);
          }
        }
      }
    } else {
      // -------------------------------------------------------------------
      // PHASE 3: RING EXIT -> POUR INTO MENU VESSEL (0.85 to 1.0)
      // Ring contracts to center and beans pour into vessel on the right side
      // -------------------------------------------------------------------
      for (let i = 0; i < count; i++) {
        const b = this.beanInitialData[i];
        const staggerExit = (i / 400) * 0.06;
        const tExit = THREE.MathUtils.clamp((progress - 0.85 - staggerExit) / 0.085, 0.0, 1.0);
        const eExit = tExit * tExit; // accelerate into pour stream

        // Base stable ring position
        const ringX = Math.cos(b.ringAngle) * b.targetRingRadius;
        const ringY = ringCenterY + Math.sin(b.ringAngle) * b.targetRingRadius;

        // Contract factor toward center (0, -0.08)
        const contract = 1.0 - eExit * 0.70;
        const cRingX = ringX * contract;
        const cRingY = ringCenterY + (ringY - ringCenterY) * contract;

        // Target pour location into menu vessel on the right
        const pourTargetX = 1.55 + Math.sin(i * 3.7) * 0.08;
        const pourTargetY = -0.18 + Math.cos(i * 2.3) * 0.08 - eExit * 0.45;
        const pourTargetZ = ((i % 5) - 2) * 0.04;

        const curX = THREE.MathUtils.lerp(cRingX, pourTargetX, eExit);
        const curY = THREE.MathUtils.lerp(cRingY, pourTargetY, eExit);
        const curZ = THREE.MathUtils.lerp(b.targetZ, pourTargetZ, eExit);

        const rotX = b.origRot.x + (2.0 + eExit * 4.0) * Math.PI;
        const rotY = b.origRot.y + (2.4 + eExit * 4.0) * Math.PI;

        const shrink = 1.0 - THREE.MathUtils.smoothstep(tExit, 0.35, 1.0);
        const beanScale = Math.min(b.origScale, 0.44) * shrink;

        if (beanScale < 0.005) {
          this.beanMesh.setMatrixAt(i, zeroDummy.matrix);
          if (this.beanMeshFg) this.beanMeshFg.setMatrixAt(i, zeroDummy.matrix);
        } else {
          tempVec.set(curX, curY, curZ);
          dummy.position.copy(tempVec);
          dummy.rotation.set(rotX, rotY, b.origRot.z);
          dummy.scale.set(beanScale, beanScale, beanScale);
          dummy.updateMatrix();

          // During pour, all beans funnel in background canvas
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

    // Reset exploded layers back to assembled cup & hide other sections
    if (this.saucerMesh) this.saucerMesh.position.y = 0;
    if (this.contactShadowMesh) this.contactShadowMesh.position.y = -0.83;
    if (this.cupMesh) this.cupMesh.position.y = 0;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) this.liquidMesh.visible = false;
    if (this.cupGroup) this.cupGroup.visible = false;

    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
    if (this.fgCanvas) this.fgCanvas.style.display = 'none';
    if (this.processGroup) this.processGroup.visible = false;
    if (this.finaleGroup) this.finaleGroup.visible = false;
    const canvasContainer = document.getElementById('webgl-canvas-container');
    if (canvasContainer) canvasContainer.style.zIndex = '5';

    if (this.menuSceneGroup) this.menuSceneGroup.visible = true;

    const isMobile = window.innerWidth <= 768;
    const baseScale = isMobile ? 0.42 : 0.48;
    const targetX = isMobile ? 0 : 1.05;
    const targetY = isMobile ? 0.65 : -0.22;
    const targetZ = isMobile ? 0.8 : 1.45;

    // Opacity fades on entry (0 to 0.08) and exit (0.86 to 0.98)
    let alpha = 1.0;
    if (progress < 0.08) {
      alpha = Math.max(0.0, progress / 0.08);
    } else if (progress > 0.86) {
      alpha = Math.max(0.0, 1.0 - (progress - 0.86) / 0.12);
    }

    if (this.menuAuraMaterial) {
      this.menuAuraMaterial.uniforms.uOpacity.value = alpha;
    }
    if (this.menuPhotoMaterial) {
      this.menuPhotoMaterial.uniforms.uOpacity.value = alpha;
    }

    // Active vessel visibility: enforce strictly 1 vessel visible at any time
    const activeIdx = this.activeDrinkIndex !== undefined ? this.activeDrinkIndex : 0;
    const vessels = [this.vessel0Espresso, this.vessel1Cortado, this.vessel2Caramel, this.vessel3Tonic];
    vessels.forEach((v, i) => {
      if (v) v.visible = (i === activeIdx && progress < 0.99);
    });

    // Menu Vessel floating and exit transition to Process
    if (this.menuVesselGroup) {
      this.menuVesselGroup.visible = progress < 0.99;
      if (progress >= 0.86) {
        // Exit transition: vessel smoothly shrinks and glides toward Process green bean at (1.48, 0, 0)
        const tExit = (progress - 0.86) / 0.14;
        const curScale = THREE.MathUtils.lerp(baseScale, 0.18, tExit);
        const curX = THREE.MathUtils.lerp(targetX, 1.48, tExit);
        const curY = THREE.MathUtils.lerp(targetY, 0.0, tExit);
        const curZ = THREE.MathUtils.lerp(targetZ, 0.0, tExit);
        this.menuVesselGroup.scale.set(curScale, curScale, curScale);
        this.menuVesselGroup.position.set(curX, curY, curZ);
        this.menuVesselGroup.rotation.y = THREE.MathUtils.lerp(0, Math.PI * 2.0, tExit);
        this.menuVesselGroup.rotation.x = THREE.MathUtils.lerp(0.18, 0.35, tExit);
      } else {
        const bobY = targetY + Math.sin(progress * Math.PI * 4) * 0.022;
        this.menuVesselGroup.position.set(targetX, bobY, targetZ);
        this.menuVesselGroup.scale.set(baseScale, baseScale, baseScale);
        this.menuVesselGroup.rotation.x = 0.18;
      }
    }

    this.camera.position.set(0, 0, 6.1);
    this.camera.lookAt(0, 0, 0);
    this.renderer.toneMappingExposure = 1.15;
  }

  setDrinkActive(index) {
    if (this.activeDrinkIndex === index) return;
    const oldIndex = this.activeDrinkIndex !== undefined ? this.activeDrinkIndex : 0;
    this.activeDrinkIndex = index;

    const drinkPalettes = [
      { base: 0x0c0704, caustic: 0xb84a14, glow: 0xe88c38 }, // 01 Ember Espresso
      { base: 0x0f0b08, caustic: 0xaa7648, glow: 0xe4c49f }, // 02 Cortado Noir
      { base: 0x110904, caustic: 0xcf701b, glow: 0xf5b052 }, // 03 Burnt Caramel Latte
      { base: 0x060f18, caustic: 0x2578b8, glow: 0xee781b }  // 04 Ember Tonic
    ];
    const palette = drinkPalettes[index] || drinkPalettes[0];
    const targetBase = new THREE.Color(palette.base);
    const targetCaustic = new THREE.Color(palette.caustic);
    const targetGlow = new THREE.Color(palette.glow);

    if (this.scrub.sectionMode !== 'menu') {
      this.setMenuScrub(0);
    }

    // 1. Vessel Transition (Strict 1-at-a-time exclusivity, smooth 3D spin & lift)
    const vessels = [
      this.vessel0Espresso,
      this.vessel1Cortado,
      this.vessel2Caramel,
      this.vessel3Tonic
    ];

    vessels.forEach((vessel, i) => {
      if (!vessel) return;
      gsap.killTweensOf(vessel.scale);
      gsap.killTweensOf(vessel.rotation);
      gsap.killTweensOf(vessel.position);
      if (i !== index) {
        vessel.visible = false;
      }
    });

    const activeVessel = vessels[index];
    if (activeVessel) {
      activeVessel.visible = true;
      activeVessel.scale.set(0.72, 0.72, 0.72);
      activeVessel.position.y = -0.16;
      gsap.to(activeVessel.scale, {
        x: 1.0,
        y: 1.0,
        z: 1.0,
        duration: 0.75,
        ease: 'back.out(1.4)',
        overwrite: 'auto'
      });
      gsap.to(activeVessel.position, {
        y: 0.0,
        duration: 0.75,
        ease: 'power2.out',
        overwrite: 'auto'
      });
      gsap.to(activeVessel.rotation, {
        y: activeVessel.rotation.y + Math.PI * 1.5,
        duration: 0.95,
        ease: 'power3.out',
        overwrite: 'auto'
      });
    }

    // 2. Editorial Photo Plate Liquid Morph Transition
    if (this.menuPhotoMaterial && this.menuTextures && this.menuTextures.length >= 4) {
      this.menuPhotoMaterial.uniforms.uTexCurrent.value = this.menuTextures[oldIndex] || this.menuTextures[0];
      this.menuPhotoMaterial.uniforms.uTexNext.value = this.menuTextures[index] || this.menuTextures[0];
      this.menuPhotoMaterial.uniforms.uTransition.value = 0.0;
      gsap.to(this.menuPhotoMaterial.uniforms.uTransition, {
        value: 1.0,
        duration: 0.85,
        ease: 'power2.inOut',
        overwrite: 'auto'
      });
    }

    // 3. Aura Caustics Color Palette Tween
    if (this.menuAuraMaterial) {
      gsap.to(this.menuAuraMaterial.uniforms.uColorBase.value, {
        r: targetBase.r,
        g: targetBase.g,
        b: targetBase.b,
        duration: 0.85,
        ease: 'power2.out'
      });
      gsap.to(this.menuAuraMaterial.uniforms.uColorCaustic.value, {
        r: targetCaustic.r,
        g: targetCaustic.g,
        b: targetCaustic.b,
        duration: 0.85,
        ease: 'power2.out'
      });
      gsap.to(this.menuAuraMaterial.uniforms.uColorGlow.value, {
        r: targetGlow.r,
        g: targetGlow.g,
        b: targetGlow.b,
        duration: 0.85,
        ease: 'power2.out'
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
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
    if (this.panoramaDrumGroup) this.panoramaDrumGroup.visible = false;
    if (this.menuVesselGroup) this.menuVesselGroup.visible = false;
    if (this.menuSceneGroup) this.menuSceneGroup.visible = false;
    const canvasContainerProc = document.getElementById('webgl-canvas-container');
    if (canvasContainerProc) canvasContainerProc.style.zIndex = '5';

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
      // Entry: Bean grows out of dissolving menu vessel position to Process position, rotating
      const tEntry = Math.min(progress / 0.12, 1.0);
      const startX = isMobile ? 0 : 1.85;
      const startY = isMobile ? 1.05 : 0.85;
      const targetX = isMobile ? 0 : 1.48;
      const targetY = isMobile ? 0.9 : 0.0;
      const curX = THREE.MathUtils.lerp(startX, targetX, tEntry);
      const curY = THREE.MathUtils.lerp(startY, targetY, tEntry);
      const curScale = THREE.MathUtils.lerp(0.25, 1.0, tEntry);

      this.processGroup.position.set(curX, curY, 0);
      this.processBeanMesh.visible = true;
      this.processBeanMesh.scale.set(curScale, curScale, curScale);
      this.processBeanMesh.rotation.y = tEntry * Math.PI * 2.0;
      this.processBeanMesh.rotation.x = 0.15 + tEntry * 0.2;
      this.processBeanMaterial.color.copy(colorGreen);
      this.processGranulesMesh.visible = false;
      this.processDropletMesh.visible = false;
      if (this.cupGroup) this.cupGroup.visible = false;
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
      if (this.cupGroup) this.cupGroup.visible = false;
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
      if (this.cupGroup) this.cupGroup.visible = false;

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
      // Step 4: 04 BREW (granules fall into stream, droplet forms and accelerates downward)
      const t = (progress - 0.75) / 0.25;
      this.processBeanMesh.visible = false;
      this.processGranulesMesh.visible = t < 0.85;
      this.processDropletMesh.visible = t < 0.98;

      if (t < 0.85) {
        // Granules fall into stream and fade
        for (let i = 0; i < this.granulesData.length; i++) {
          const g = this.granulesData[i];
          const streamProgress = Math.min((t * 1.3) + (i % 20) * 0.015, 1.0);
          const curX = THREE.MathUtils.lerp(g.settlePos.x, g.streamTarget.x, streamProgress);
          const curY = THREE.MathUtils.lerp(g.settlePos.y, g.streamTarget.y - t * 0.8, streamProgress);
          const curZ = THREE.MathUtils.lerp(g.settlePos.z, g.streamTarget.z, streamProgress);

          const fadeScale = Math.max(0, g.scale * (1.0 - t * 1.2));
          dummy.position.set(curX, curY, curZ);
          dummy.scale.set(fadeScale, fadeScale, fadeScale);
          dummy.rotation.set(0, curY * 4, 0);
          dummy.updateMatrix();
          this.processGranulesMesh.setMatrixAt(i, dummy.matrix);
        }
        this.processGranulesMesh.instanceMatrix.needsUpdate = true;
      }

      if (t < 0.50) {
        // Drop forms and pulses
        const dropScale = Math.min(t * 2.0, 1.0);
        const bobY = -0.95 + Math.sin(t * Math.PI * 4) * 0.04;
        this.processDropletMesh.scale.set(dropScale, dropScale * 1.1, dropScale);
        this.processDropletMesh.position.y = bobY;
        if (this.cupGroup) this.cupGroup.visible = false;
      } else if (t < 0.98) {
        // Drop elongates and falls with acceleration toward landing point
        const tDrop = (t - 0.50) / 0.50;
        const scaleX = Math.max(0.01, 1.0 - tDrop * 0.5);
        const scaleY = 1.0 + tDrop * 2.5;
        this.processDropletMesh.scale.set(scaleX, scaleY, scaleX);
        this.processDropletMesh.position.y = -0.95 - tDrop * tDrop * 2.8;

        if (this.cupGroup) this.cupGroup.visible = false;
      } else {
        this.processDropletMesh.visible = false;
      }
    }

    // Process Exit: Landing point circular clip-path reveal opening first photo
    const exitRevealEl = document.getElementById('process-exit-reveal');
    if (exitRevealEl) {
      if (progress >= 0.88) {
        const tReveal = Math.min((progress - 0.88) / 0.12, 1.0);
        const radius = tReveal * 150;
        const originX = isMobile ? 50 : 72;
        const originY = isMobile ? 74 : 76;
        exitRevealEl.style.opacity = '1';
        exitRevealEl.style.clipPath = `circle(${radius}% at ${originX}% ${originY}%)`;
      } else {
        exitRevealEl.style.opacity = '0';
        exitRevealEl.style.clipPath = `circle(0% at 72% 76%)`;
      }
    }
  }

  setAtmosphereScrub(progress) {
    this.scrub.sectionMode = 'atmosphere';
    const exitRevealEl = document.getElementById('process-exit-reveal');
    if (exitRevealEl) exitRevealEl.style.opacity = '0';
    if (this.cupGroup) this.cupGroup.visible = false;
    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
    if (this.panoramaDrumGroup) this.panoramaDrumGroup.visible = false;
    if (this.menuVesselGroup) this.menuVesselGroup.visible = false;
    if (this.menuSceneGroup) this.menuSceneGroup.visible = false;
    if (this.finaleGroup) this.finaleGroup.visible = false;
    const canvasContainerAtmo = document.getElementById('webgl-canvas-container');
    if (canvasContainerAtmo) canvasContainerAtmo.style.zIndex = '5';
  }

  setFinaleScrub(progress) {
    this.scrub.sectionMode = 'finale';
    this.scrub.finaleProgress = progress;

    if (this.processGroup) this.processGroup.visible = false;
    if (this.beanMesh) this.beanMesh.visible = false;
    if (this.beanMeshFg) this.beanMeshFg.visible = false;
    if (this.fgCanvas) this.fgCanvas.style.display = 'none';
    if (this.turntableGroup) this.turntableGroup.visible = false;
    if (this.menuBgPlane) this.menuBgPlane.visible = false;
    if (this.panoramaDrumGroup) this.panoramaDrumGroup.visible = false;
    if (this.menuVesselGroup) this.menuVesselGroup.visible = false;
    if (this.menuSceneGroup) this.menuSceneGroup.visible = false;

    const canvasContainerFin = document.getElementById('webgl-canvas-container');
    if (canvasContainerFin) canvasContainerFin.style.zIndex = '30';

    // Reset dissolve and opacity back to 100% solid
    this.setLayersDissolve(0.0);
    this.setLayerOpacities();

    // Assemble cup & saucer
    if (this.saucerMesh) {
      this.saucerMesh.visible = true;
      this.saucerMesh.position.set(0, 0, 0);
    }
    if (this.cupMesh) {
      this.cupMesh.visible = true;
      this.cupMesh.position.set(0, 0, 0);
    }
    if (this.handleMesh) {
      this.handleMesh.visible = true;
    }
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) {
      this.liquidMesh.visible = true;
      if (this.liquidMesh.material && this.liquidMesh.material.color) {
        this.liquidMesh.material.color.setHex(0x1a0d06);
      }
    }

    if (!this.cupGroup) return;

    // Project pill-cup-target starting icon in DOM to 3D world space
    const targetEl = document.getElementById('pill-cup-target') || document.getElementById('finale-reserve-btn');
    let targetWorldX = 0;
    let targetWorldY = -0.15;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const ndcX = (centerX / window.innerWidth) * 2 - 1;
      const ndcY = -(centerY / window.innerHeight) * 2 + 1;

      const vFOV = (36 * Math.PI) / 180;
      const halfHeight = Math.tan(vFOV / 2) * 6.1;
      const halfWidth = halfHeight * (window.innerWidth / window.innerHeight);

      targetWorldX = ndcX * halfWidth;
      targetWorldY = ndcY * halfHeight;
    }

    this._finaleTargetX = targetWorldX;
    this._finaleTargetY = targetWorldY;

    if (this.finaleGroup) {
      this.finaleGroup.visible = false;
    }

    const p = Math.max(0, Math.min(progress, 1.0));

    // Cup & saucer descend from above (0 to 0.60) and dock neatly inside #pill-cup-target (0.60 to 1.0)
    const tDescend = Math.min(p / 0.60, 1.0);
    const easeLanding = 1.0 - Math.pow(1.0 - tDescend, 2.5);

    this.cupGroup.visible = true;

    const startX = 0;
    const startY = targetWorldY + 3.2; // Descends from above
    const startScale = 0.52;
    const endScale = 0.036; // Fits neatly inside the 48px circle target!

    const curScale = THREE.MathUtils.lerp(startScale, endScale, easeLanding);
    const curX = THREE.MathUtils.lerp(startX, targetWorldX, easeLanding);
    const curY = THREE.MathUtils.lerp(startY, targetWorldY + 0.015, easeLanding);
    const curRotY = (1.0 - easeLanding) * Math.PI * 1.6;

    this.cupGroup.position.set(curX, curY, 0.15);
    this.cupGroup.scale.set(curScale, curScale, curScale);
    this.cupGroup.rotation.set(0.24, curRotY, 0.0);

    if (this.steamParticles) {
      this.steamParticles.visible = p < 0.65;
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

        if (this.scrub.sectionMode === 'exploded' && this.scrub.explodedProgress > 0.005) {
          // Exploded view: camera slowly orbits +-8 degrees, layers slowly turn
          const orbitAngle = Math.sin(elapsedTime * 0.45) * 0.08; // subtle orbit
          this.cupGroup.rotation.set(this.scrub.heroTiltX, 0, this.scrub.heroTiltZ);
          this.cupGroup.position.set(0, this.scrub.cupPosY, 0);
          this.camera.position.set(Math.sin(orbitAngle) * this.scrub.cameraZ, this.scrub.cameraY, Math.cos(orbitAngle) * this.scrub.cameraZ);
          this.camera.lookAt(0, this.scrub.cameraLookY, 0);

          if (this.spoonMesh) this.spoonMesh.rotation.y = elapsedTime * 0.18;
          if (this.foamMesh) this.foamMesh.rotation.z = elapsedTime * -0.14;
          if (this.coffeeMesh) this.coffeeMesh.rotation.z = elapsedTime * 0.16;
          if (this.cupMesh) this.cupMesh.rotation.y = elapsedTime * -0.09;
          if (this.saucerMesh) this.saucerMesh.rotation.y = elapsedTime * 0.07;
        } else if (this.scrub.sectionMode === 'hero' || this.scrub.sectionMode === 'dive') {
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

      // Idle rotations and micro-animations for Menu section
      if (this.scrub.sectionMode === 'menu') {
        const deltaSec = delta;
        const elapsed = elapsedTime;

        // Aura and Photo shaders time updates
        if (this.menuAuraMaterial) {
          this.menuAuraMaterial.uniforms.uTime.value = elapsed;
          this.menuAuraMaterial.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
        }
        if (this.menuPhotoMaterial) {
          this.menuPhotoMaterial.uniforms.uTime.value = elapsed;
        }

        // Editorial photo subtle mouse parallax tilt
        if (this.menuPhotoMesh) {
          this.menuPhotoMesh.rotation.y += (this.mouse.x * 0.10 - this.menuPhotoMesh.rotation.y) * 0.05;
          this.menuPhotoMesh.rotation.x += (-this.mouse.y * 0.08 - this.menuPhotoMesh.rotation.x) * 0.05;
        }

        const activeIdx = this.activeDrinkIndex || 0;

        // Drink 0: 01 Ember Espresso Crema Vortex & Steam
        if (activeIdx === 0) {
          if (this.cremaVortexMaterial) {
            this.cremaVortexMaterial.uniforms.uTime.value = elapsed;
          }
          if (this.espressoSteam && this.espressoSteamData) {
            const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
            for (let i = 0; i < this.espressoSteamData.length; i++) {
              const s = this.espressoSteamData[i];
              s.y += s.speed * deltaSec;
              s.x += Math.sin(elapsed * 2.5 + i) * 0.005;
              if (s.y > 1.45) {
                s.y = 0.55;
                s.x = (Math.random() - 0.5) * 0.45;
              }
              dummy.position.set(s.x, s.y, s.z);
              const scale = Math.sin((s.y - 0.55) / 0.9 * Math.PI) * 1.1;
              dummy.scale.set(Math.max(0.01, scale), Math.max(0.01, scale), Math.max(0.01, scale));
              dummy.updateMatrix();
              this.espressoSteam.setMatrixAt(i, dummy.matrix);
            }
            this.espressoSteam.instanceMatrix.needsUpdate = true;
          }
        }

        // Drink 1: 02 Cortado Noir faceted crystal subtle idle drift
        if (activeIdx === 1 && this.vessel1Cortado) {
          this.vessel1Cortado.rotation.y += deltaSec * 0.15;
        }

        // Drink 2: 03 Burnt Caramel Latte Zero-G Sugar Halo orbiting & tumbling
        if (activeIdx === 2 && this.sugarHaloMesh && this.sugarHaloData) {
          const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
          for (let i = 0; i < this.sugarHaloData.length; i++) {
            const d = this.sugarHaloData[i];
            const curAng = d.baseAngle + elapsed * d.speed;
            const x = Math.cos(curAng) * d.radius;
            const z = Math.sin(curAng) * d.radius;
            const y = d.baseY + Math.sin(elapsed * 1.8 + i) * 0.08;
            dummy.position.set(x, y, z);
            dummy.rotation.x = elapsed * d.rotSpeedX;
            dummy.rotation.y = elapsed * d.rotSpeedY;
            dummy.updateMatrix();
            this.sugarHaloMesh.setMatrixAt(i, dummy.matrix);
          }
          this.sugarHaloMesh.instanceMatrix.needsUpdate = true;
        }

        // Drink 3: 04 Ember Tonic effervescent cavitation bubbles rising
        if (activeIdx === 3 && this.tonicBubbles && this.tonicBubbleSimData) {
          const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
          for (let i = 0; i < this.tonicBubbleSimData.length; i++) {
            const b = this.tonicBubbleSimData[i];
            b.y += b.speed * deltaSec;
            b.x += Math.sin(elapsed * 4.0 + b.phase) * 0.003;
            if (b.y > 1.15) {
              b.y = -0.55;
            }
            dummy.position.set(b.x, b.y, b.z);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            this.tonicBubbles.setMatrixAt(i, dummy.matrix);
          }
          this.tonicBubbles.instanceMatrix.needsUpdate = true;
        }
      } else if (this.scrub.sectionMode === 'process' && this.processBeanMesh && this.processBeanMesh.visible) {
        this.processBeanMesh.rotation.y += delta * 0.40;
        this.processBeanMesh.rotation.x = 0.15 + Math.sin(elapsedTime * 0.6) * 0.08;
      } else if (this.scrub.sectionMode === 'finale' && this.cupGroup) {
        const p = this.scrub.finaleProgress || 0;
        if (p >= 0.60) {
          const targetEl = document.getElementById('pill-cup-target') || document.getElementById('finale-reserve-btn');
          if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const ndcX = (centerX / window.innerWidth) * 2 - 1;
            const ndcY = -(centerY / window.innerHeight) * 2 + 1;
            const vFOV = (36 * Math.PI) / 180;
            const halfHeight = Math.tan(vFOV / 2) * 6.1;
            const halfWidth = halfHeight * (window.innerWidth / window.innerHeight);
            const targetWorldX = ndcX * halfWidth;
            const targetWorldY = ndcY * halfHeight + 0.015;
            this.cupGroup.position.x = THREE.MathUtils.lerp(this.cupGroup.position.x, targetWorldX, 0.2);
            this.cupGroup.position.y = THREE.MathUtils.lerp(this.cupGroup.position.y, targetWorldY, 0.2);
          }
        }
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
      if (false && blurStrength > 0.002 && this.blurTarget && this.blurScene && this.blurCamera) {
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

    // Render foreground beans layer only when foreground beans are active (progress 0.45 to 0.85)
    if (this.fgRenderer && this.sceneFg) {
      if (this.scrub.beanRainProgress >= 0.45 && this.scrub.beanRainProgress <= 0.85 && this.scrub.sectionMode === 'bean-rain') {
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
      getExplodedFocusCoords: this.getExplodedFocusCoords.bind(this),
      setLayerOpacities: this.setLayerOpacities.bind(this),
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
      burstFinaleSplash: this.burstFinaleSplash.bind(this),
      rawScene: this,
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
