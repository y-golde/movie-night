import { useState, useRef, useEffect } from 'react';
import './PatternLock.css';

interface PatternLockProps {
  onPatternComplete: (pattern: string) => void;
  onPatternChange?: (pattern: string) => void;
  disabled?: boolean;
  showChooseButton?: boolean;
  onChoose?: () => void;
}

const PatternLock = ({ onPatternComplete, onPatternChange, disabled = false, showChooseButton = false, onChoose }: PatternLockProps) => {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dots = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getDotPosition = (dot: number): { row: number; col: number } => {
    return {
      row: Math.floor((dot - 1) / 3),
      col: (dot - 1) % 3,
    };
  };

  const getDotFromPosition = (row: number, col: number): number => {
    return row * 3 + col + 1;
  };

  const getIntermediateDots = (from: number, to: number): number[] => {
    const fromPos = getDotPosition(from);
    const toPos = getDotPosition(to);
    const intermediate: number[] = [];

    const rowDiff = toPos.row - fromPos.row;
    const colDiff = toPos.col - fromPos.col;

    if (rowDiff === 0) {
      // Same row
      const step = colDiff > 0 ? 1 : -1;
      for (let i = 1; i < Math.abs(colDiff); i++) {
        intermediate.push(getDotFromPosition(fromPos.row, fromPos.col + i * step));
      }
    } else if (colDiff === 0) {
      // Same column
      const step = rowDiff > 0 ? 1 : -1;
      for (let i = 1; i < Math.abs(rowDiff); i++) {
        intermediate.push(getDotFromPosition(fromPos.row + i * step, fromPos.col));
      }
    } else if (Math.abs(rowDiff) === Math.abs(colDiff)) {
      // Diagonal
      const rowStep = rowDiff > 0 ? 1 : -1;
      const colStep = colDiff > 0 ? 1 : -1;
      for (let i = 1; i < Math.abs(rowDiff); i++) {
        intermediate.push(getDotFromPosition(fromPos.row + i * rowStep, fromPos.col + i * colStep));
      }
    }

    return intermediate;
  };

  const handleDotClick = (dot: number) => {
    if (disabled) return;

    if (selectedDots.includes(dot)) {
      return;
    }

    let newSelected = [...selectedDots];

    if (newSelected.length > 0) {
      const lastDot = newSelected[newSelected.length - 1];
      const intermediate = getIntermediateDots(lastDot, dot);
      newSelected = [...newSelected, ...intermediate, dot];
    } else {
      newSelected = [dot];
    }

    setSelectedDots(newSelected);
    const pattern = newSelected.join('-');
    onPatternChange?.(pattern);

    if (newSelected.length >= 4) {
      onPatternComplete(pattern);
    }
  };

  const handleMouseDown = (dot: number) => {
    if (disabled) return;
    setIsDrawing(true);
    handleDotClick(dot);
  };

  const handleMouseEnter = (dot: number) => {
    if (disabled || !isDrawing) return;
    handleDotClick(dot);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (dot: number) => {
    if (disabled) return;
    setIsDrawing(true);
    handleDotClick(dot);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDrawing) return;
    // Prevent pull-to-refresh/scroll when drawing pattern (mobile)
    e.preventDefault();

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.classList.contains('pattern-dot')) {
      const dot = parseInt(element.getAttribute('data-dot') || '0');
      if (dot && !selectedDots.includes(dot)) {
        handleDotClick(dot);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const reset = () => {
    setSelectedDots([]);
    setIsDrawing(false);
  };

  useEffect(() => {
    const handleMouseUpGlobal = () => {
      if (isDrawing) {
        setIsDrawing(false);
      }
    };

    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, [isDrawing]);

  const isDotSelected = (dot: number): boolean => {
    return selectedDots.includes(dot);
  };

  const isDotActive = (dot: number): boolean => {
    return selectedDots.length > 0 && selectedDots[selectedDots.length - 1] === dot;
  };

  const getDotCenter = (dot: number): { x: number; y: number } => {
    if (!gridRef.current) {
      // Fallback calculation
      const pos = getDotPosition(dot);
      const dotSize = 50;
      const gap = 20;
      const padding = 24;
      return {
        x: padding + pos.col * (dotSize + gap) + dotSize / 2,
        y: padding + pos.row * (dotSize + gap) + dotSize / 2,
      };
    }
    
    // Get actual DOM position
    const dotElement = gridRef.current.querySelector(`[data-dot="${dot}"]`) as HTMLElement;
    if (dotElement) {
      const gridRect = gridRef.current.getBoundingClientRect();
      const dotRect = dotElement.getBoundingClientRect();
      return {
        x: dotRect.left - gridRect.left + dotRect.width / 2,
        y: dotRect.top - gridRect.top + dotRect.height / 2,
      };
    }
    
    // Fallback
    const pos = getDotPosition(dot);
    const dotSize = 50;
    const gap = 20;
    const padding = 24;
    return {
      x: padding + pos.col * (dotSize + gap) + dotSize / 2,
      y: padding + pos.row * (dotSize + gap) + dotSize / 2,
    };
  };

  return (
    <div className="pattern-lock-container" ref={containerRef}>
      <p className="pattern-instruction">DRAW YOUR LOCK PATTERN</p>
      <div
        ref={gridRef}
        className="pattern-lock-grid"
        onMouseUp={handleMouseUp}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {/* SVG for drawing lines */}
        {selectedDots.length > 1 && (
          <svg className="pattern-lines" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {selectedDots.slice(0, -1).map((dot, idx) => {
              const nextDot = selectedDots[idx + 1];
              const start = getDotCenter(dot);
              const end = getDotCenter(nextDot);
              return (
                <line
                  key={`${dot}-${nextDot}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#000"
                  strokeWidth="5"
                  strokeLinecap="round"
                  style={{
                    animation: `lineDraw 0.2s ease-out ${idx * 0.05}s both`,
                  }}
                />
              );
            })}
          </svg>
        )}
        {dots.map((dot) => {
          const isSelected = isDotSelected(dot);
          const isActive = isDotActive(dot);
          const index = selectedDots.indexOf(dot);

          return (
            <div
              key={dot}
              className={`pattern-dot ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
              data-dot={dot}
              onMouseDown={() => handleMouseDown(dot)}
              onMouseEnter={() => handleMouseEnter(dot)}
              onTouchStart={() => handleTouchStart(dot)}
            >
              {isSelected && (
                <span 
                  className="dot-number"
                  style={{
                    animation: 'numberPop 0.2s ease-out',
                  }}
                >
                  {index + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="pattern-buttons">
        <button className="pattern-reset" onClick={reset} type="button" disabled={selectedDots.length === 0}>
          RESET
        </button>
        {showChooseButton && (
          <button className="pattern-choose" onClick={onChoose} type="button" disabled={selectedDots.length === 0}>
            CONTINUE
          </button>
        )}
      </div>
    </div>
  );
};

export default PatternLock;
