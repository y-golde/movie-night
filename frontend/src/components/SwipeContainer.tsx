import { type ReactNode } from 'react';
import './SwipeContainer.css';

interface SwipeContainerProps {
  children: ReactNode;
  offset: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const SwipeContainer = ({ children, offset }: SwipeContainerProps) => {
  const rotation = offset * 0.1;
  const opacity = 1 - Math.abs(offset) / 400;
  const showLeftHint = offset < -30; // Swiping left (negative offset) = DISLIKE
  const showRightHint = offset > 30; // Swiping right (positive offset) = LIKE

  return (
    <div className="swipe-container">
      <div
        className="swipe-card"
        style={{
          transform: `translateX(${offset}px) rotate(${rotation}deg)`,
          opacity: Math.max(opacity, 0.5),
        }}
      >
        {children}
      </div>
      <div className="swipe-hints">
        <div 
          className="swipe-hint left"
          style={{ opacity: showLeftHint ? 1 : 0 }}
        >
          <span>← DISLIKE</span>
        </div>
        <div 
          className="swipe-hint right"
          style={{ opacity: showRightHint ? 1 : 0 }}
        >
          <span>LIKE →</span>
        </div>
      </div>
    </div>
  );
};

export default SwipeContainer;
