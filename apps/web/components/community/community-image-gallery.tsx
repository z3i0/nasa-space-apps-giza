"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"

interface CommunityImageGalleryProps {
  images?: string[] | null
  compact?: boolean
  className?: string
}

export function CommunityImageGallery({
  images,
  compact = false,
  className = "",
}: CommunityImageGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null)

  if (!images || images.length === 0) return null

  const validImages = images.filter((img) => typeof img === "string" && img.trim().length > 0)
  if (validImages.length === 0) return null

  const count = validImages.length

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeImageIndex !== null) {
      setActiveImageIndex((activeImageIndex + 1) % validImages.length)
    }
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (activeImageIndex !== null) {
      setActiveImageIndex(
        (activeImageIndex - 1 + validImages.length) % validImages.length
      )
    }
  }

  return (
    <>
      <div className={`mt-3 select-none overflow-hidden rounded-xl ${className}`}>
        {count === 1 && (
          <div
            onClick={(e) => {
              e.stopPropagation()
              setActiveImageIndex(0)
            }}
            className={`group relative overflow-hidden rounded-xl border border-border/70 bg-muted/30 cursor-pointer ${
              compact ? "max-h-60" : "max-h-96"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[0]}
              alt="Community attachment"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xs">
                <ZoomIn className="h-3.5 w-3.5" />
                <span>تكبير</span>
              </span>
            </div>
          </div>
        )}

        {count === 2 && (
          <div className="grid grid-cols-2 gap-2">
            {validImages.map((src, idx) => (
              <div
                key={src}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImageIndex(idx)
                }}
                className={`group relative aspect-4/3 overflow-hidden rounded-xl border border-border/70 bg-muted/30 cursor-pointer ${
                  compact ? "max-h-48" : "max-h-72"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Community attachment ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-center justify-center">
                  <ZoomIn className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}

        {count === 3 && (
          <div className="grid grid-cols-3 gap-2">
            <div
              onClick={(e) => {
                e.stopPropagation()
                setActiveImageIndex(0)
              }}
              className={`group relative col-span-2 aspect-16/10 overflow-hidden rounded-xl border border-border/70 bg-muted/30 cursor-pointer ${
                compact ? "max-h-52" : "max-h-80"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={validImages[0]}
                alt="Community attachment 1"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-center justify-center">
                <ZoomIn className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {validImages.slice(1, 3).map((src, idx) => (
                <div
                  key={src}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImageIndex(idx + 1)
                  }}
                  className="group relative flex-1 aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted/30 cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Community attachment ${idx + 2}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-center justify-center">
                    <ZoomIn className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {count === 4 && (
          <div className="grid grid-cols-2 gap-2">
            {validImages.map((src, idx) => (
              <div
                key={src}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveImageIndex(idx)
                }}
                className={`group relative aspect-4/3 overflow-hidden rounded-xl border border-border/70 bg-muted/30 cursor-pointer ${
                  compact ? "max-h-40" : "max-h-60"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Community attachment ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-center justify-center">
                  <ZoomIn className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Dialog
        open={activeImageIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActiveImageIndex(null)
        }}
      >
        <DialogContent
          className="max-w-4xl p-0 overflow-hidden border-none bg-black/95 text-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogTitle className="sr-only">معاينة الصورة</DialogTitle>
          <div className="relative flex items-center justify-center min-h-[300px] max-h-[85vh]">
            {activeImageIndex !== null && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={validImages[activeImageIndex]}
                alt={`Image preview ${activeImageIndex + 1}`}
                className="max-h-[80vh] w-auto max-w-full object-contain select-none"
              />
            )}

            {/* Navigation buttons if multiple images */}
            {validImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute start-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-xs"
                  aria-label="Previous image"
                >
                  <ChevronRight className="h-6 w-6 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute end-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-xs"
                  aria-label="Next image"
                >
                  <ChevronLeft className="h-6 w-6 rtl:rotate-180" />
                </button>
              </>
            )}

            {/* Counter badge */}
            {validImages.length > 1 && activeImageIndex !== null && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-xs">
                {activeImageIndex + 1} / {validImages.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
