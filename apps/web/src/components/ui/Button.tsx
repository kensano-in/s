import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SPRING } from '@/lib/motion';

// Omit all drag-related handlers — framer-motion's motion.button redefines them
// with (PointerEvent | MouseEvent | TouchEvent) instead of React's DragEvent<HTMLButtonElement>
type ButtonHTMLDragOmitted = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragExit' | 'onDragLeave' | 'onDragOver' | 'onDragStart'
>;

export interface ButtonProps extends ButtonHTMLDragOmitted {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  successState?: boolean;
  errorState?: boolean;
  fullWidth?: boolean;
}


const BaseButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      successState = false,
      errorState = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Luxury Motion Classes
    const baseClasses = 'inline-flex relative items-center justify-center font-semibold rounded-lg outline-none select-none';
    
    // Active/hover states for physics
    const interactionClasses = 'transition-all duration-normal ease-spring active:scale-[0.96] active:brightness-95 disabled:opacity-40 disabled:pointer-events-none disabled:scale-100 disabled:grayscale-[0.3] hover:-translate-y-[1px] hover:brightness-110';
    
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-glow-primary border border-blue-500/50',
      secondary: 'bg-[#121212] text-white border border-[#262626] hover:bg-[#1f1f1f] hover:shadow-glow lux-shadow',
      ghost: 'bg-transparent text-[#888888] hover:text-white hover:bg-[#1A1A1A]',
      danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:shadow-glow border border-red-500/10',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-[15px]',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2 w-10 h-10',
    };

    let overrideVariantClass = variants[variant];
    if (successState) {
        overrideVariantClass = 'bg-emerald-600 text-white border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] !scale-100';
    } else if (errorState) {
        overrideVariantClass = 'bg-red-600/20 text-red-400 border border-red-500/50 !scale-100';
    }

    const classes = cn(
      baseClasses,
      interactionClasses,
      overrideVariantClass,
      sizes[size],
      fullWidth ? 'w-full' : '',
      className
    );

    const isOverlayActive = isLoading || successState || errorState;

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isOverlayActive}
        className={classes}
        {...(errorState ? { animate: { x: [0, -4, 4, -4, 4, 0] }, transition: { duration: 0.3 } } : {})}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(props as any)}
      >
        <AnimatePresence mode="wait">
          {successState ? (
            <motion.div
              key="success"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={SPRING.micro}
              className="absolute inset-0 flex items-center justify-center text-white"
            >
              <Check size={size === 'sm' ? 16 : 20} strokeWidth={3} className="drop-shadow-md" />
            </motion.div>
          ) : errorState ? (
            <motion.div
              key="error"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={SPRING.micro}
              className="absolute inset-0 flex items-center justify-center text-red-500"
            >
              <X size={size === 'sm' ? 16 : 20} strokeWidth={3} />
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={SPRING.micro}
              className="absolute inset-0 flex items-center justify-center text-current"
            >
               <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.span 
            animate={{ opacity: isOverlayActive ? 0 : 1, scale: isOverlayActive ? 0.95 : 1 }}
            transition={SPRING.micro}
            className="inline-flex items-center gap-2"
        >
          {children}
        </motion.span>
      </motion.button>
    );
  }
);

BaseButton.displayName = 'Button';
export const Button = BaseButton;

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <BaseButton
        ref={ref}
        size="icon"
        className={cn('rounded-full !px-0', className)}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
