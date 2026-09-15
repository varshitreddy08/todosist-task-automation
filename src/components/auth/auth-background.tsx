'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

export function AuthBackground() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth
    const height = mount.clientHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0a12, 0.045)

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.set(0, 0, 12)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    // Ambient + directional lights for the meshes
    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xff7a4d, 1.6)
    key.position.set(5, 5, 5)
    scene.add(key)

    const rim = new THREE.DirectionalLight(0x6a8dff, 1.1)
    rim.position.set(-6, -3, -2)
    scene.add(rim)

    // ── Floating primitives ──
    const group = new THREE.Group()
    scene.add(group)

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xff5a3d, roughness: 0.35, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0xfef2ec, roughness: 0.55, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: 0x5b7cff, roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0xffb266, roughness: 0.45, metalness: 0.08 }),
    ]

    const geometries: THREE.BufferGeometry[] = [
      new THREE.IcosahedronGeometry(0.9, 0),
      new THREE.TorusGeometry(0.7, 0.24, 32, 64),
      new THREE.OctahedronGeometry(0.85, 0),
      new THREE.DodecahedronGeometry(0.8, 0),
      new THREE.SphereGeometry(0.55, 32, 32),
    ]

    type Floater = {
      mesh: THREE.Mesh
      base: THREE.Vector3
      speed: number
      amp: number
      phase: number
      rotSpeed: THREE.Vector3
    }

    const floaters: Floater[] = []
    const count = 14
    for (let i = 0; i < count; i++) {
      const geom = geometries[i % geometries.length]
      const mat = materials[i % materials.length].clone()
      const mesh = new THREE.Mesh(geom, mat)

      const angle = (i / count) * Math.PI * 2
      const radius = 4.5 + Math.random() * 3
      const base = new THREE.Vector3(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 6,
        Math.sin(angle) * radius - 2
      )
      mesh.position.copy(base)

      const scale = 0.55 + Math.random() * 0.75
      mesh.scale.setScalar(scale)

      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)

      group.add(mesh)
      floaters.push({
        mesh,
        base,
        speed: 0.15 + Math.random() * 0.35,
        amp: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.008,
          (Math.random() - 0.5) * 0.005,
        ),
      })
    }

    // ── Particle field ──
    const particleCount = 550
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25
    }
    const particlesGeom = new THREE.BufferGeometry()
    particlesGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const particles = new THREE.Points(particlesGeom, particleMat)
    scene.add(particles)

    // GSAP entrance — grow all floaters from 0
    floaters.forEach((f, i) => {
      const target = f.mesh.scale.x
      f.mesh.scale.setScalar(0)
      gsap.to(f.mesh.scale, {
        x: target, y: target, z: target,
        duration: 1.4,
        delay: 0.1 + i * 0.05,
        ease: 'expo.out',
      })
    })
    gsap.from(particleMat, { opacity: 0, duration: 2, ease: 'power2.out' })
    gsap.from(group.rotation, { y: -0.6, duration: 2.2, ease: 'power3.out' })

    // Mouse-driven parallax
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    function onPointerMove(e: PointerEvent) {
      const rect = mount!.getBoundingClientRect()
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    window.addEventListener('pointermove', onPointerMove)

    // Resize
    function onResize() {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    const clock = new THREE.Clock()

    function loop() {
      const t = clock.getElapsedTime()

      current.x += (target.x - current.x) * 0.05
      current.y += (target.y - current.y) * 0.05

      group.rotation.y = current.x * 0.35 + t * 0.05
      group.rotation.x = -current.y * 0.25
      particles.rotation.y = t * 0.02

      for (const f of floaters) {
        f.mesh.position.y = f.base.y + Math.sin(t * f.speed + f.phase) * f.amp
        f.mesh.position.x = f.base.x + Math.cos(t * f.speed * 0.7 + f.phase) * (f.amp * 0.3)
        f.mesh.rotation.x += f.rotSpeed.x
        f.mesh.rotation.y += f.rotSpeed.y
        f.mesh.rotation.z += f.rotSpeed.z
      }

      renderer.render(scene, camera)
      rafRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('pointermove', onPointerMove)
      ro.disconnect()
      renderer.dispose()
      particlesGeom.dispose()
      particleMat.dispose()
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      floaters.forEach(f => (f.mesh.material as THREE.Material).dispose())
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(255,120,80,0.28), transparent 55%),' +
          'radial-gradient(ellipse at 75% 80%, rgba(90,120,255,0.22), transparent 55%),' +
          'linear-gradient(160deg, #0b0a12 0%, #14121d 55%, #0a0a12 100%)',
      }}
    />
  )
}
