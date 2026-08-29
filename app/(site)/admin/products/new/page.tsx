"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Banknote,
    Eye,
    Gem,
    Loader2,
    Package,
    Plus,
    Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrencySettings } from "@/hooks/useCurrencySettings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsProvider";
import { ProductAutoDeleteField } from "@/components/admin/ProductAutoDeleteField";
import { ProductImageGalleryField } from "@/components/admin/ProductImageGalleryField";
import { ProductStockDraftList } from "@/components/admin/ProductStockDraftList";
import { ProductStockPasteField } from "@/components/admin/ProductStockPasteField";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { getPointCurrencyName } from "@/lib/currencySettings";
import { PERMISSIONS } from "@/lib/permissions";
import { showConfirm, showError, showSuccess } from "@/lib/swal";
import { findDuplicateStockUser, formatStockEntry, getStockUser, splitStock, type ParsedStockLine, type StockSeparatorType } from "@/lib/stock";
import { getAutoDeleteAfterSaleValue } from "@/lib/features/products/autoDelete";
import {
    getCalculatedDiscountPrice,
    getDiscountAmountButtonLabel,
    getDiscountErrorText,
    getDiscountHint,
    getDiscountInputStep,
    getDiscountPlaceholder,
    getDiscountSummary,
    getDiscountValueValidationMessage,
    getNormalizedDiscountPrice,
    getPriceInputPlaceholder,
    getPriceInputStep,
    type DiscountMode,
} from "@/lib/features/products/pricing";

export default function AddProductPage() {
    const router = useRouter();
    const currencySettings = useCurrencySettings();
    const pointCurrencyName = getPointCurrencyName(currencySettings);
    const permissions = useAdminPermissions();
    const canCreateProduct = permissions.includes(PERMISSIONS.PRODUCT_CREATE);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        price: "",
        discountPrice: "",
        images: [] as string[],
        category: "",
        description: "",
        secretData: "",
        currency: "THB",
        stockSeparator: "newline" as StockSeparatorType,
    });
    const [singleUser, setSingleUser] = useState("");
    const [singlePass, setSinglePass] = useState("");
    const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
    const [knownCategories, setKnownCategories] = useState<string[]>([]);
    const [highlightFrom, setHighlightFrom] = useState<number | null>(null);
    const [hasSaved, setHasSaved] = useState(false);
    const [stockMode, setStockMode] = useState<"single" | "paste">("single");
    const [autoDeleteEnabled, setAutoDeleteEnabled] = useState(false);
    const [autoDeleteAfterSale, setAutoDeleteAfterSale] = useState("");

    const stockItems = useMemo(
        () => splitStock(formData.secretData, formData.stockSeparator),
        [formData.secretData, formData.stockSeparator]
    );
    // Everything typed so far lives only in this component's state, so leaving the
    // page throws it away. Anything filled in counts as work worth warning about.
    const isDirty =
        !hasSaved &&
        (formData.title.trim().length > 0 ||
            formData.price.trim().length > 0 ||
            formData.discountPrice.trim().length > 0 ||
            formData.category.trim().length > 0 ||
            formData.description.trim().length > 0 ||
            formData.secretData.length > 0 ||
            formData.images.length > 0 ||
            singleUser.trim().length > 0 ||
            singlePass.trim().length > 0 ||
            autoDeleteAfterSale.trim().length > 0);

    const stockUsers = useMemo(() => stockItems.map((item) => getStockUser(item)), [stockItems]);
    const isNewCategory =
        formData.category.trim().length > 0 &&
        knownCategories.length > 0 &&
        !knownCategories.includes(formData.category.trim());
    const hasDiscountPrice = formData.discountPrice.trim().length > 0;
    const priceNumber = Number(formData.price);
    const discountInputNumber = Number(formData.discountPrice);
    const isDiscountValueValid =
        !hasDiscountPrice ||
        (Number.isFinite(discountInputNumber) &&
            discountInputNumber > 0 &&
            (discountMode === "percent" ? discountInputNumber < 100 : discountInputNumber < priceNumber));
    const calculatedDiscountPrice = getCalculatedDiscountPrice(
        hasDiscountPrice,
        isDiscountValueValid,
        priceNumber,
        discountInputNumber,
        discountMode,
        formData.currency,
    );
    const normalizedDiscountPrice = getNormalizedDiscountPrice(calculatedDiscountPrice);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/admin/products/categories")
            .then((response) => response.json())
            .then((data: { success: boolean; categories?: string[] }) => {
                if (!cancelled && data.success) {
                    setKnownCategories(data.categories ?? []);
                }
            })
            .catch(() => {
                if (!cancelled) setKnownCategories([]);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Asks about the usernames on screen only. This page used to download every
    // username in the shop on load just to warn about the few being typed in.
    const checkStockUsers = useCallback(async (users: string[]) => {
        if (users.length === 0) return {};

        try {
            const response = await fetchWithCsrf("/api/admin/products/stock-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ users }),
            });
            const data = await response.json() as { success: boolean; conflicts?: Record<string, string> };
            return data.success ? data.conflicts ?? {} : {};
        } catch {
            return {};
        }
    }, []);

    useEffect(() => {
        if (!isDirty) return;

        const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", warnBeforeLeaving);
        return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
    }, [isDirty]);

    const handleLeave = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (!isDirty) return;

        event.preventDefault();
        const confirmed = await showConfirm(
            "ออกจากหน้านี้?",
            "ข้อมูลสินค้าและสต๊อกที่กรอกไว้จะหายทั้งหมด",
            "ออกโดยไม่บันทึก",
            "อยู่ต่อ"
        );
        if (confirmed) {
            router.push("/admin/products");
        }
    };

    const handleAddSingleStock = async () => {
        if (!singleUser.trim() || !singlePass.trim()) {
            showError("กรุณากรอก User และ Pass");
            return;
        }

        const newUser = singleUser.trim();
        if (stockItems.some((item) => getStockUser(item) === newUser)) {
            showError(`User "${newUser}" มีในสต็อกอยู่แล้ว`);
            return;
        }

        const conflicts = await checkStockUsers([newUser]);
        if (conflicts[newUser]) {
            showError(`User "${newUser}" มีอยู่ในสต็อกของสินค้า "${conflicts[newUser]}" แล้ว`);
            return;
        }

        setHighlightFrom(stockItems.length);
        setFormData((prev) => ({
            ...prev,
            secretData: [prev.secretData, formatStockEntry(newUser, singlePass)].filter(Boolean).join("\n"),
        }));
        setSingleUser("");
        setSinglePass("");
    };

    const handleAddPastedStock = (entries: ParsedStockLine[]) => {
        if (entries.length === 0) return;

        const added = entries.map((entry) => formatStockEntry(entry.user, entry.pass));
        setHighlightFrom(stockItems.length);
        setFormData((prev) => ({
            ...prev,
            secretData: [prev.secretData, added.join("\n")].filter(Boolean).join("\n"),
        }));
    };

    const rebuildSecretData = (items: string[]) => {
        setFormData((prev) => ({ ...prev, secretData: items.join("\n") }));
    };

    const handleStockItemsChange = (items: string[]) => {
        setHighlightFrom(null);
        rebuildSecretData(items);
    };

    const handleStockFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== "Enter") return;

        event.preventDefault();
        void handleAddSingleStock();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!canCreateProduct) {
            return;
        }

        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!canCreateProduct) {
            showError("คุณไม่มีสิทธิ์เพิ่มสินค้า");
            return;
        }

        if (!formData.title.trim()) {
            showError("กรุณากรอกชื่อสินค้า");
            return;
        }
        if (!formData.price) {
            showError("กรุณากรอกราคา");
            return;
        }
        if (!formData.category.trim()) {
            showError("กรุณากรอกหมวดหมู่");
            return;
        }
        if (hasDiscountPrice) {
            if (!Number.isFinite(discountInputNumber) || discountInputNumber <= 0) {
                showError(getDiscountValueValidationMessage(discountMode));
                return;
            }
            if (discountMode === "percent" && discountInputNumber >= 100) {
                showError("ส่วนลดแบบเปอร์เซ็นต้องน้อยกว่า 100%");
                return;
            }
            if (normalizedDiscountPrice === null) {
                showError("ราคาหลังลดต้องมากกว่า 0");
                return;
            }
        }

        const duplicateUser = findDuplicateStockUser(formData.secretData, formData.stockSeparator);
        if (duplicateUser) {
            showError(`User "${duplicateUser}" มีในสต็อกอยู่แล้ว`);
            return;
        }

        const category = formData.category.trim();
        if (knownCategories.length > 0 && !knownCategories.includes(category)) {
            const confirmed = await showConfirm(
                "สร้างหมวดหมู่ใหม่?",
                `ยังไม่มีหมวดหมู่ "${category}" ในร้าน สินค้าชิ้นนี้จะสร้างหมวดใหม่ขึ้นมา`,
                "ใช่ สร้างหมวดใหม่",
                "กลับไปแก้"
            );
            if (!confirmed) return;
        }

        if (stockItems.length === 0) {
            const confirmed = await showConfirm(
                "ยังไม่มีสต๊อก",
                "สินค้าจะขึ้นหน้าร้านในสภาพที่ลูกค้ากดซื้อไม่ได้จนกว่าจะเพิ่มสต๊อก",
                "สร้างแบบไม่มีสต๊อก",
                "กลับไปเพิ่มสต๊อก"
            );
            if (!confirmed) return;
        }

        setIsLoading(true);
        try {
            const response = await fetchWithCsrf("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    category,
                    autoDeleteAfterSale: getAutoDeleteAfterSaleValue(autoDeleteEnabled, autoDeleteAfterSale),
                    image: formData.images[0] || "",
                    discountPrice: normalizedDiscountPrice === null ? "" : String(normalizedDiscountPrice),
                }),
            });

            const data = await response.json();
            if (data.success) {
                setHasSaved(true);
                showSuccess("สร้างสินค้าสำเร็จ");
                router.push("/admin/products");
            } else {
                showError(`เกิดข้อผิดพลาด: ${data.message}`);
            }
        } catch (error) {
            console.error("[NEW_PRODUCT_SUBMIT]", error);
            showError("ไม่สามารถสร้างสินค้าได้ กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-product-new-page space-y-6">
            <Link
                href="/admin/products"
                onClick={handleLeave}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                กลับไปรายการสินค้า
            </Link>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2d4362] dark:bg-[#0f1927]">
                        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 dark:border-[#2d4362]">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#145de7] text-white">
                                <Shield className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-foreground">ข้อมูลสินค้า</span>
                        </div>

                        <div className="space-y-6 p-5">
                            <div className="space-y-2">
                                <Label htmlFor="title">ชื่อสินค้า *</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="เช่น Valorant ID (Diamond Rank)"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    disabled={!canCreateProduct}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>ประเภทสกุลเงิน *</Label>
                                <RadioGroup
                                    value={formData.currency}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, currency: value }))
                                    }
                                    className="grid gap-3 sm:grid-cols-2"
                                    disabled={!canCreateProduct}
                                >
                                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 dark:border-[#355071] dark:bg-[#132133] dark:hover:border-[#4b7098]">
                                        <RadioGroupItem value="THB" id="currency-thb" />
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <Banknote className="h-4 w-4 text-green-600" />
                                            บาท (THB)
                                        </span>
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 dark:border-[#355071] dark:bg-[#132133] dark:hover:border-[#4b7098]">
                                        <RadioGroupItem value="POINT" id="currency-point" />
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            <Gem className="h-4 w-4 text-purple-600" />
                                            {pointCurrencyName} (POINT)
                                        </span>
                                    </label>
                                </RadioGroup>
                                {formData.currency === "POINT" && (
                                    <p className="text-xs text-purple-600">
                                        สินค้านี้จะซื้อได้ด้วย {pointCurrencyName} เท่านั้น
                                    </p>
                                )}
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="price" className="flex items-center gap-2">
                                        {formData.currency === "POINT" ? (
                                            <>
                                                <Gem className="h-4 w-4 text-purple-600" />
                                                ราคา ({pointCurrencyName}) *
                                            </>
                                        ) : (
                                            <>ราคาเต็ม (฿) *</>
                                        )}
                                    </Label>
                                    <Input
                                        id="price"
                                        name="price"
                                        type="number"
                                        placeholder={getPriceInputPlaceholder(formData.currency)}
                                        min="0"
                                        step={getPriceInputStep(formData.currency)}
                                        value={formData.price}
                                        onChange={handleChange}
                                        required
                                        disabled={!canCreateProduct}
                                        className={
                                            formData.currency === "POINT"
                                                ? "border-purple-300 focus:border-purple-500"
                                                : ""
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="discountPrice" className="flex items-center gap-2">
                                        ส่วนลด
                                    </Label>
                                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/75 p-3 dark:border-[#355071] dark:bg-[#162334]">
                                            <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={discountMode === "amount" ? "default" : "outline"}
                                                className="rounded-xl"
                                                onClick={() => setDiscountMode("amount")}
                                                disabled={!canCreateProduct}
                                            >
                                                {getDiscountAmountButtonLabel(formData.currency, pointCurrencyName)}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={discountMode === "percent" ? "default" : "outline"}
                                                className="rounded-xl"
                                                onClick={() => setDiscountMode("percent")}
                                                disabled={!canCreateProduct}
                                            >
                                                ลดเป็น %
                                            </Button>
                                        </div>
                                        <Input
                                            id="discountPrice"
                                            name="discountPrice"
                                            type="number"
                                            placeholder={getDiscountPlaceholder(discountMode)}
                                            min="0"
                                            max={discountMode === "percent" ? "99.99" : undefined}
                                            step={getDiscountInputStep(discountMode, formData.currency)}
                                            value={formData.discountPrice}
                                            onChange={handleChange}
                                            disabled={!canCreateProduct}
                                            className={
                                                hasDiscountPrice
                                                    ? "border-amber-300 bg-amber-50/40 focus:border-amber-500"
                                                    : "bg-white dark:bg-[#132133]"
                                            }
                                        />
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                {getDiscountHint(discountMode, formData.currency, pointCurrencyName)}
                                            </span>
                                            {hasDiscountPrice && !isDiscountValueValid ? (
                                                <span className="font-medium text-rose-600">
                                                    {getDiscountErrorText(discountMode)}
                                                </span>
                                            ) : normalizedDiscountPrice !== null && (
                                                <span className="font-medium text-amber-700">
                                                    {getDiscountSummary(
                                                        discountMode,
                                                        formData.currency,
                                                        pointCurrencyName,
                                                        discountInputNumber,
                                                        normalizedDiscountPrice,
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        หากตั้งค่าส่วนลด สินค้าจะแสดงใน &quot;สินค้าลดราคา&quot;
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">หมวดหมู่ *</Label>
                                <Input
                                    id="category"
                                    name="category"
                                    list="known-product-categories"
                                    placeholder="เช่น ROV, Valorant, Genshin"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    disabled={!canCreateProduct}
                                    autoComplete="off"
                                />
                                <datalist id="known-product-categories">
                                    {knownCategories.map((category) => (
                                        <option key={category} value={category} />
                                    ))}
                                </datalist>
                                {isNewCategory ? (
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        หมวดหมู่ใหม่ — ยังไม่มีสินค้าอื่นใช้ชื่อนี้
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-3">
                                <Label>รูปภาพสินค้า</Label>
                                <div className="admin-product-image-panel rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#355071] dark:bg-[#162334]">
                                    <ProductImageGalleryField
                                        images={formData.images}
                                        disabled={!canCreateProduct}
                                        onChange={(images) => setFormData((prev) => ({ ...prev, images }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">รายละเอียด</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="รายละเอียดสินค้า เช่น แรงค์, สกินที่มี, Agent ที่ปลดล็อก..."
                                    rows={4}
                                    value={formData.description}
                                    onChange={handleChange}
                                    disabled={!canCreateProduct}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>การลบอัตโนมัติ</Label>
                                <ProductAutoDeleteField
                                    enabled={autoDeleteEnabled}
                                    onEnabledChange={setAutoDeleteEnabled}
                                    minutes={autoDeleteAfterSale}
                                    onMinutesChange={setAutoDeleteAfterSale}
                                    disabled={!canCreateProduct}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2d4362] dark:bg-[#0f1927]">
                            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 dark:border-[#2d4362]">
                                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white">
                                    <Package className="h-4 w-4" />
                                </div>
                                <span className="font-bold text-foreground">เพิ่มสต๊อก</span>
                                {stockItems.length > 0 && (
                                    <Badge variant="secondary" className="ml-auto">
                                        {stockItems.length} รายการ
                                    </Badge>
                                )}
                            </div>

                            <div className="space-y-4 p-5">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={stockMode === "single" ? "default" : "outline"}
                                        className="rounded-xl"
                                        onClick={() => setStockMode("single")}
                                        disabled={!canCreateProduct}
                                    >
                                        ทีละรายการ
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={stockMode === "paste" ? "default" : "outline"}
                                        className="rounded-xl"
                                        onClick={() => setStockMode("paste")}
                                        disabled={!canCreateProduct}
                                    >
                                        วางหลายรายการ
                                    </Button>
                                </div>

                                {stockMode === "paste" ? (
                                    <ProductStockPasteField
                                        existingUsers={stockUsers}
                                        onCheckUsers={checkStockUsers}
                                        onAdd={handleAddPastedStock}
                                        disabled={!canCreateProduct}
                                    />
                                ) : (
                                <>
                                <div className="space-y-2">
                                    <Label htmlFor="singleUser">User *</Label>
                                    <Input
                                        id="singleUser"
                                        placeholder="เช่น username123"
                                        value={singleUser}
                                        onChange={(e) => setSingleUser(e.target.value)}
                                        onKeyDown={handleStockFieldKeyDown}
                                        disabled={!canCreateProduct}
                                        className="font-mono"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="singlePass">Pass *</Label>
                                    <Input
                                        id="singlePass"
                                        placeholder="เช่น password456"
                                        value={singlePass}
                                        onChange={(e) => setSinglePass(e.target.value)}
                                        onKeyDown={handleStockFieldKeyDown}
                                        disabled={!canCreateProduct}
                                        className="font-mono"
                                    />
                                </div>

                                <Button
                                    type="button"
                                    className="w-full gap-2 rounded-xl bg-[#145de7] text-white hover:bg-[#114fc4]"
                                    onClick={handleAddSingleStock}
                                    disabled={!canCreateProduct}
                                >
                                    <Plus className="h-4 w-4" />
                                    เพิ่มสต๊อก
                                </Button>
                                </>
                                )}

                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                    แต่ละรายการจะถูกส่งให้ลูกค้าทีละ 1 ชิ้นเมื่อซื้อ
                                </p>
                            </div>
                        </div>

                        {stockItems.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2d4362] dark:bg-[#0f1927]">
                                <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3.5 dark:border-[#2d4362]">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#145de7] text-white">
                                        <Eye className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-foreground">รายการสต๊อก</span>
                                </div>

                                <div className="p-5">
                                    <ProductStockDraftList
                                        items={stockItems}
                                        onChange={handleStockItemsChange}
                                        highlightFrom={highlightFrom}
                                        disabled={!canCreateProduct}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-4 z-10 flex justify-end">
                    <div className="flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-[#355071] dark:bg-[#0f1927]/95">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#eef4ff]">พร้อมสร้างสินค้าใหม่</p>
                            <p className="text-xs text-slate-500 dark:text-[#96adca]">สต๊อกเริ่มต้น {stockItems.length} รายการ</p>
                        </div>
                        <Button
                            type="submit"
                            className="min-w-[150px] rounded-xl bg-[#145de7] text-white hover:bg-[#114fc4]"
                            size="lg"
                            disabled={!canCreateProduct || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังสร้าง...
                                </>
                            ) : (
                                "สร้างสินค้า"
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
