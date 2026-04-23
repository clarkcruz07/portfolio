import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeScene() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 26);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x020b14, 0);

    const ambient = new THREE.AmbientLight(0x99d8ff, 0.85);
    scene.add(ambient);

    const point = new THREE.PointLight(0x83f7ff, 1.2, 120);
    point.position.set(-10, 12, 25);
    scene.add(point);

    const glow = new THREE.PointLight(0x49ffce, 0.9, 80);
    glow.position.set(12, -6, 20);
    scene.add(glow);

    const torusMaterial = new THREE.MeshStandardMaterial({
      color: 0x4beaf9,
      emissive: 0x0c86b0,
      roughness: 0.22,
      metalness: 0.6,
      transparent: true,
      opacity: 0.92,
    });

    const torus = new THREE.Mesh(new THREE.TorusGeometry(6, 1.5, 64, 120), torusMaterial);
    torus.rotation.x = Math.PI * 0.15;
    scene.add(torus);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x47ffde,
      emissive: 0x0bb18c,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 3), coreMaterial);
    scene.add(core);

    const particleCount = 420;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 48;
      positions[i3 + 1] = (Math.random() - 0.5) * 28;
      positions[i3 + 2] = (Math.random() - 0.5) * 32;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x62dfff,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    const curve = new THREE.Line(new THREE.TorusGeometry(10.5, 0.02, 8, 200), new THREE.MeshBasicMaterial({
      color: 0x2bc4ff,
      opacity: 0.3,
      transparent: true,
    }));
    scene.add(curve);

    let scrollY = 0;
    let maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    const onScroll = () => {
      scrollY = window.scrollY;
      const scrollFraction = Math.min(scrollY / maxScroll, 1);
      const drift = scrollFraction * 4.5;
      camera.position.y = drift;
      camera.position.x = Math.sin(scrollFraction * Math.PI * 1.2) * 2.2;
      camera.position.z = 26 - scrollFraction * 7.5;
      camera.rotation.z = Math.sin(scrollFraction * Math.PI * 0.4) * 0.03;
      camera.lookAt(0, drift * -0.12, 0);

      torus.position.y = Math.sin(scrollFraction * Math.PI * 2.4) * 0.8;
      torus.position.x = Math.cos(scrollFraction * Math.PI * 1.1) * 1.1;
      core.position.y = Math.cos(scrollFraction * Math.PI * 2.1) * 0.6;
    };

    const handleResize = () => {
      maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };

    const animate = () => {
      torus.rotation.y += 0.0027;
      torus.rotation.z += 0.0014;
      core.rotation.x += 0.0035;
      core.rotation.y -= 0.0025;
      particles.rotation.y += 0.0007;
      particles.rotation.x += 0.00015;
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      particleGeometry.dispose();
      torus.geometry.dispose();
      core.geometry.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="three-canvas" />;
}
