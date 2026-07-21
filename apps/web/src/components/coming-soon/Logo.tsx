import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 64, className = "" }) => {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
        style={{ overflow: 'visible' }}
      >
        {/* Restored OG Bold V Logo */}
        <path 
          d="M12,15 H38 L50,60 L62,15 H88 L58,85 H42 Z" 
          fill="white" 
        />
      </svg>
    </div>
  );
};

export default Logo;
