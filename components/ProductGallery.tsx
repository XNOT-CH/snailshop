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

export function ProductGallery({ mainImage }: Readonly<ProductGalleryProps>) {
    // Since DB has only 1 image, simulate multiple angles
    const images = [
        { id: "img-1", url: mainImage },
        { id: "img-2", url: mainImage },
        { id: "img-3", url: mainImage },
        { id: "img-4", url: mainImage },
    ];
    const [selectedImage, setSelectedImage] = useState(0);

    return (
        <div className="space-y-4">
            {/* Main Image with Zoom Dialog */}
            <Dialog>
                <DialogTrigger asChild>
                    <div className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-zinc-100">
                        <Image
                            src={images[selectedImage].url}
                            alt="Product"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover"
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
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                        <Image
                            src={images[selectedImage].url}
                            alt="Product Full View"
                            fill
                            sizes="100vw"
                            className="object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Thumbnail Row */}
            <div className="flex gap-3">
                {images.map((image, index) => (
                    <button
                        key={image.id}
                        onClick={() => setSelectedImage(index)}
                        className={`relative aspect-square w-16 overflow-hidden rounded-lg transition-all border-2 ${selectedImage === index
                            ? "border-blue-500"
                            : "border-transparent opacity-60 hover:opacity-100"
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
