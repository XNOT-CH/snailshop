"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { themeClasses } from "@/lib/theme";

interface ProductGalleryProps {
    images: string[];
}

export function ProductGallery({ images }: Readonly<ProductGalleryProps>) {
    const galleryImages = images.length > 0
        ? images.map((url, index) => ({ id: `img-${index + 1}`, url }))
        : [{ id: "img-1", url: "/placeholder.jpg" }];
    const [selectedImage, setSelectedImage] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const showPrevImage = () => {
        setSelectedImage((current) => (current === 0 ? galleryImages.length - 1 : current - 1));
    };

    const showNextImage = () => {
        setSelectedImage((current) => (current === galleryImages.length - 1 ? 0 : current + 1));
    };

    return (
        <div className="space-y-4">
            {/* Main Image with Zoom Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className={`${themeClasses.surface} group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-[1.75rem] text-left`}
                    >
                        <Image
                            src={galleryImages[selectedImage].url}
                            alt="Product"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
                            priority
                        />
                        <div className={`${themeClasses.overlayScrim} absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100`}>
                            <div className={`${themeClasses.badge} rounded-full p-3 shadow-lg`}>
                                <ZoomIn className="h-6 w-6" />
                            </div>
                        </div>
                    </button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
                    <DialogTitle className="sr-only">Product Image View</DialogTitle>
                    <div className={`${themeClasses.surface} space-y-4 rounded-[1.75rem] p-4 backdrop-blur-md`}>
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/40 bg-background">
                            <Image
                                src={galleryImages[selectedImage].url}
                                alt="Product Full View"
                                fill
                                sizes="100vw"
                                className="object-contain"
                            />

                            {galleryImages.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={showPrevImage}
                                        className={`${themeClasses.badge} absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-primary hover:text-primary-foreground`}
                                        aria-label="ดูรูปก่อนหน้า"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={showNextImage}
                                        className={`${themeClasses.badge} absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-primary hover:text-primary-foreground`}
                                        aria-label="ดูรูปถัดไป"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </>
                            )}
                        </div>

                        {galleryImages.length > 1 && (
                            <div className="flex flex-wrap justify-center gap-3">
                                {galleryImages.map((image, index) => (
                                    <button
                                        key={`${image.id}-dialog`}
                                        type="button"
                                        onClick={() => setSelectedImage(index)}
                                        className={`relative aspect-square w-16 overflow-hidden rounded-xl border-2 transition ${selectedImage === index
                                            ? "border-primary shadow-[0_0_0_1px_rgba(88,166,255,0.45)]"
                                            : "border-border/50 opacity-75 hover:border-primary/40 hover:opacity-100"
                                            }`}
                                    >
                                        <Image
                                            src={image.url}
                                            alt={`เลือกดูรูป ${index + 1}`}
                                            fill
                                            sizes="64px"
                                            className="object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Thumbnail Row */}
            <div className="flex gap-3">
                {galleryImages.map((image, index) => (
                    <button
                        key={image.id}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-square w-16 overflow-hidden rounded-lg transition-all border-2 ${selectedImage === index
                            ? "border-primary shadow-[0_0_0_1px_rgba(88,166,255,0.28)]"
                            : "border-border/40 opacity-60 hover:border-primary/35 hover:opacity-100"
                            }`}
                    >
                        <Image
                            src={image.url}
                            alt={`View ${index + 1}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
