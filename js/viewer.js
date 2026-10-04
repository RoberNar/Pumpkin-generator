/* =========================================================
 *  AutoCalabazas · Visor 3D (three.js r147, script clásico)
 * ========================================================= */
(function () {
  'use strict';
  const { DIRS } = window.PumpkinGen;

  let noiseTex = null;
  function getNoiseTexture() {
    if (noiseTex) return noiseTex;
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const g = c.getContext('2d');
    const r = window.PumpkinGen.mulberry32(1337);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let v = 205 + Math.floor(r() * 50);
        if (x === 0 || y === 0 || x === 15 || y === 15) v -= 25;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x, y, 1, 1);
      }
    noiseTex = new THREE.CanvasTexture(c);
    noiseTex.magFilter = THREE.NearestFilter;
    noiseTex.minFilter = THREE.NearestFilter;
    return noiseTex;
  }

  function partsFor(code, i, j, k) {
    if (code === 1 || code === 2 || code === 5 || code === 6) return [[i + 0.5, j + 0.5, k + 0.5, 1, 1, 1]];
    if (code === 3 || code === 7) return [[i + 0.5, j + 0.25, k + 0.5, 1, 0.5, 1]];
    if (code === 4) return [[i + 0.5, j + 0.75, k + 0.5, 1, 0.5, 1]];
    if (code >= 10) {
      const base = code >= 20 ? 20 : 10;
      const d = Math.floor((code - base) / 2), h = (code - base) % 2;
      const o = DIRS[d];
      const slabY = h ? j + 0.75 : j + 0.25;
      const qY = h ? j + 0.25 : j + 0.75;
      return [
        [i + 0.5, slabY, k + 0.5, 1, 0.5, 1],
        [i + 0.5 + o.dx * 0.25, qY, k + 0.5 + o.dz * 0.25, o.dx ? 0.5 : 1, 0.5, o.dz ? 0.5 : 1],
      ];
    }
    return [];
  }

  function hash3(i, j, k) {
    let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function buildMesh(model, colorFor) {
    const parts = [];
    for (const [i, j, k, c] of model.blocks)
      for (const pt of partsFor(c, i, j, k)) parts.push([pt, c, i, j, k]);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ map: getNoiseTexture() });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, parts.length));
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
    parts.forEach(([pt, c, i, j, k], n) => {
      p.set(pt[0] - model.ci - 0.5, pt[1], pt[2] - model.ck - 0.5);
      s.set(pt[3], pt[4], pt[5]);
      m.compose(p, q, s);
      mesh.setMatrixAt(n, m);
      col.copy(colorFor(c));
      col.multiplyScalar(0.9 + hash3(i, j, k) * 0.18);
      mesh.setColorAt(n, col);
    });
    mesh.count = parts.length;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  function addLights(scene, shadowSize) {
    scene.add(new THREE.HemisphereLight(0xffe2c4, 0x3b2560, 0.75));
    const dir = new THREE.DirectionalLight(0xfff1e0, 0.85);
    dir.position.set(14, 26, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = dir.shadow.camera;
    sc.left = sc.bottom = -36; sc.right = sc.top = 36; sc.near = 1; sc.far = 90;
    dir.shadow.bias = -0.0008;
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xb48cff, 0.35);
    rim.position.set(-16, 10, -14);
    scene.add(rim);
  }

  function disposeMesh(mesh) {
    if (!mesh) return;
    mesh.geometry.dispose();
    mesh.material.dispose();
    mesh.parent && mesh.parent.remove(mesh);
  }

  // ---------------- Visor principal ----------------
  class MainViewer {
    constructor(container) {
      this.container = container;
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0x140b24, 60, 140);
      this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
      addLights(this.scene, 2048);

      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(80, 64),
        new THREE.MeshLambertMaterial({ color: 0x2c1748 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);
      const grid = new THREE.GridHelper(160, 160, 0x4a2b75, 0x351d57);
      grid.position.y = 0.002;
      grid.material.transparent = true;
      grid.material.opacity = 0.55;
      this.scene.add(grid);

      this.theta = 0.75; this.phi = 1.08; this.radius = 30;
      this.target = new THREE.Vector3(0, 5, 0);
      this.autoRotate = true;
      this.mesh = null;
      this._bindControls();

      new ResizeObserver(() => this._resize()).observe(container);
      this._resize();
      const loop = () => {
        if (this.autoRotate && !this._drag) this.theta += 0.0035;
        this._updateCamera();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(loop);
      };
      loop();
    }

    _bindControls() {
      const el = this.renderer.domElement;
      el.addEventListener('pointerdown', (e) => {
        this._drag = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', (e) => {
        if (!this._drag) return;
        this.theta -= (e.clientX - this._drag.x) * 0.008;
        this.phi = Math.min(1.5, Math.max(0.15, this.phi - (e.clientY - this._drag.y) * 0.008));
        this._drag = { x: e.clientX, y: e.clientY };
      });
      const end = () => (this._drag = null);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.radius = Math.min(160, Math.max(4, this.radius * (1 + Math.sign(e.deltaY) * 0.1)));
      }, { passive: false });
    }

    _resize() {
      const w = this.container.clientWidth, h = this.container.clientHeight;
      if (!w || !h) return;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    _updateCamera() {
      const { theta, phi, radius, target } = this;
      this.camera.position.set(
        target.x + radius * Math.sin(phi) * Math.cos(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.sin(theta)
      );
      this.camera.lookAt(target);
    }

    show(model, colorFor, refit) {
      disposeMesh(this.mesh);
      this.mesh = buildMesh(model, colorFor);
      this.scene.add(this.mesh);
      if (refit) this.fit(model);
    }

    fit(model) {
      const size = Math.max(model.W, model.maxY, model.D);
      this.radius = size * 2.4 + 6;
      this.target.set(0, model.maxY * 0.45, 0);
    }
  }

  // ---------------- Miniaturas ----------------
  let thumb = null;
  function renderThumb(model, colorFor) {
    if (!thumb) {
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(260, 260);
      renderer.shadowMap.enabled = true;
      const scene = new THREE.Scene();
      addLights(scene, 1024);
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.35 }));
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 500);
      thumb = { renderer, scene, camera };
    }
    const mesh = buildMesh(model, colorFor);
    thumb.scene.add(mesh);
    const size = Math.max(model.W, model.maxY, model.D);
    const r = size * 2.2 + 3, th = 0.8, ph = 1.12;
    const ty = model.maxY * 0.45;
    thumb.camera.position.set(r * Math.sin(ph) * Math.cos(th), ty + r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
    thumb.camera.lookAt(0, ty, 0);
    thumb.renderer.render(thumb.scene, thumb.camera);
    const url = thumb.renderer.domElement.toDataURL('image/png');
    disposeMesh(mesh);
    return url;
  }

  window.PumpkinViewer = { MainViewer, renderThumb };
})();
