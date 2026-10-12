import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-navy-900 text-white hover:bg-navy-800 active:bg-navy-950 focus:ring-navy-900 shadow-subtle',
    accent:
      'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-700 focus:ring-teal-500 shadow-subtle',
    secondary:
      'bg-navy-50 text-navy-900 hover:bg-navy-100 focus:ring-navy-200 border border-navy-100',
    outline:
      'bg-white text-civic-text border border-civic-border hover:bg-gray-50 focus:ring-navy-800 shadow-subtle',
    ghost:
      'bg-transparent text-civic-secondary hover:text-navy-900 hover:bg-gray-100 focus:ring-navy-200',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-subtle',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
