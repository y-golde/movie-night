import { useState, useRef, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const useSwipe = ({ onSwipeLeft, onSwipeRight }: SwipeHandlers) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    if (touchStart !== null) {
      const distance = currentX - touchStart;
      setOffset(distance);
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setTouchEnd(null);
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (touchStart !== null && isDragging) {
      const currentX = e.clientX;
      setTouchEnd(currentX);
      const distance = currentX - touchStart;
      setOffset(distance);
    }
  };

  const onMouseUp = () => {
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        onSwipeLeft();
      }
      if (isRightSwipe) {
        onSwipeRight();
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
    setOffset(0);
    setIsDragging(false);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      onSwipeLeft();
    }
    if (isRightSwipe) {
      onSwipeRight();
    }

    setTouchStart(null);
    setTouchEnd(null);
    setOffset(0);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      onSwipeLeft();
    } else if (e.key === 'ArrowRight') {
      onSwipeRight();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (touchStart !== null && isDragging) {
        const currentX = e.clientX;
        setTouchEnd(currentX);
        const distance = currentX - touchStart;
        setOffset(distance);
      }
    };

    const handleGlobalMouseUp = () => {
      if (touchStart !== null && touchEnd !== null) {
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
          onSwipeLeft();
        }
        if (isRightSwipe) {
          onSwipeRight();
        }
      }
      setTouchStart(null);
      setTouchEnd(null);
      setOffset(0);
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [touchStart, touchEnd, isDragging]);

  return {
    cardRef,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
    },
    offset,
  };
};
