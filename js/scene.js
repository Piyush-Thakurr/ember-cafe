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

      // Phase 3: Spawn position on the 5 separating exploded layer surfaces
      const layerIdx = i % 5;
      let localX = 0, localY = 0, localZ = 0;
      if (layerIdx === 0) {
        // Spoon
        const theta = (i / 400) * Math.PI * 2;
        localX = 0.05 + Math.cos(theta) * 0.22;
        localY = 1.86 + Math.sin(theta) * 0.12;
        localZ = ((i % 7) - 3) * 0.02;
      } else if (layerIdx === 1) {
        // Crema disc
        const r = Math.sqrt((i % 80) / 80) * 0.98;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = 1.34;
        localZ = Math.sin(theta) * r * 0.35;
      } else if (layerIdx === 2) {
        // Coffee disc
        const r = Math.sqrt((i % 80) / 80) * 0.92;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = 0.82;
        localZ = Math.sin(theta) * r * 0.35;
      } else if (layerIdx === 3) {
        // Cup body
        const h = ((i % 80) / 80);
        const r = 0.65 + h * 0.40;
        const theta = (i * 2.39996) % (Math.PI * 2);
        localX = Math.cos(theta) * r;
        localY = -0.55 + h * 0.50;
        localZ = Math.sin(theta) * r * 0.35;
      } else {
        // Saucer
        const r = 0.60 + Math.sqrt((i % 80) / 80) * 1.35;
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
    // 1. PANORAMA DRUM (WebGL Cylinder with 4 Curved Photo Panels)
    // =========================================================================
    this.panoramaDrumGroup = new THREE.Group();
    // Center drum right of center so active photo faces viewer (~58vw x 62vh)
    this.panoramaDrumGroup.position.set(isMobile ? 0 : 1.35, 0, -5.5);
    const drumScale = isMobile ? 0.72 : 1.0;
    this.panoramaDrumGroup.scale.set(drumScale, drumScale, drumScale);
    this.panoramaDrumGroup.visible = false;
    this.scene.add(this.panoramaDrumGroup);

    const drumRadius = 5.8;
    const panelHeight = 3.35;
    const panelAngle = 1.08; // ~62 degree arc width (~58vw at 16:9)

    const texLoader = new THREE.TextureLoader();
    const photoUrls = [
      'assets/menu/drink-01-ember-espresso.jpg',
      'assets/menu/drink-02-cortado-noir.jpg',
      'assets/menu/drink-03-burnt-caramel-latte.jpg',
      'assets/menu/drink-05-ember-tonic.jpg'
    ];

    const drumVertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      uniform float uBend;
      void main() {
        vUv = uv;
        vec3 pos = position;
        // Velocity-driven subtle curvature bend
        pos.z += sin(uv.y * 3.14159) * uBend * 0.22;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const drumFragmentShader = `
      uniform sampler2D uTexture;
      uniform float uBrightness;
      uniform float uBlur;
      uniform float uRgbSplit;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        // Correct texture orientation for cylinder sector
        vec2 uv = vec2(1.0 - vUv.x, vUv.y);

        // Velocity-driven chromatic aberration (RGB split)
        float split = uRgbSplit * 0.007;

        vec4 col;
        if (uBlur > 0.02) {
          float b = uBlur * 0.005;
          vec4 c0 = texture2D(uTexture, uv);
          vec4 c1 = texture2D(uTexture, uv + vec2(b, b));
          vec4 c2 = texture2D(uTexture, uv + vec2(-b, b));
          vec4 c3 = texture2D(uTexture, uv + vec2(b, -b));
          vec4 c4 = texture2D(uTexture, uv + vec2(-b, -b));
          col = (c0 * 2.0 + c1 + c2 + c3 + c4) / 6.0;
        } else {
          float r = texture2D(uTexture, uv + vec2(split, 0.0)).r;
          float g = texture2D(uTexture, uv).g;
          float b = texture2D(uTexture, uv - vec2(split, 0.0)).b;
          col = vec4(r, g, b, 1.0);
        }

        // Warm Color Grade: Contrast, Warm Tint, Vignette, 4% Grain
        // Contrast
        vec3 graded = (col.rgb - 0.5) * 1.12 + 0.5;
        // Warm coffee tint (amber & crema glow)
        graded = mix(graded, graded * vec3(1.08, 1.01, 0.93) + vec3(0.032, 0.016, 0.004), 0.32);
        // Soft vignette
        vec2 vigUv = (uv - 0.5) * vec2(1.0, 1.15);
        float vig = smoothstep(0.85, 0.25, length(vigUv));
        graded *= mix(0.72, 1.0, vig);
        // 4% Subtle film grain
        float grain = (fract(sin(dot(uv * (uTime * 0.05 + 1.0), vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.04;
        graded += grain;

        // Brightness: active 1.0, neighbours 0.45 (never near-black!)
        graded *= uBrightness;

        gl_FragColor = vec4(clamp(graded, 0.0, 1.0), 1.0);
      }
    `;

    this.drumPanels = [];
    this.drumMaterials = [];

    // Panel geometry: cylindrical sector centered along +Z
    const panelGeo = new THREE.CylinderGeometry(drumRadius, drumRadius, panelHeight, 36, 1, true, -panelAngle / 2, panelAngle);

    for (let i = 0; i < 4; i++) {
      const tex = texLoader.load(photoUrls[i]);
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;

      const mat = new THREE.ShaderMaterial({
        vertexShader: drumVertexShader,
        fragmentShader: drumFragmentShader,
        uniforms: {
          uTexture: { value: tex },
          uBrightness: { value: i === 0 ? 1.0 : 0.45 },
          uBlur: { value: i === 0 ? 0.0 : 0.35 },
          uBend: { value: 0.0 },
          uRgbSplit: { value: 0.0 },
          uTime: { value: 0.0 }
        },
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const pivot = new THREE.Group();
      pivot.rotation.y = i * (Math.PI / 2);

      const panelMesh = new THREE.Mesh(panelGeo, mat);
      pivot.add(panelMesh);

      this.panoramaDrumGroup.add(pivot);
      this.drumPanels.push(pivot);
      this.drumMaterials.push(mat);
    }

    // =========================================================================
    // 2. VESSEL: REUSE HERO CUP MODEL (~35% Viewport Height, Floating Overlap)
    // =========================================================================
    this.menuVesselGroup = new THREE.Group();
    // Lower-left part of active photo overlapping its edge
    const vesselX = isMobile ? 0 : -0.55;
    const vesselY = isMobile ? 0.95 : -0.65;
    const vesselZ = isMobile ? 0.5 : 1.35;
    this.menuVesselGroup.position.set(vesselX, vesselY, vesselZ);
    const vesselScale = isMobile ? 0.55 : 0.88; // ~35% viewport height
    this.menuVesselGroup.scale.set(vesselScale, vesselScale, vesselScale);
    this.menuVesselGroup.rotation.set(0.18, -0.22, -0.04);
    this.menuVesselGroup.visible = false;
    this.scene.add(this.menuVesselGroup);
    // Backwards compatibility alias
    this.turntableGroup = this.menuVesselGroup;

    // Cup Lathe Geometry (Hero Cup Model)
    const cupPoints = [
      new THREE.Vector2(0.0, -0.65),
      new THREE.Vector2(0.55, -0.65),
      new THREE.Vector2(0.58, -0.58),
      new THREE.Vector2(0.68, -0.42),
      new THREE.Vector2(0.88, -0.15),
      new THREE.Vector2(1.10, 0.22),
      new THREE.Vector2(1.22, 0.62),
      new THREE.Vector2(1.25, 0.68),
      new THREE.Vector2(1.21, 0.68),
      new THREE.Vector2(1.15, 0.58),
      new THREE.Vector2(0.98, 0.20),
      new THREE.Vector2(0.72, -0.22),
      new THREE.Vector2(0.48, -0.45),
      new THREE.Vector2(0.0, -0.48)
    ];
    const cupGeo = new THREE.LatheGeometry(cupPoints, 48);
    cupGeo.computeVertexNormals();
    const menuCupMesh = new THREE.Mesh(cupGeo, this.cupGlazeMaterial);
    menuCupMesh.castShadow = true;
    this.menuVesselGroup.add(menuCupMesh);

    // Saucer Lathe Geometry (Hero Cup Model)
    const saucerPoints = [
      new THREE.Vector2(0.0, -0.88),
      new THREE.Vector2(0.75, -0.88),
      new THREE.Vector2(0.82, -0.84),
      new THREE.Vector2(1.45, -0.76),
      new THREE.Vector2(2.15, -0.58),
      new THREE.Vector2(2.26, -0.54),
      new THREE.Vector2(2.23, -0.58),
      new THREE.Vector2(1.40, -0.82),
      new THREE.Vector2(0.75, -0.92),
      new THREE.Vector2(0.0, -0.92)
    ];
    const saucerGeo = new THREE.LatheGeometry(saucerPoints, 48);
    saucerGeo.computeVertexNormals();
    const menuSaucerMesh = new THREE.Mesh(saucerGeo, this.saucerGlazeMaterial);
    this.menuVesselGroup.add(menuSaucerMesh);

    // Saucer Rim Highlight
    const rimGeo = new THREE.TorusGeometry(2.24, 0.016, 12, 64);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xc89255,
      roughness: 0.28,
      metalness: 0.35,
      transparent: true,
      opacity: 0.50
    });
    const menuRimMesh = new THREE.Mesh(rimGeo, rimMat);
    menuRimMesh.position.y = -0.54;
    this.menuVesselGroup.add(menuRimMesh);

    // Contact Shadow below saucer
    const shadowGeo = new THREE.RingGeometry(0.2, 0.85, 32);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a0502,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const menuShadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    menuShadowMesh.position.y = -0.89;
    this.menuVesselGroup.add(menuShadowMesh);

    // Ergonomic Handle (Hero Cup Model)
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(1.18, 0.48, 0),
      new THREE.Vector3(1.72, 0.38, 0),
      new THREE.Vector3(1.82, 0.08, 0),
      new THREE.Vector3(1.52, -0.16, 0),
      new THREE.Vector3(0.88, -0.25, 0)
    ]);
    const handleGeo = new THREE.TubeGeometry(handleCurve, 32, 0.082, 12, false);
    const menuHandleMesh = new THREE.Mesh(handleGeo, this.cupGlazeMaterial);
    menuCupMesh.add(menuHandleMesh);

    // Liquid Surface Disc inside cup
    const liquidGeo = new THREE.CircleGeometry(1.14, 36);
    liquidGeo.rotateX(-Math.PI / 2);
    this.menuLiquidMat = new THREE.MeshStandardMaterial({
      color: 0x2A1208,
      roughness: 0.22,
      metalness: 0.15
    });
    this.menuLiquidMesh = new THREE.Mesh(liquidGeo, this.menuLiquidMat);
    this.menuLiquidMesh.position.y = 0.52;
    this.menuVesselGroup.add(this.menuLiquidMesh);

    // =========================================================================
    // 3. THE 4 DRINK ACCENTS
    // =========================================================================
    // Accent 0: 01 Ember Espresso - Fine Steam
    this.menuAccent0Steam = new THREE.Group();
    const steamGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xECE1CE, transparent: true, opacity: 0.28 });
    this.espressoSteam = new THREE.InstancedMesh(steamGeo, steamMat, 16);
    this.espressoSteamData = [];
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      this.espressoSteamData.push({
        x: (Math.random() - 0.5) * 0.45,
        y: 0.55 + i * 0.08,
        z: (Math.random() - 0.5) * 0.45,
        speed: 0.25 + Math.random() * 0.22
      });
      dummy.position.set(0, -10, 0);
      dummy.updateMatrix();
      this.espressoSteam.setMatrixAt(i, dummy.matrix);
    }
    this.espressoSteam.instanceMatrix.needsUpdate = true;
    this.menuAccent0Steam.add(this.espressoSteam);
    this.menuVesselGroup.add(this.menuAccent0Steam);

    // Accent 1: 02 Cortado Noir - Animated Latte-Art Swirl on top
    this.menuAccent1Swirl = new THREE.Group();
    const swirlCanvas = document.createElement('canvas');
    swirlCanvas.width = 512;
    swirlCanvas.height = 512;
    const sCtx = swirlCanvas.getContext('2d');
    const sGrad = sCtx.createRadialGradient(256, 256, 15, 256, 256, 250);
    sGrad.addColorStop(0, '#2A1208');
    sGrad.addColorStop(0.35, '#8A5A35');
    sGrad.addColorStop(0.68, '#E8DAC8');
    sGrad.addColorStop(1, '#8A5A35');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 512, 512);
    sCtx.strokeStyle = '#2A1208';
    sCtx.lineWidth = 10;
    sCtx.beginPath();
    sCtx.arc(256, 256, 140, 0.2, Math.PI - 0.2);
    sCtx.stroke();
    sCtx.beginPath();
    sCtx.arc(256, 256, 80, Math.PI + 0.2, Math.PI * 2 - 0.2);
    sCtx.stroke();
    const swirlTex = new THREE.CanvasTexture(swirlCanvas);
    const swirlGeo = new THREE.CircleGeometry(1.08, 36);
    swirlGeo.rotateX(-Math.PI / 2);
    const swirlMat = new THREE.MeshStandardMaterial({ map: swirlTex, roughness: 0.35, metalness: 0.1 });
    this.cortadoSwirlMesh = new THREE.Mesh(swirlGeo, swirlMat);
    this.cortadoSwirlMesh.position.y = 0.53;
    this.menuAccent1Swirl.add(this.cortadoSwirlMesh);
    this.menuAccent1Swirl.visible = false;
    this.menuVesselGroup.add(this.menuAccent1Swirl);

    // Accent 2: 03 Burnt Caramel Latte - Caramel Ribbon spiralling + Sugar Crystals
    this.menuAccent2Caramel = new THREE.Group();
    const ribbonPts = [];
    for (let t = 0; t <= 1; t += 0.04) {
      const angle = t * Math.PI * 4.5;
      const r = 0.08 + t * 0.65;
      const y = 1.6 * (1.0 - t) + 0.52;
      ribbonPts.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    const ribbonCurve = new THREE.CatmullRomCurve3(ribbonPts);
    const ribbonGeo = new THREE.TubeGeometry(ribbonCurve, 40, 0.042, 8, false);
    const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xC68A52, roughness: 0.22, metalness: 0.15 });
    this.caramelRibbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
    this.menuAccent2Caramel.add(this.caramelRibbonMesh);

    const crystalGeo = new THREE.TetrahedronGeometry(0.045);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xFFD49A, roughness: 0.15, metalness: 0.3 });
    this.sugarCrystals = new THREE.InstancedMesh(crystalGeo, crystalMat, 24);
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + (i % 3) * 0.4;
      const rad = 0.22 + Math.random() * 0.65;
      dummy.position.set(Math.cos(ang) * rad, 0.53 + Math.random() * 0.03, Math.sin(ang) * rad);
      dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this.sugarCrystals.setMatrixAt(i, dummy.matrix);
    }
    this.sugarCrystals.instanceMatrix.needsUpdate = true;
    this.menuAccent2Caramel.add(this.sugarCrystals);
    this.menuAccent2Caramel.visible = false;
    this.menuVesselGroup.add(this.menuAccent2Caramel);

    // Accent 3: 04 Ember Tonic - Rising Bubbles + Orange-Peel Twist
    this.menuAccent3Tonic = new THREE.Group();
    const bblGeo = new THREE.SphereGeometry(0.024, 6, 6);
    const bblMat = new THREE.MeshBasicMaterial({ color: 0xFFF2E6, transparent: true, opacity: 0.65 });
    this.tonicBubbles = new THREE.InstancedMesh(bblGeo, bblMat, 80);
    this.tonicBubbleData = [];
    for (let i = 0; i < 80; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.85;
      this.tonicBubbleData.push({
        x: Math.cos(ang) * r,
        y: 0.1 + Math.random() * 0.42,
        z: Math.sin(ang) * r,
        speed: 0.35 + Math.random() * 0.38,
        phase: Math.random() * Math.PI * 2
      });
      dummy.position.set(0, -10, 0);
      dummy.updateMatrix();
      this.tonicBubbles.setMatrixAt(i, dummy.matrix);
    }
    this.tonicBubbles.instanceMatrix.needsUpdate = true;
    this.menuAccent3Tonic.add(this.tonicBubbles);

    // Orange peel twist tube curving over the cup rim
    const twistPts = [];
    for (let t = 0; t <= 1; t += 0.05) {
      const ang = -0.6 + t * 2.2;
      const r = 1.18 + Math.sin(t * Math.PI) * 0.12;
      const y = 0.52 + Math.sin(t * Math.PI * 1.5) * 0.32;
      twistPts.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
    }
    const twistCurve = new THREE.CatmullRomCurve3(twistPts);
    const twistGeo = new THREE.TubeGeometry(twistCurve, 32, 0.052, 8, false);
    const twistMat = new THREE.MeshStandardMaterial({ color: 0xEE7A1B, roughness: 0.35, metalness: 0.1 });
    this.orangePeelMesh = new THREE.Mesh(twistGeo, twistMat);
    this.menuAccent3Tonic.add(this.orangePeelMesh);
    this.menuAccent3Tonic.visible = false;
    this.menuVesselGroup.add(this.menuAccent3Tonic);
  }

  createFinaleObjects() {
    this.finaleGroup = new THREE.Group();
    this.finaleGroup.visible = false;
    this.scene.add(this.finaleGroup);

    // 1. Tumbling Fresnel Ice Cubes (7 rounded cubes)
    this.finaleIceCubes = [];
    const iceGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32, 2, 2, 2);
    const iceMat = new THREE.ShaderMaterial({
      uniforms: {
        uFresnelColor: { value: new THREE.Color(0xddeeff) },
        uCoreColor: { value: new THREE.Color(0x88b0d4) }
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
        uniform vec3 uFresnelColor;
        uniform vec3 uCoreColor;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.2);
          vec3 col = mix(uCoreColor, uFresnelColor, fresnel);
          float alpha = mix(0.35, 0.85, fresnel);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const cubeConfigs = [
      { x: -1.75, y: -0.06, z: 0.22, scale: 0.32, rx: 0.8, ry: 1.1, rz: 0.5 },
      { x: -2.25, y: -0.16, z: -0.18, scale: 0.36, rx: 1.2, ry: 0.7, rz: 0.9 },
      { x: -1.35, y: -0.22, z: 0.12, scale: 0.28, rx: 0.6, ry: 1.3, rz: 0.4 },
      { x: 1.55, y: -0.05, z: -0.20, scale: 0.34, rx: 1.0, ry: 0.9, rz: 1.2 },
      { x: 2.15, y: -0.15, z: 0.24, scale: 0.35, rx: 0.7, ry: 1.4, rz: 0.6 },
      { x: 1.35, y: -0.22, z: -0.12, scale: 0.26, rx: 1.1, ry: 0.6, rz: 0.8 },
      { x: 2.45, y: -0.04, z: 0.15, scale: 0.30, rx: 0.9, ry: 1.0, rz: 1.1 }
    ];

    cubeConfigs.forEach(cfg => {
      const mesh = new THREE.Mesh(iceGeo, iceMat);
      mesh.scale.set(cfg.scale, cfg.scale, cfg.scale);
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      this.finaleGroup.add(mesh);
      this.finaleIceCubes.push({
        mesh,
        cfg,
        rotSpeed: new THREE.Vector3(cfg.rx, cfg.ry, cfg.rz)
      });
    });

    // 2. Coffee Splash Crown of 60 Instanced Droplets
    this.splashCount = 60;
    const splashGeo = new THREE.SphereGeometry(0.042, 8, 8);
    const splashMat = new THREE.MeshStandardMaterial({
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.92
    });
    this.splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, this.splashCount);
    this.splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    this.splashData = [];
    const colEspresso = new THREE.Color(0x2A1208);
    const colEmber = new THREE.Color(0xE0541F);

    for (let i = 0; i < this.splashCount; i++) {
      const isEmber = (i % 3 === 0);
      this.splashMesh.setColorAt(i, isEmber ? colEmber : colEspresso);

      const angle = (i / this.splashCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speedR = 0.35 + Math.random() * 0.40;
      const speedY = 0.80 + Math.random() * 0.45;
      const phase = (i / this.splashCount) * 1.4;
      const period = 1.2 + Math.random() * 0.3;

      this.splashData.push({
        angle,
        speedR,
        speedY,
        phase,
        period,
        baseScale: 0.7 + Math.random() * 0.6
      });
    }
    if (this.splashMesh.instanceColor) this.splashMesh.instanceColor.needsUpdate = true;
    this.finaleGroup.add(this.splashMesh);

    // 3. Floating / Tumbling Beans (6 beans)
    this.finaleBeans = [];
    if (this.beanMesh) {
      const beanGeo = this.beanMesh.geometry;
      const beanMat = this.beanMesh.material;
      for (let i = 0; i < 6; i++) {
        const bMesh = new THREE.Mesh(beanGeo, beanMat);
        const rad = 1.5 + Math.random() * 0.9;
        const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
        bMesh.scale.set(0.08, 0.08, 0.08);
        this.finaleGroup.add(bMesh);
        this.finaleBeans.push({
          mesh: bMesh,
          rad,
          angle,
          speed: 0.35 + Math.random() * 0.25,
          rotSpeed: new THREE.Vector3(Math.random() * 2, Math.random() * 2, Math.random() * 2),
          z: (Math.random() - 0.5) * 0.4
        });
      }
    }

    // 4. Ember Ripple Ring expanding every 3 seconds
    const ringGeo = new THREE.RingGeometry(0.08, 0.12, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xE0541F,
      transparent: true,
      opacity: 0.8,
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

    const isMobile = window.innerWidth <= 768;
    const baseScale = isMobile ? 0.55 : 0.88;
    const targetX = isMobile ? 0 : -0.55;
    const targetY = isMobile ? 0.95 : -0.65;
    const targetZ = isMobile ? 0.5 : 1.35;

    // Menu Vessel floating and exit transition
    if (this.menuVesselGroup) {
      this.menuVesselGroup.visible = true;
      if (progress >= 0.92) {
        // Exit transition: vessel shrinks and rises into Process green bean
        const tExit = (progress - 0.92) / 0.08;
        const curScale = THREE.MathUtils.lerp(baseScale, 0.16, tExit);
        const curY = THREE.MathUtils.lerp(targetY, 0.85, tExit);
        this.menuVesselGroup.scale.set(curScale, curScale, curScale);
        this.menuVesselGroup.position.set(targetX, curY, targetZ);
        this.menuVesselGroup.rotation.x = THREE.MathUtils.lerp(0.18, 0.45, tExit);
      } else {
        const bobY = targetY + Math.sin(progress * Math.PI * 4) * 0.025;
        this.menuVesselGroup.position.set(targetX, bobY, targetZ);
        this.menuVesselGroup.scale.set(baseScale, baseScale, baseScale);
        this.menuVesselGroup.rotation.x = 0.18;
      }
    }

    // Panorama Drum visibility & scroll tracking
    if (this.panoramaDrumGroup) {
      this.panoramaDrumGroup.visible = progress < 0.98;

      // Scroll scrub rotates drum smoothly
      const scrollDrumAngle = - (progress * 3.0) * (Math.PI / 2);
      this.panoramaDrumGroup.rotation.y = scrollDrumAngle;

      // Velocity-driven bend and chromatic aberration
      const vel = Math.abs(this.scrub.velocity || 0);
      const bendVal = Math.min(1.0, vel * 0.12);
      const splitVal = Math.min(1.0, vel * 0.08);

      if (this.drumMaterials) {
        this.drumMaterials.forEach(m => {
          m.uniforms.uBend.value = bendVal;
          m.uniforms.uRgbSplit.value = splitVal;
        });
      }

      if (progress >= 0.92) {
        const tExit = (progress - 0.92) / 0.08;
        this.panoramaDrumGroup.position.z = THREE.MathUtils.lerp(-5.5, -9.0, tExit);
      } else {
        this.panoramaDrumGroup.position.z = -5.5;
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

    const drinkColors = [
      '#2A1208', // 01 Ember Espresso
      '#8A5A35', // 02 Cortado Noir
      '#C68A52', // 03 Burnt Caramel Latte
      '#D9822B'  // 04 Ember Tonic
    ];
    const hex = drinkColors[index] || '#2A1208';
    const targetCol = new THREE.Color(hex);

    if (this.scrub.sectionMode !== 'menu') {
      this.setMenuScrub(0);
    }

    // 1. Vessel 360° spin on Y
    if (this.menuVesselGroup) {
      gsap.to(this.menuVesselGroup.rotation, {
        y: this.menuVesselGroup.rotation.y + Math.PI * 2,
        duration: 0.85,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }

    // 2. Liquid color tween
    if (this.menuLiquidMat) {
      gsap.to(this.menuLiquidMat.color, {
        r: targetCol.r,
        g: targetCol.g,
        b: targetCol.b,
        duration: 0.65,
        ease: 'power2.out'
      });
    }

    // 3. Toggles the 4 accents
    if (this.menuAccent0Steam) this.menuAccent0Steam.visible = (index === 0);
    if (this.menuAccent1Swirl) this.menuAccent1Swirl.visible = (index === 1);
    if (this.menuAccent2Caramel) this.menuAccent2Caramel.visible = (index === 2);
    if (this.menuAccent3Tonic) this.menuAccent3Tonic.visible = (index === 3);

    // 4. Drum cylinder rotation to active drink angle
    if (this.panoramaDrumGroup) {
      const targetDrumAngle = - index * (Math.PI / 2);
      gsap.to(this.panoramaDrumGroup.rotation, {
        y: targetDrumAngle,
        duration: 0.85,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }

    // 5. Drum panels brightness & blur: active 1.0/0.0, neighbours 0.45/0.35
    if (this.drumMaterials && this.drumMaterials.length === 4) {
      this.drumMaterials.forEach((mat, j) => {
        const isActive = (j === index);
        gsap.to(mat.uniforms.uBrightness, {
          value: isActive ? 1.0 : 0.45,
          duration: 0.55,
          ease: 'power2.out'
        });
        gsap.to(mat.uniforms.uBlur, {
          value: isActive ? 0.0 : 0.35,
          duration: 0.55,
          ease: 'power2.out'
        });
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
    if (this.finaleGroup) this.finaleGroup.visible = false;
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

    // Assemble cup
    if (this.saucerMesh) this.saucerMesh.position.y = 0;
    if (this.cupMesh) this.cupMesh.position.y = 0;
    if (this.coffeeMesh) this.coffeeMesh.visible = false;
    if (this.foamMesh) this.foamMesh.visible = false;
    if (this.spoonMesh) this.spoonMesh.visible = false;
    if (this.liquidMesh) this.liquidMesh.visible = true;

    if (!this.cupGroup) return;
    this.cupGroup.visible = true;
    if (this.finaleGroup) this.finaleGroup.visible = true;

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

    this._finaleTargetX = targetWorldX;
    this._finaleTargetY = targetWorldY;

    // Shrinks (scrub) from ~0.28 down to ~0.052 (perfect fit inside 48px target circle!)
    const p = Math.max(0, Math.min(progress, 1.0));
    const startX = targetWorldX;
    const startY = targetWorldY + 0.20;
    const startScale = 0.28;
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

        // Panorama drum shader uTime update
        if (this.drumMaterials) {
          this.drumMaterials.forEach(m => {
            m.uniforms.uTime.value = elapsed;
          });
        }

        const activeIdx = this.activeDrinkIndex || 0;

        // Drink 0: 01 Ember Espresso Steam animation
        if (activeIdx === 0 && this.espressoSteam && this.espressoSteamData) {
          const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
          for (let i = 0; i < this.espressoSteamData.length; i++) {
            const s = this.espressoSteamData[i];
            s.y += s.speed * deltaSec;
            s.x += Math.sin(elapsed * 2.5 + i) * 0.006;
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

        // Drink 1: 02 Cortado Noir swirl disc rotation
        if (activeIdx === 1 && this.cortadoSwirlMesh) {
          this.cortadoSwirlMesh.rotation.z += deltaSec * 0.35;
        }

        // Drink 2: 03 Burnt Caramel Latte ribbon gentle rotation
        if (activeIdx === 2 && this.caramelRibbonMesh) {
          this.caramelRibbonMesh.rotation.y += deltaSec * 0.22;
        }

        // Drink 3: 04 Ember Tonic bubbles rising & orange twist
        if (activeIdx === 3) {
          if (this.tonicBubbles && this.tonicBubbleData) {
            const dummy = this._reusableDummy || (this._reusableDummy = new THREE.Object3D());
            for (let i = 0; i < this.tonicBubbleData.length; i++) {
              const b = this.tonicBubbleData[i];
              b.y += b.speed * deltaSec;
              b.x += Math.sin(elapsed * 4.0 + b.phase) * 0.003;
              if (b.y > 0.52) {
                b.y = 0.1;
              }
              dummy.position.set(b.x, b.y, b.z);
              dummy.scale.set(1, 1, 1);
              dummy.updateMatrix();
              this.tonicBubbles.setMatrixAt(i, dummy.matrix);
            }
            this.tonicBubbles.instanceMatrix.needsUpdate = true;
          }
          if (this.orangePeelMesh) {
            this.orangePeelMesh.rotation.y += deltaSec * 0.15;
          }
        }
      } else if (this.scrub.sectionMode === 'process' && this.processBeanMesh && this.processBeanMesh.visible) {
        this.processBeanMesh.rotation.y += delta * 0.40;
        this.processBeanMesh.rotation.x = 0.15 + Math.sin(elapsedTime * 0.6) * 0.08;
      } else if (this.scrub.sectionMode === 'finale' && this.cupGroup) {
        this.cupGroup.rotation.y += delta * 0.75;

        // Finale Group Animation
        if (this.finaleGroup && this.finaleGroup.visible) {
          // 1. Tumbling Ice Cubes
          this.finaleIceCubes.forEach(item => {
            item.mesh.rotation.x += item.rotSpeed.x * delta;
            item.mesh.rotation.y += item.rotSpeed.y * delta;
            item.mesh.rotation.z += item.rotSpeed.z * delta;
            item.mesh.position.y = item.cfg.y + Math.sin(elapsedTime * 1.5 + item.cfg.x) * 0.04;
          });

          // 2. Floating Beans
          this.finaleBeans.forEach(b => {
            b.mesh.rotation.x += b.rotSpeed.x * delta;
            b.mesh.rotation.y += b.rotSpeed.y * delta;
            b.angle += b.speed * delta;
            b.mesh.position.set(
              Math.cos(b.angle) * b.rad,
              Math.sin(b.angle) * (b.rad * 0.6) + Math.sin(elapsedTime * 1.8 + b.angle) * 0.06,
              b.z
            );
          });

          // 3. Coffee Splash Crown of 60 Instanced Droplets
          const g = 3.8;
          const burst = this.splashBurst;
          const dummy = this._reusableDummy;

          for (let i = 0; i < this.splashCount; i++) {
            const d = this.splashData[i];
            const t = (elapsedTime + d.phase) % d.period;

            // Arcing parabola: y = vy * t - 0.5 * g * t^2
            const vy = d.speedY * burst;
            const h = vy * t - 0.5 * g * t * t;
            const r = d.speedR * burst * t;

            if (h >= -0.05) {
              const x = Math.cos(d.angle) * r;
              const z = Math.sin(d.angle) * r * 0.5;
              const y = h;
              const scale = Math.max(0.001, d.baseScale * (1.0 - (t / d.period) * 0.4));
              dummy.position.set(x, y, z);
              dummy.scale.set(scale, scale, scale);
              dummy.updateMatrix();
            } else {
              dummy.scale.set(0, 0, 0);
              dummy.updateMatrix();
            }
            this.splashMesh.setMatrixAt(i, dummy.matrix);
          }
          this.splashMesh.instanceMatrix.needsUpdate = true;

          // Settle burst back to 1.0
          this.splashBurst = THREE.MathUtils.lerp(this.splashBurst, 1.0, delta * 3.2);

          // 4. Ember Ripple Ring expanding every 3 seconds
          if (this.finaleRippleRing) {
            const tRipple = (elapsedTime % 3.0) / 3.0;
            const ringScale = THREE.MathUtils.lerp(0.2, 2.6, tRipple);
            const ringOpacity = Math.max(0, (1.0 - tRipple) * 0.85);
            this.finaleRippleRing.scale.set(ringScale, ringScale, ringScale);
            this.finaleRippleRing.material.opacity = ringOpacity;
          }

          // 5. Mouse Parallax on finaleGroup
          const targetParallaxX = this.mouse.x * 0.35;
          const targetParallaxY = this.mouse.y * 0.22;
          this.finaleGroup.position.x = THREE.MathUtils.lerp(this.finaleGroup.position.x, (this._finaleTargetX || 0) + targetParallaxX, 0.08);
          this.finaleGroup.position.y = THREE.MathUtils.lerp(this.finaleGroup.position.y, (this._finaleTargetY || 0) + targetParallaxY, 0.08);
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
