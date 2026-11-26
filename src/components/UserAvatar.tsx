import React from 'react';
import {
  getBuiltinAvatarOption,
  sanitizeAvatarDataUrl,
  type BuiltInAvatarId,
} from '../game/userAccountLogic';

interface UserAvatarProps {
  avatarType?: 'builtin' | 'photo';
  builtinAvatarId?: BuiltInAvatarId;
  avatarDataUrl?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'xs' | 'sm' | 'md' | 'lg', string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-11 w-11 text-lg',
  lg: 'h-16 w-16 text-3xl',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarType = 'builtin',
  builtinAvatarId = 'crown',
  avatarDataUrl,
  alt = 'Player avatar',
  size = 'sm',
  className = '',
}) => {
  const safePhoto = avatarType === 'photo' ? sanitizeAvatarDataUrl(avatarDataUrl) : undefined;
  const builtin = getBuiltinAvatarOption(builtinAvatarId);
  const sizeCls = SIZE_CLASSES[size];

  if (safePhoto) {
    return (
      <img
        src={safePhoto}
        alt={alt}
        className={`${sizeCls} shrink-0 rounded-full border wv-border object-cover shadow-xs ${className}`}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={alt || builtin.label}
      className={`${sizeCls} inline-flex shrink-0 items-center justify-center rounded-full border wv-border wv-accent-pill font-bold select-none ${className}`}
    >
      <span aria-hidden="true">{builtin.glyph}</span>
    </span>
  );
};
