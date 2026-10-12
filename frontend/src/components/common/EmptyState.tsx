import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  actionTo?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  actionHref,
  actionTo,
  className = '',
}) => {
  const label = actionLabel || actionText;
  const destination = actionTo || actionHref;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-civic-border shadow-2xs ${className}`}
    >
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4 shadow-2xs">
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-gray-400" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-navy-900 mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-civic-secondary max-w-sm mb-5 leading-relaxed">
        {description}
      </p>

      {label && (
        <>
          {destination ? (
            destination.startsWith('http') ? (
              <a
                href={destination}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors shadow-2xs"
              >
                {label}
              </a>
            ) : (
              <Link
                to={destination}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors shadow-2xs"
              >
                {label}
              </Link>
            )
          ) : onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-navy-900 text-white hover:bg-navy-800 transition-colors shadow-2xs"
            >
              {label}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
};
