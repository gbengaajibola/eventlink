import Image from 'next/image'

interface ImageWithFallbackProps {
  src: string | null
  alt: string
  className?: string
  fallbackText?: string
}

export function ImageWithFallback({ src, alt, className = '', fallbackText = 'Event' }: ImageWithFallbackProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
      />
    )
  }

  return (
    <div className={`bg-gray-200 flex items-center justify-center text-gray-400 ${className}`}>
      {fallbackText}
    </div>
  )
}