import { useEffect, useRef } from 'react';

export interface SolarFlareProps {
  speed?: number;
  intensity?: number;
  colorR?: number;
  colorG?: number;
  colorB?: number;
  backgroundColor?: string;
  className?: string;
}

export function SolarFlare({
  speed = 0.35,
  intensity = 0.22,
  colorR = 0.55,
  colorG = 0.35,
  colorB = 0.85,
  backgroundColor = 'transparent',
  className = '',
}: SolarFlareProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const configRef = useRef({ speed, intensity, colorR, colorG, colorB, backgroundColor });

  useEffect(() => {
    configRef.current = { speed, intensity, colorR, colorG, colorB, backgroundColor };
  }, [speed, intensity, colorR, colorG, colorB, backgroundColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (!gl) return;

    const vsSource = `#version 300 es
      in vec4 position;
      void main() { gl_Position = position; }
    `;

    const fsSource = `#version 300 es
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_intensity;
      uniform vec3 u_color;
      uniform vec3 u_bg;
      out vec4 fragColor;

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
        float t = u_time;
        float r = length(uv);
        float a = atan(uv.y, uv.x);
        float flare = exp(-r * 2.8) * (0.6 + 0.4 * sin(a * 6.0 + t * 0.8));
        float rays = pow(max(0.0, sin(a * 12.0 + t)), 8.0) * exp(-r * 1.5);
        float pulse = 0.5 + 0.5 * sin(t * 1.2 - r * 4.0);
        vec3 col = u_color * (flare + rays * 0.35) * pulse * u_intensity;
        vec3 bg = u_bg;
        fragColor = vec4(mix(bg, col, clamp(length(col), 0.0, 1.0)), 1.0);
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const posLoc = gl.getAttribLocation(program, 'position');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uIntensity = gl.getUniformLocation(program, 'u_intensity');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uBg = gl.getUniformLocation(program, 'u_bg');

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const parseBg = (hex: string): [number, number, number] => {
      if (!hex || hex === 'transparent') return [0, 0, 0];
      const h = hex.replace('#', '');
      if (h.length < 6) return [0, 0, 0];
      return [
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
      ];
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const start = performance.now();
    const render = (now: number) => {
      const cfg = configRef.current;
      const t = ((now - start) / 1000) * cfg.speed;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uIntensity, cfg.intensity);
      gl.uniform3f(uColor, cfg.colorR, cfg.colorG, cfg.colorB);
      const bg = parseBg(cfg.backgroundColor);
      gl.uniform3f(uBg, bg[0], bg[1], bg[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      ro.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden
    />
  );
}
