import { useEffect, useRef } from 'react';

export interface HorizonGlowProps {
  speed?: number;
  frequency?: number;
  amplitude?: number;
  intensity?: number;
  rotation?: number;
  translateX?: number;
  translateY?: number;
  backgroundColor?: string;
  className?: string;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
};

export function HorizonGlow({
  speed = 0.6,
  frequency = 1.2,
  amplitude = 0.25,
  intensity = 0.15,
  rotation = 0,
  translateX = 0,
  translateY = -0.15,
  backgroundColor = '#0b0b12',
  className = '',
}: HorizonGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const configRef = useRef({
    speed,
    frequency,
    amplitude,
    intensity,
    rotation,
    translateX,
    translateY,
    backgroundColor,
  });

  useEffect(() => {
    configRef.current = {
      speed,
      frequency,
      amplitude,
      intensity,
      rotation,
      translateX,
      translateY,
      backgroundColor,
    };
  }, [speed, frequency, amplitude, intensity, rotation, translateX, translateY, backgroundColor]);

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
      uniform float u_freq;
      uniform float u_amp;
      uniform float u_intensity;
      uniform float u_rot;
      uniform vec2 u_trans;
      uniform vec3 u_bg_color;
      out vec4 outColor;
      #define FC gl_FragCoord
      mat2 rotate2d(float _angle){
        return mat2(cos(_angle),-sin(_angle),sin(_angle),cos(_angle));
      }
      void main() {
        vec2 p = (FC.xy * 2. - u_resolution) / u_resolution.y;
        p -= u_trans;
        p = rotate2d(radians(u_rot)) * p;
        vec4 wave = u_amp * cos(u_time + p.x * u_freq * vec4(0.7, 1.0, 1.3, 0.0) + vec4(0, 1, 2, 0));
        vec4 glow = u_intensity / (abs(p.y + wave) + 0.01);
        vec3 glowColor = tanh(glow.rgb);
        outColor = vec4(u_bg_color + glowColor, 1.0);
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

    const vertexShader = createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 3, -1, -1, 3]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const uResLoc = gl.getUniformLocation(program, 'u_resolution');
    const uTimeLoc = gl.getUniformLocation(program, 'u_time');
    const uFreqLoc = gl.getUniformLocation(program, 'u_freq');
    const uAmpLoc = gl.getUniformLocation(program, 'u_amp');
    const uIntLoc = gl.getUniformLocation(program, 'u_intensity');
    const uRotLoc = gl.getUniformLocation(program, 'u_rot');
    const uTransLoc = gl.getUniformLocation(program, 'u_trans');
    const uBgColorLoc = gl.getUniformLocation(program, 'u_bg_color');

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);
    resizeCanvas();

    const startTime = performance.now();

    const render = () => {
      const cfg = configRef.current;
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
      gl.uniform1f(uTimeLoc, ((performance.now() - startTime) / 1000) * cfg.speed);
      gl.uniform1f(uFreqLoc, cfg.frequency);
      gl.uniform1f(uAmpLoc, cfg.amplitude);
      gl.uniform1f(uIntLoc, cfg.intensity);
      gl.uniform1f(uRotLoc, cfg.rotation);
      gl.uniform2f(uTransLoc, cfg.translateX, cfg.translateY);
      const rgb = hexToRgb(cfg.backgroundColor);
      gl.uniform3f(uBgColorLoc, rgb[0], rgb[1], rgb[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      ro.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-70 ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}
