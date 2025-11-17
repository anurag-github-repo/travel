"use client";

import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isRecording: boolean;
  inputAnalyser?: AnalyserNode | null;
  outputAnalyser?: AnalyserNode | null;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
  color: string;
}

export default function AudioVisualizer({ isRecording, inputAnalyser, outputAnalyser }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: 80 + Math.random() * 40,
          speed: 0.5 + Math.random() * 1,
          size: 2 + Math.random() * 3,
          opacity: 0.3 + Math.random() * 0.7,
          color: isRecording ? '#ef4444' : '#3b82f6',
        });
      }
    };
    initParticles();

    let time = 0;

    const animate = () => {
      if (!ctx || !canvas) return;

      time += 0.01;

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Get audio data
      let audioLevel = 0;
      let frequencyData: Uint8Array | null = null;

      if (isRecording && inputAnalyser) {
        frequencyData = new Uint8Array(inputAnalyser.frequencyBinCount);
        inputAnalyser.getByteFrequencyData(frequencyData);
        audioLevel = Array.from(frequencyData.slice(0, 32)).reduce((a, b) => a + b, 0) / 32 / 255;
      } else if (outputAnalyser) {
        frequencyData = new Uint8Array(outputAnalyser.frequencyBinCount);
        outputAnalyser.getByteFrequencyData(frequencyData);
        audioLevel = Array.from(frequencyData.slice(0, 32)).reduce((a, b) => a + b, 0) / 32 / 255;
      }

      // Draw central orb with audio reactivity
      const baseRadius = 60;
      const audioRadius = baseRadius + (audioLevel * 40);

      // Outer glow
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, audioRadius * 1.5);
      gradient.addColorStop(0, isRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(0.5, isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, audioRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Main orb
      const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, audioRadius);
      orbGradient.addColorStop(0, isRecording ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)');
      orbGradient.addColorStop(0.7, isRecording ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)');
      orbGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, audioRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw audio waveform circle
      if (frequencyData && audioLevel > 0.01) {
        ctx.strokeStyle = isRecording ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const points = 64;
        const sliceWidth = frequencyData.length / points;

        for (let i = 0; i < points; i++) {
          const index = Math.floor(i * sliceWidth);
          const value = frequencyData[index] / 255;
          const angle = (i / points) * Math.PI * 2;
          const radius = audioRadius + (value * 30);

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.closePath();
        ctx.stroke();
      }

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        particle.angle += particle.speed * 0.01;

        // Make particles react to audio
        const particleRadius = particle.radius + (audioLevel * 20);

        const x = centerX + Math.cos(particle.angle) * particleRadius;
        const y = centerY + Math.sin(particle.angle) * particleRadius;

        // Update particle color based on recording state
        particle.color = isRecording ? '#ef4444' : '#3b82f6';

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity * (0.5 + audioLevel);
        ctx.beginPath();
        ctx.arc(x, y, particle.size * (1 + audioLevel), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw connecting lines between nearby particles
        particlesRef.current.slice(index + 1).forEach(otherParticle => {
          const otherX = centerX + Math.cos(otherParticle.angle) * (otherParticle.radius + audioLevel * 20);
          const otherY = centerY + Math.sin(otherParticle.angle) * (otherParticle.radius + audioLevel * 20);

          const distance = Math.sqrt((x - otherX) ** 2 + (y - otherY) ** 2);

          if (distance < 80) {
            ctx.strokeStyle = isRecording ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
            ctx.lineWidth = 1;
            ctx.globalAlpha = (1 - distance / 80) * 0.3;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(otherX, otherY);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        });
      });

      // Draw pulsing rings
      for (let i = 0; i < 3; i++) {
        const ringRadius = audioRadius + 20 + (i * 15) + (Math.sin(time * 2 + i) * 5);
        ctx.strokeStyle = isRecording
          ? `rgba(239, 68, 68, ${0.3 - i * 0.1})`
          : `rgba(59, 130, 246, ${0.3 - i * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, inputAnalyser, outputAnalyser]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'transparent' }}
    />
  );
}
