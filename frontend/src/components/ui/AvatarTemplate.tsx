import React from 'react';

interface AvatarTemplateProps {
  variant?: 'avatar1' | 'avatar2' | 'avatar3' | 'avatar4' | 'avatar5' | 
           'avatar6' | 'avatar7' | 'avatar8' | 'avatar9' | 'avatar10' |
           'avatar11' | 'avatar12' | 'avatar13' | 'avatar14' | 'avatar15';
  size?: number;
  className?: string;
  onClick?: () => void;
}

const AvatarTemplate: React.FC<AvatarTemplateProps> = ({ 
  variant = 'avatar1', 
  size = 50, 
  className = '',
  onClick 
}) => {
  const style = {
    width: `${size}px`,
    height: `${size}px`,
  };

  return (
    <div 
      className={`avatar ${variant} ${className}`}
      style={style}
      onClick={onClick}
    />
  );
};

export default AvatarTemplate;

// 사용 예시:
// <AvatarTemplate variant="avatar1" size={50} />
// <AvatarTemplate variant="avatar7" size={32} onClick={() => console.log('clicked')} />








