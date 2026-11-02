// Three.js system map for the hero. Loaded lazily (dynamic import) so three.js
// never blocks first paint. Nodes mirror the Playground's architecture explorer.

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { archEdges, archNodes, type ArchNodeId } from '../../content/lab'

const POSITIONS: Record<ArchNodeId, [number, number, number]> = {
  client: [-3.3, 0.15, 0.4],
  api: [-1.25, 0, 0],
  auth: [-1.35, 1.7, -0.8],
  cache: [0.85, 1.55, -0.7],
  queue: [0.85, 0.05, 0.75],
  ai: [0.85, -1.5, -0.2],
  worker: [2.95, 0.75, 0.15],
  db: [3.05, -1.1, -0.55],
}

const FLOWS: string[][] = [
  ['client-api', 'api-auth'],
  ['client-api', 'api-queue', 'queue-worker', 'worker-db'],
  ['client-api', 'api-cache'],
  ['client-api', 'api-ai', 'ai-db'],
  ['client-api', 'api-db'],
]

// Tuned for a light stage: gunmetal nodes, slate edges, blue/violet signals.
const BLUE = new THREE.Color('#2563eb')
const VIOLET = new THREE.Color('#7c3aed')
const EDGE = new THREE.Color('#64748b')

export interface SceneHandle {
  dispose: () => void
}

export function mountScene(
  host: HTMLElement,
  labels: HTMLElement,
  { onReady, onDegrade }: { onReady: () => void; onDegrade: () => void },
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  const small = host.clientWidth < 640
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.style.display = 'block'
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTexture

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.6, 12)
  camera.lookAt(0, -0.05, 0)

  const key = new THREE.DirectionalLight('#ffffff', 1.4)
  key.position.set(4, 6, 6)
  scene.add(key, new THREE.AmbientLight('#ffffff', 0.7))

  const group = new THREE.Group()
  scene.add(group)

  const disposables: { dispose: () => void }[] = [envTexture, pmrem, renderer]

  // Soft glow texture shared by node halos and pulses (additive sprites are cheap).
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 64
  const g = glowCanvas.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const glowTexture = new THREE.CanvasTexture(glowCanvas)
  disposables.push(glowTexture)

  // Nodes: polished metal cores inside clear-coated glass shells, with a halo
  const coreGeo = new THREE.IcosahedronGeometry(0.26, 4)
  const shellGeo = new THREE.SphereGeometry(0.46, 40, 40)
  disposables.push(coreGeo, shellGeo)
  const nodeMeshes = new Map<
    ArchNodeId,
    { core: THREE.Mesh; shell: THREE.Mesh; halo: THREE.Sprite; haloMat: THREE.SpriteMaterial; mat: THREE.MeshStandardMaterial }
  >()
  for (const node of archNodes) {
    const isAi = node.id === 'ai'
    const mat = new THREE.MeshStandardMaterial({
      color: isAi ? '#8b5cf6' : '#3b4a63',
      metalness: 0.85,
      roughness: 0.26,
      emissive: isAi ? VIOLET : new THREE.Color('#000000'),
      emissiveIntensity: isAi ? 0.25 : 0,
    })
    const core = new THREE.Mesh(coreGeo, mat)
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: isAi ? '#d9cfff' : '#e8ecff',
      metalness: 0,
      roughness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1.4,
      depthWrite: false,
    })
    const shell = new THREE.Mesh(shellGeo, shellMat)
    const haloMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: isAi ? VIOLET : BLUE,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const halo = new THREE.Sprite(haloMat)
    halo.scale.setScalar(1.6)
    const [x, y, z] = POSITIONS[node.id]
    core.position.set(x, y, z)
    shell.position.set(x, y, z)
    halo.position.set(x, y, z)
    core.userData.id = node.id
    group.add(halo, core, shell)
    disposables.push(mat, shellMat, haloMat)
    nodeMeshes.set(node.id, { core, shell, halo, haloMat, mat })
  }

  // Edges: gently arched tubes
  const curves = new Map<string, THREE.QuadraticBezierCurve3>()
  const edgeMats = new Map<string, THREE.MeshBasicMaterial>()
  for (const edge of archEdges) {
    const a = new THREE.Vector3(...POSITIONS[edge.from])
    const b = new THREE.Vector3(...POSITIONS[edge.to])
    const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.18, 0.35))
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
    curves.set(edge.id, curve)
    const geo = new THREE.TubeGeometry(curve, 48, 0.011, 6, false)
    const mat = new THREE.MeshBasicMaterial({ color: EDGE, transparent: true, opacity: 0.45 })
    group.add(new THREE.Mesh(geo, mat))
    edgeMats.set(edge.id, mat)
    disposables.push(geo, mat)
  }

  // Ground lattice for depth
  const grid = new THREE.GridHelper(16, 32, '#cbd5e1', '#e2e8f0')
  grid.position.y = -2.6
  const gridMat = grid.material as THREE.Material
  gridMat.transparent = true
  gridMat.opacity = 0.8
  group.add(grid)
  disposables.push(grid.geometry, gridMat)

  // Request pulses travelling along flows
  const pulseGeo = new THREE.SphereGeometry(0.055, 12, 12)
  disposables.push(pulseGeo)
  const pulses = FLOWS.map((flow, i) => {
    const mat = new THREE.MeshBasicMaterial({ color: flow.some((e) => e.includes('ai')) ? VIOLET : BLUE })
    const mesh = new THREE.Mesh(pulseGeo, mat)
    const glowMat = new THREE.SpriteMaterial({
      map: glowTexture,
      color: mat.color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const glow = new THREE.Sprite(glowMat)
    glow.scale.setScalar(0.5)
    mesh.add(glow)
    group.add(mesh)
    disposables.push(mat, glowMat)
    return { flow, mesh, offset: i * 1.7 }
  })

  // HTML labels projected from 3D positions
  const labelEls = new Map<ArchNodeId, HTMLElement>()
  for (const node of archNodes) {
    const el = document.createElement('div')
    el.className = 'scene-label'
    el.innerHTML = `<span class="scene-label__name"></span><span class="scene-label__tech"></span>`
    el.children[0]!.textContent = node.label
    el.children[1]!.textContent = node.technologies.slice(0, 2).join(' · ')
    if (node.id === 'ai') el.dataset.ai = 'true'
    labels.appendChild(el)
    labelEls.set(node.id, el)
  }

  // Pointer interaction: gentle parallax + hover highlight
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2(9, 9)
  let hovered: ArchNodeId | null = null
  const onMove = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    pointer.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1
    ndc.set(pointer.tx, -pointer.ty)
  }
  const onLeave = () => {
    pointer.tx = 0
    pointer.ty = 0
    ndc.set(9, 9)
  }
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)

  const resize = () => {
    const w = host.clientWidth
    const h = host.clientHeight
    renderer.setSize(w, h, false)
    renderer.domElement.style.width = `${w}px`
    renderer.domElement.style.height = `${h}px`
    camera.aspect = w / h
    // Fit ~8.6 world units of width (nodes + labels) regardless of aspect ratio.
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    camera.position.z = Math.max(10, 4.3 / (Math.tan(halfFov) * camera.aspect))
    camera.updateProjectionMatrix()
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  const tmp = new THREE.Vector3()
  const clock = new THREE.Clock()
  let raf = 0
  let running = false
  let visible = true

  const frame = () => {
    const t = clock.getElapsedTime()
    pointer.x += (pointer.tx - pointer.x) * 0.05
    pointer.y += (pointer.ty - pointer.y) * 0.05
    group.rotation.y = -0.32 + pointer.x * 0.28 + Math.sin(t * 0.15) * 0.06
    group.rotation.x = 0.1 + pointer.y * 0.1

    // Hover
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects([...nodeMeshes.values()].map((n) => n.core))[0]
    const nextHover = (hit?.object.userData.id as ArchNodeId | undefined) ?? null
    if (nextHover !== hovered) {
      hovered = nextHover
      host.style.cursor = hovered ? 'pointer' : ''
      for (const [id, n] of nodeMeshes) {
        const on = id === hovered
        n.mat.emissive = on ? BLUE : id === 'ai' ? VIOLET : new THREE.Color('#000000')
        n.mat.emissiveIntensity = on ? 0.6 : id === 'ai' ? 0.25 : 0
        labelEls.get(id)!.dataset.active = on ? 'true' : 'false'
      }
      for (const edge of archEdges) {
        const on = hovered !== null && (edge.from === hovered || edge.to === hovered)
        edgeMats.get(edge.id)!.opacity = on ? 0.95 : 0.45
        edgeMats.get(edge.id)!.color.copy(on ? BLUE : EDGE)
      }
    }

    for (const [id, n] of nodeMeshes) {
      n.core.rotation.y = t * 0.35
      const target = id === hovered ? 0.55 : 0.16 + Math.sin(t * 1.4 + n.core.position.x) * 0.04
      n.haloMat.opacity += (target - n.haloMat.opacity) * 0.12
    }

    // Pulses: walk each flow edge by edge
    for (const p of pulses) {
      const total = p.flow.length
      const progress = ((t * 0.55 + p.offset) % (total + 1.2)) - 0.6
      const idx = Math.floor(progress)
      const curve = idx >= 0 && idx < total ? curves.get(p.flow[idx]!) : undefined
      p.mesh.visible = !!curve
      if (curve) p.mesh.position.copy(curve.getPoint(progress - idx))
    }

    renderer.render(scene, camera)

    // Labels
    const w = host.clientWidth
    const h = host.clientHeight
    for (const [id, n] of nodeMeshes) {
      n.core.getWorldPosition(tmp).project(camera)
      const el = labelEls.get(id)!
      el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h + 26}px) translateX(-50%)`
    }
  }

  // Watchdog: measure the real interval between frames (CPU + GPU cost). If the
  // device can't sustain ~30 fps, stop and let the static diagram take over.
  const intervals: number[] = []
  let last = 0
  const loop = (now: number) => {
    frame()
    if (intervals.length < 45) {
      if (last) intervals.push(now - last)
      last = now
      if (intervals.length === 45) {
        const median = [...intervals].sort((a, b) => a - b)[22]!
        if (median > 34) {
          stop()
          onDegrade()
          return
        }
      }
    }
    raf = requestAnimationFrame(loop)
  }

  const start = () => {
    if (running || !visible || document.hidden) return
    running = true
    last = 0
    raf = requestAnimationFrame(loop)
  }
  const stop = () => {
    running = false
    cancelAnimationFrame(raf)
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
    if (visible) start()
    else stop()
  })
  io.observe(host)
  const onVisibility = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVisibility)

  frame()
  onReady()
  start()

  return {
    dispose() {
      stop()
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      for (const d of disposables) d.dispose()
      renderer.domElement.remove()
      labels.replaceChildren()
    },
  }
}
