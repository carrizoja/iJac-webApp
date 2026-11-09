import { cn } from './cn';

interface BrandLogoProps {
  alt: string;
  className?: string;
}

/**
 * The iJac mark for the current theme: the coloured logo on light backgrounds, the white one on
 * dark. The theme is a class on `<html>`, so only one image is ever displayed.
 */
export function BrandLogo({ alt, className }: BrandLogoProps) {
  return (
    <>
      <img
        src="/ijac/logo-positive.png"
        alt={alt}
        className={cn('object-contain dark:hidden', className)}
      />
      <img
        src="/ijac/logo.png"
        alt={alt}
        className={cn('hidden object-contain dark:block', className)}
      />
    </>
  );
}
