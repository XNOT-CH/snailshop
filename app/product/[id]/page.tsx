import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProductGallery } from "@/components/ProductGallery";
import { BuyButton } from "@/components/BuyButton";
import {
    ArrowLeft,
    Zap,
    TriangleAlert,
    MessageCircle,
    Shield,
    Clock,
    CheckCircle,
} from "lucide-react";
import { db } from "@/lib/db";

interface ProductDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({
    params,
}: ProductDetailPageProps) {
    const { id } = await params;

    // Fetch product from database
    const product = await db.product.findUnique({
        where: { id },
    });

    // If product not found, show 404
    if (!product) {
        notFound();
    }

    const isSold = Boolean(product.isSold);
    const price = Number(product.price);

    return (
        <div className="min-h-screen bg-background animate-page-enter">
            {/* Header Bar */}
            <div className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto flex h-14 items-center px-4">
                    <Link
                        href="/shop"
                        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับไปร้านค้า
                    </Link>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Product Detail Grid */}
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                    {/* Left Column - Gallery */}
                    <ProductGallery
                        mainImage={product.imageUrl || "/placeholder.jpg"}
                    />

                    {/* Right Column - Product Info */}
                    <div className="flex flex-col gap-6">
                        {/* Category & Title */}
                        <div>
                            <Badge variant="outline" className="mb-3">
                                {product.category}
                            </Badge>
                            <h1 className="text-3xl font-bold text-foreground lg:text-4xl">
                                {product.name}
                            </h1>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-bold text-primary">
                                ฿{price.toLocaleString()}
                            </span>
                            {!isSold && (
                                <Badge className="bg-green-600 hover:bg-green-600">
                                    พร้อมขาย
                                </Badge>
                            )}
                            {isSold && (
                                <Badge variant="destructive">ขายแล้ว</Badge>
                            )}
                        </div>

                        {/* Features */}
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                ส่งทันที
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-500" />
                                ปลอดภัย
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-500" />
                                ซัพพอร์ต 24/7
                            </div>
                        </div>

                        {/* Warning Alert */}
                        <Alert variant="default" className="border-amber-200 bg-amber-50">
                            <TriangleAlert className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">
                                ข้อควรระวัง
                            </AlertTitle>
                            <AlertDescription className="text-amber-700">
                                สินค้าประเภท Digital ID ซื้อแล้วไม่รับเปลี่ยนคืน
                                กรุณาตรวจสอบรายละเอียดก่อนชำระเงิน
                                และเปลี่ยนรหัสผ่านทันทีหลังได้รับสินค้า
                            </AlertDescription>
                        </Alert>

                        {/* Description */}
                        {product.description && (
                            <div className="rounded-xl bg-card p-6 border border-border">
                                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    รายละเอียดสินค้า
                                </h2>
                                <div className="prose prose-slate max-w-none">
                                    <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                                        {product.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-auto space-y-3 pt-4">
                            <BuyButton
                                productId={product.id}
                                price={price}
                                disabled={isSold}
                            />
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full gap-2 rounded-xl"
                            >
                                <MessageCircle className="h-5 w-5" />
                                ติดต่อเรา
                            </Button>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex items-center justify-center gap-6 border-t border-border pt-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Shield className="h-4 w-4" />
                                ชำระปลอดภัย
                            </div>
                            <div className="flex items-center gap-1">
                                <Zap className="h-4 w-4" />
                                ส่งอัตโนมัติ
                            </div>
                            <div className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4" />
                                ผู้ขายยืนยัน
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
