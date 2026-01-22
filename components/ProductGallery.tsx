"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogTitle,
} from "@/components/ui/dialog";
import { ZoomIn } from "lucide-react";

interface ProductGalleryProps {
    mainImage: string;
}

export function ProductGallery({ mainImage }: ProductGalleryProps) {
    // Since DB has only 1 image, simulate multiple angles
    const images = [mainImage, mainImage, mainImage, mainImage];
    const [selectedImage, setSelectedImage] = useState(0);

    return (
        <div className="space-y-4">
            {/* Main Image with Zoom Dialog */}
            <Dialog>
                <DialogTrigger asChild>
                    <div className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-100">
                        <Image
                            src={images[selectedImage]}
                            alt="Product"
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            priority
                        />
                        {/* Zoom Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                            <div className="rounded-full bg-white/90 p-3 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                <ZoomIn className="h-6 w-6 text-zinc-700" />
                            </div>
                        </div>
                    </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl border-0 bg-transparent p-0 shadow-none">
                    <DialogTitle className="sr-only">Product Image View</DialogTitle>
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
                        <Image
                            src={images[selectedImage]}
                            alt="Product Full View"
                            fill
                            className="object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Thumbnail Row */}
            <div className="flex gap-3">
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-video w-20 overflow-hidden rounded-lg transition-all ${selectedImage === index
                            ? "ring-2 ring-indigo-600 ring-offset-2"
                            : "opacity-60 hover:opacity-100"
                            }`}
                    >
                        <Image
                            src={image}
                            alt={`View ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}
