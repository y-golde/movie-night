import { useState, useRef, useEffect } from 'react';
import './AvatarCreator.css';

interface AvatarCreatorProps {
  onSave: (avatarDataUrl: string) => void;
  onCancel: () => void;
  initialAvatar?: string;
}

type Tool = 'pencil' | 'paint' | 'spray' | 'square' | 'circle' | 'star' | 'fill';

const AvatarCreator = ({ onSave, onCancel, initialAvatar }: AvatarCreatorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#000000');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [brushSize, setBrushSize] = useState(2);
  const [sprayDensity, setSprayDensity] = useState(20);
  const canvasSnapshotRef = useRef<ImageData | null>(null);

  // 8-color palette
  const palette = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 64;
    canvas.height = 64;

    // Fill with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load initial avatar if provided
    if (initialAvatar) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialAvatar;
    }
  }, [initialAvatar]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) * (canvas.width / rect.width)),
      y: Math.floor((e.clientY - rect.top) * (canvas.height / rect.height))
    };
  };

  const drawPencil = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (startPos) {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    setStartPos({ x, y });
  };

  const drawPaint = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawSpray = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = color;

    for (let i = 0; i < sprayDensity; i++) {
      const offsetX = (Math.random() - 0.5) * brushSize * 2;
      const offsetY = (Math.random() - 0.5) * brushSize * 2;
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (distance <= brushSize) {
        ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
      }
    }
  };

  const drawSquare = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !startPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.rect(
      Math.min(startPos.x, x),
      Math.min(startPos.y, y),
      Math.abs(x - startPos.x),
      Math.abs(y - startPos.y)
    );
    ctx.stroke();
  };

  const drawCircle = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !startPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    const radius = Math.sqrt(
      Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
    );
    ctx.beginPath();
    ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawStar = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !startPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    const radius = Math.sqrt(
      Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2)
    );
    const spikes = 5;
    const step = Math.PI / spikes;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? radius : radius / 2;
      const angle = i * step - Math.PI / 2;
      const px = startPos.x + r * Math.cos(angle);
      const py = startPos.y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  };

  const fillBucket = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const targetColor = getPixel(imageData, x, y);
    const fillColor = hexToRgb(color);

    if (!targetColor || !fillColor) return;

    // Check if already the same color
    if (
      targetColor.r === fillColor.r &&
      targetColor.g === fillColor.g &&
      targetColor.b === fillColor.b
    ) {
      return;
    }

    const stack: Array<{ x: number; y: number }> = [{ x, y }];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const { x: px, y: py } = stack.pop()!;
      const key = `${px},${py}`;

      if (visited.has(key)) continue;
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;

      const pixel = getPixel(imageData, px, py);
      if (!pixel) continue;

      if (
        pixel.r === targetColor.r &&
        pixel.g === targetColor.g &&
        pixel.b === targetColor.b
      ) {
        setPixel(imageData, px, py, fillColor);
        visited.add(key);

        stack.push({ x: px + 1, y: py });
        stack.push({ x: px - 1, y: py });
        stack.push({ x: px, y: py + 1 });
        stack.push({ x: px, y: py - 1 });
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const getPixel = (imageData: ImageData, x: number, y: number) => {
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return null;
    const index = (y * imageData.width + x) * 4;
    return {
      r: imageData.data[index],
      g: imageData.data[index + 1],
      b: imageData.data[index + 2],
      a: imageData.data[index + 3]
    };
  };

  const setPixel = (imageData: ImageData, x: number, y: number, color: { r: number; g: number; b: number }) => {
    if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return;
    const index = (y * imageData.width + x) * 4;
    imageData.data[index] = color.r;
    imageData.data[index + 1] = color.g;
    imageData.data[index + 2] = color.b;
    imageData.data[index + 3] = 255;
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null;
  };

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvasSnapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };

  const restoreCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvasSnapshotRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(canvasSnapshotRef.current, 0, 0);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === 'fill') {
      fillBucket(pos.x, pos.y);
    } else if (['square', 'circle', 'star'].includes(tool)) {
      saveCanvasState();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getMousePos(e);

    switch (tool) {
      case 'pencil':
        drawPencil(pos.x, pos.y);
        break;
      case 'paint':
        drawPaint(pos.x, pos.y);
        break;
      case 'spray':
        drawSpray(pos.x, pos.y);
        break;
      case 'square':
        restoreCanvasState();
        drawSquare(pos.x, pos.y);
        break;
      case 'circle':
        restoreCanvasState();
        drawCircle(pos.x, pos.y);
        break;
      case 'star':
        restoreCanvasState();
        drawStar(pos.x, pos.y);
        break;
    }
  };

  const handleMouseUp = (e?: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && startPos && e && ['square', 'circle', 'star'].includes(tool)) {
      // Finalize shape drawing
      const pos = getMousePos(e);
      restoreCanvasState();
      
      switch (tool) {
        case 'square':
          drawSquare(pos.x, pos.y);
          break;
        case 'circle':
          drawCircle(pos.x, pos.y);
          break;
        case 'star':
          drawStar(pos.x, pos.y);
          break;
      }
    }
    setIsDrawing(false);
    setStartPos(null);
    canvasSnapshotRef.current = null;
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="avatar-creator">
      <div className="avatar-creator-header">
        <h2>CREATE AVATAR</h2>
      </div>
      
      <div className="avatar-creator-content">
        <div className="avatar-toolbar">
          <div className="tool-group">
            <h3>TOOLS</h3>
            <div className="tools">
              <button
                className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}
                onClick={() => setTool('pencil')}
                title="Pencil"
              >
                ✏️
              </button>
              <button
                className={`tool-btn ${tool === 'paint' ? 'active' : ''}`}
                onClick={() => setTool('paint')}
                title="Paint Brush"
              >
                🖌️
              </button>
              <button
                className={`tool-btn ${tool === 'spray' ? 'active' : ''}`}
                onClick={() => setTool('spray')}
                title="Spray Paint"
              >
                🎨
              </button>
              <button
                className={`tool-btn ${tool === 'fill' ? 'active' : ''}`}
                onClick={() => setTool('fill')}
                title="Paint Bucket"
              >
                🪣
              </button>
              <button
                className={`tool-btn ${tool === 'square' ? 'active' : ''}`}
                onClick={() => setTool('square')}
                title="Square"
              >
                ⬜
              </button>
              <button
                className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
                onClick={() => setTool('circle')}
                title="Circle"
              >
                ⭕
              </button>
              <button
                className={`tool-btn ${tool === 'star' ? 'active' : ''}`}
                onClick={() => setTool('star')}
                title="Star"
              >
                ⭐
              </button>
            </div>
          </div>

          <div className="tool-group">
            <h3>COLORS</h3>
            <div className="color-palette">
              {palette.map((paletteColor) => (
                <button
                  key={paletteColor}
                  className={`color-swatch ${color === paletteColor ? 'active' : ''}`}
                  style={{ backgroundColor: paletteColor }}
                  onClick={() => setColor(paletteColor)}
                  title={paletteColor}
                />
              ))}
            </div>
          </div>

          <div className="tool-group">
            <h3>SIZE</h3>
            <div className="size-control">
              <input
                type="range"
                min="1"
                max="10"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="size-slider"
              />
              <span className="size-value">{brushSize}px</span>
            </div>
          </div>

          <div className="tool-group">
            <button className="action-btn clear" onClick={handleClear}>
              CLEAR
            </button>
          </div>
        </div>

        <div className="avatar-canvas-container">
          <canvas
            ref={canvasRef}
            className="avatar-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>
      </div>

      <div className="avatar-creator-actions">
        <button className="action-btn cancel" onClick={onCancel}>
          CANCEL
        </button>
        <button className="action-btn save" onClick={handleSave}>
          SAVE AVATAR
        </button>
      </div>
    </div>
  );
};

export default AvatarCreator;
