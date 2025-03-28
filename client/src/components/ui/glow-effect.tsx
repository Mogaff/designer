'use client';
import { cn } from '@/lib/utils';

// Since we don't have motion/react installed,
// I'll implement a simplified version using regular CSS animations
export type GlowEffectProps = {
  className?: string;
  style?: React.CSSProperties;
  colors?: string[];
  mode?:
    | 'rotate'
    | 'pulse'
    | 'breathe'
    | 'colorShift'
    | 'flowHorizontal'
    | 'static';
  blur?:
    | number
    | 'softest'
    | 'soft'
    | 'medium'
    | 'strong'
    | 'stronger'
    | 'strongest'
    | 'none';
  scale?: number;
  duration?: number;
};

export function GlowEffect({
  className,
  style,
  colors = ['#FF5733', '#33FF57', '#3357FF', '#F1C40F'],
  mode = 'rotate',
  blur = 'medium',
  scale = 1,
  duration = 5,
}: GlowEffectProps) {
  
  const getBackground = () => {
    if (mode === 'static') {
      return `linear-gradient(to right, ${colors.join(', ')})`;
    }
    
    if (mode === 'rotate') {
      return `conic-gradient(from 0deg at 50% 50%, ${colors.join(', ')})`;
    }
    
    if (mode === 'flowHorizontal') {
      const nextColor = colors[(0 + 1) % colors.length];
      return `linear-gradient(to right, ${colors[0]}, ${nextColor})`;
    }
    
    // Default, for other modes
    return `radial-gradient(circle at 50% 50%, ${colors[0]} 0%, transparent 100%)`;
  };

  const getBlurClass = (blur: GlowEffectProps['blur']) => {
    if (typeof blur === 'number') {
      return `blur-[${blur}px]`;
    }

    const presets = {
      softest: 'blur-sm',
      soft: 'blur',
      medium: 'blur-md',
      strong: 'blur-lg',
      stronger: 'blur-xl',
      strongest: 'blur-xl',
      none: 'blur-none',
    };

    return presets[blur as keyof typeof presets];
  };

  const animationClass = mode === 'static' ? '' : `animate-glow-${mode}`;

  return (
    <div
      style={
        {
          ...style,
          background: getBackground(),
          animationDuration: `${duration}s`,
          transform: `scale(${scale})`,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        'transform-gpu',
        getBlurClass(blur),
        animationClass,
        className
      )}
    />
  );
}