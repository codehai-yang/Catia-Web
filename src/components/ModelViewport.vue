<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/** 渲染容器 */
const container = ref<HTMLElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let gizmoScene: THREE.Scene | null = null
let gizmoCamera: THREE.OrthographicCamera | null = null
let rafId = 0
let currentModel: THREE.Object3D | null = null

const loader = new GLTFLoader()

/** 初始化 three.js 场景 */
function initScene(): void {
  if (!container.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1116)

  const width = container.value.clientWidth || 1
  const height = container.value.clientHeight || 1
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000)
  camera.position.set(200, 200, 200)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(width, height)
  renderer.autoClear = false
  container.value.appendChild(renderer.domElement)

  // 光照：环境光提供均匀基础亮度（消除底部过黑），半球光 + 平行光叠加自然明暗
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75)
  scene.add(ambientLight)

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x9aa0a8, 0.5)
  scene.add(hemiLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0)
  keyLight.position.set(1, 2, 1)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xcfd4da, 0.6)
  fillLight.position.set(-1, -0.5, -1)
  scene.add(fillLight)

  // 参考网格
  const grid = new THREE.GridHelper(400, 20, 0x2a3039, 0x1f2530)
  scene.add(grid)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true

  initGizmo()
}

/** 初始化左下角坐标轴指南针（类似 CATIA compass） */
function initGizmo(): void {
  gizmoScene = new THREE.Scene()

  // X 红 / Y 绿 / Z 蓝
  gizmoScene.add(buildAxis(new THREE.Vector3(1, 0, 0), 0xef4444))
  gizmoScene.add(buildAxis(new THREE.Vector3(0, 1, 0), 0x22c55e))
  gizmoScene.add(buildAxis(new THREE.Vector3(0, 0, 1), 0x3b82f6))

  // 轴字母标签（位于箭头尖端外侧）
  gizmoScene.add(createAxisLabel('X', 0xef4444, new THREE.Vector3(1.45, 0, 0)))
  gizmoScene.add(createAxisLabel('Y', 0x22c55e, new THREE.Vector3(0, 1.45, 0)))
  gizmoScene.add(createAxisLabel('Z', 0x3b82f6, new THREE.Vector3(0, 0, 1.45)))

  // 中心点
  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  )
  gizmoScene.add(center)

  gizmoCamera = new THREE.OrthographicCamera(-1.6, 1.6, 1.6, -1.6, 0.1, 10)
  gizmoCamera.position.set(0, 0, 5)
}

/** 构建单根坐标轴箭头 */
function buildAxis(dir: THREE.Vector3, color: number): THREE.ArrowHelper {
  return new THREE.ArrowHelper(dir.clone().normalize(), new THREE.Vector3(), 1, color, 0.22, 0.1)
}

/** 创建坐标轴字母标签（X/Y/Z），使用 Canvas 纹理的精灵，始终面向相机 */
function createAxisLabel(char: string, color: number, position: THREE.Vector3): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = 'bold 44px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.fillText(char, 32, 34)
  }

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
  const sprite = new THREE.Sprite(material)
  sprite.position.copy(position)
  sprite.scale.set(0.5, 0.5, 1)
  return sprite
}

/** 渲染循环 */
function animate(): void {
  rafId = requestAnimationFrame(animate)
  controls?.update()
  if (!renderer || !scene || !camera || !container.value) return

  const width = container.value.clientWidth
  const height = container.value.clientHeight

  // 主场景
  renderer.setViewport(0, 0, width, height)
  renderer.setScissorTest(false)
  renderer.clear()
  renderer.render(scene, camera)

  // 左下角指南针
  renderGizmo()
}

/** 渲染坐标轴指南针（跟随主相机旋转） */
function renderGizmo(): void {
  if (!renderer || !camera || !gizmoScene || !gizmoCamera) return

  const size = 96
  const margin = 16

  // 指南针相机：从主相机观察方向看向原点，up 与主相机一致
  const dir = camera.position.clone().normalize()
  gizmoCamera.position.copy(dir).multiplyScalar(5)
  gizmoCamera.up.copy(camera.up)
  gizmoCamera.lookAt(0, 0, 0)

  renderer.clearDepth()
  renderer.setViewport(margin, margin, size, size)
  renderer.setScissor(margin, margin, size, size)
  renderer.setScissorTest(true)
  renderer.render(gizmoScene, gizmoCamera)
  renderer.setScissorTest(false)
}

/** 容器尺寸变化时同步相机与渲染器 */
function onResize(): void {
  if (!container.value || !renderer || !camera) return
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

/** 移除当前模型 */
function removeModel(): void {
  if (currentModel && scene) {
    scene.remove(currentModel)
    currentModel = null
  }
}

/** 适配相机：模型居中并完整显示 */
function focusCamera(model: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  model.position.sub(center)

  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const fov = ((camera?.fov ?? 45) * Math.PI) / 180
  const distance = (maxDim / (2 * Math.tan(fov / 2))) * 1.2

  camera?.position.set(distance, distance, distance)
  camera?.lookAt(0, 0, 0)
  if (controls) {
    controls.target.set(0, 0, 0)
  }
}

/** 加载 GLB 二进制数据并展示 */
function loadModel(buffer: ArrayBuffer): void {
  if (!scene) return
  loader.parse(
    buffer,
    '',
    (gltf) => {
      removeModel()
      applyCatiaMaterial(gltf.scene)
      currentModel = gltf.scene
      scene?.add(gltf.scene)
      focusCamera(gltf.scene)
    },
    (error) => {
      console.error('GLB 解析失败：', error)
    },
  )
}

/** 调整模型材质，使其呈现 CATIA 风格的钢灰色明暗显示 */
function applyCatiaMaterial(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh

    const geometry = mesh.geometry as THREE.BufferGeometry
    const hasVertexColors = geometry.hasAttribute('color')

    const tune = (mat: THREE.Material): THREE.Material => {
      const std = mat as THREE.MeshStandardMaterial
      std.side = THREE.DoubleSide

      // 无纹理、无顶点色时，STEP 经 OCC 转出的 glb 材质多为纯白，
      // 用 CATIA 默认的钢灰色替代，避免整件全白。
      if (!std.map && !hasVertexColors) {
        const c = std.color
        if (c.r > 0.9 && c.g > 0.9 && c.b > 0.9) {
          std.color = new THREE.Color(0xc3c8ce)
        }
        std.metalness = 0.2
        std.roughness = 0.55
      }
      return std
    }

    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tune) : tune(mesh.material)
  })
}

onMounted(() => {
  initScene()
  animate()
  if (container.value) {
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(rafId)
  controls?.dispose()
  if (renderer) {
    renderer.dispose()
    if (container.value) {
      container.value.removeChild(renderer.domElement)
    }
  }
})

defineExpose({ loadModel, clear: removeModel })
</script>

<template>
  <div ref="container" class="model-viewport"></div>
</template>

<style scoped>
.model-viewport {
  width: 100%;
  height: 100%;
}
</style>