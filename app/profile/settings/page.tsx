"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    User,
    Mail,
    Lock,
    Phone,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Save,
    MapPin,
    FileText,
    Truck,
    Pencil,
    Upload,
    X,
    Image as ImageIcon,
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { updateProfile } from "@/lib/actions/user";
import { showLoading, hideLoading, showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { ThaiAddressSelector } from "@/components/ThaiAddressSelector";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { compressImage } from "@/lib/compressImage";

interface AddressData {
    fullName: string;
    phone: string;
    address: string;
    province: string;
    district: string;
    subdistrict: string;
    postalCode: string;
}

interface UserProfile {
    id: string;
    name: string | null;
    username: string;
    email: string | null;
    phone: string | null;
    image: string | null;
    role: string;
    creditBalance: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    firstName: string | null;
    lastName: string | null;
    firstNameEn: string | null;
    lastNameEn: string | null;
    taxFullName: string | null;
    taxPhone: string | null;
    taxAddress: string | null;
    taxProvince: string | null;
    taxDistrict: string | null;
    taxSubdistrict: string | null;
    taxPostalCode: string | null;
    shipFullName: string | null;
    shipPhone: string | null;
    shipAddress: string | null;
    shipProvince: string | null;
    shipDistrict: string | null;
    shipSubdistrict: string | null;
    shipPostalCode: string | null;
}

const emptyAddress: AddressData = {
    fullName: "",
    phone: "",
    address: "",
    province: "",
    district: "",
    subdistrict: "",
    postalCode: "",
};

export default function ProfileSettingsPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        image: "",
        firstName: "",
        lastName: "",
        firstNameEn: "",
        lastNameEn: "",
        password: "",
        confirmPassword: "",
    });
    const [taxAddress, setTaxAddress] = useState<AddressData>({ ...emptyAddress });
    const [shipAddress, setShipAddress] = useState<AddressData>({ ...emptyAddress });
    const [editingTax, setEditingTax] = useState(false);
    const [editingShip, setEditingShip] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const hasProfileImage = Boolean(formData.image?.trim());
    const profileInitial = (formData.name || profile?.username || "U").trim().charAt(0).toUpperCase();
    const elevatedCardClass =
        "border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.28)]";
    const addressCardClass =
        "border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)]";
    const saveButtonClass =
        "h-11 w-full gap-2 rounded-2xl bg-blue-600 px-6 text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.75)] transition hover:bg-blue-700 hover:shadow-[0_18px_36px_-18px_rgba(29,78,216,0.75)] sm:w-auto sm:min-w-[148px]";

    const buildSubmitData = (section: "contact" | "personal" | "password" | "tax" | "ship") => {
        switch (section) {
            case "contact":
                return {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                };
            case "personal":
                return {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    firstNameEn: formData.firstNameEn,
                    lastNameEn: formData.lastNameEn,
                    image: formData.image,
                };
            case "password":
                return {
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                };
            case "tax":
                return {
                    taxAddress,
                };
            case "ship":
                return {
                    shippingAddress: shipAddress,
                };
        }
    };

    // Fetch current profile on mount
    useEffect(() => {
        async function fetchProfile() {
            setIsFetching(true);
            try {
                const res = await fetch("/api/profile");
                const data = await res.json();
                if (data.success && data.data) {
                    const user = data.data as UserProfile;
                    setProfile(user);
                    setFormData({
                        name: user.name || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        image: user.image || "",
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        firstNameEn: user.firstNameEn || "",
                        lastNameEn: user.lastNameEn || "",
                        password: "",
                        confirmPassword: "",
                    });
                    setTaxAddress({
                        fullName: user.taxFullName || "",
                        phone: user.taxPhone || "",
                        address: user.taxAddress || "",
                        province: user.taxProvince || "",
                        district: user.taxDistrict || "",
                        subdistrict: user.taxSubdistrict || "",
                        postalCode: user.taxPostalCode || "",
                    });
                    setShipAddress({
                        fullName: user.shipFullName || "",
                        phone: user.shipPhone || "",
                        address: user.shipAddress || "",
                        province: user.shipProvince || "",
                        district: user.shipDistrict || "",
                        subdistrict: user.shipSubdistrict || "",
                        postalCode: user.shipPostalCode || "",
                    });
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            }
            setIsFetching(false);
        }
        fetchProfile();
    }, []);

    const handleSubmit = async (section: "contact" | "personal" | "password" | "tax" | "ship") => {
        setErrors({});

        // Client-side password match check
        if (section === "password" && formData.password && formData.password !== formData.confirmPassword) {
            setErrors({ confirmPassword: ["รหัสผ่านไม่ตรงกัน"] });
            return;
        }

        setIsLoading(true);
        showLoading("กำลังบันทึก...");

        try {
            const submitData = buildSubmitData(section);
            const result = await updateProfile(submitData);

            hideLoading();

            if (result.success) {
                await showSuccessAlert("สำเร็จ!", result.message);
                // Clear password fields after success
                if (section === "password") {
                    setFormData(prev => ({
                        ...prev,
                        password: "",
                        confirmPassword: "",
                    }));
                }
                setEditingTax(false);
                setEditingShip(false);
                // Refresh profile data
                try {
                    const res = await fetch("/api/profile");
                    const refreshData = await res.json();
                    if (refreshData.success && refreshData.data) {
                        setProfile(refreshData.data as UserProfile);
                    }
                } catch { }
                router.refresh();
            } else {
                if (result.errors) {
                    setErrors(result.errors);
                }
                await showErrorAlert("เกิดข้อผิดพลาด", result.message);
            }
        } catch {
            hideLoading();
            await showErrorAlert("เกิดข้อผิดพลาด", "ไม่สามารถอัปเดตโปรไฟล์ได้");
        } finally {
            setIsLoading(false);
        }
    };

    const passwordsMatch = !formData.confirmPassword || formData.password === formData.confirmPassword;

    const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        try {
            const compressed = await compressImage(file, 350 * 1024);
            const uploadFormData = new FormData();
            uploadFormData.append("file", compressed);

            const response = await fetchWithCsrf("/api/profile/upload-image", {
                method: "POST",
                body: uploadFormData,
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
            }

            setFormData((prev) => ({
                ...prev,
                image: data.url,
            }));
            setProfile((prev) => (prev ? { ...prev, image: data.url } : prev));
            router.refresh();
            await showSuccessAlert("สำเร็จ!", "อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว");
        } catch (error) {
            await showErrorAlert(
                "อัปโหลดไม่สำเร็จ",
                error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์"
            );
        } finally {
            setIsUploadingImage(false);
            event.target.value = "";
        }
    };

    const clearProfileImage = async () => {
        if (!hasProfileImage) return;

        setIsUploadingImage(true);
        try {
            const response = await fetchWithCsrf("/api/profile/upload-image", {
                method: "DELETE",
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "ลบรูปโปรไฟล์ไม่สำเร็จ");
            }

            setFormData((prev) => ({
                ...prev,
                image: "",
            }));
            setProfile((prev) => (prev ? { ...prev, image: null } : prev));
            router.refresh();
            await showSuccessAlert("สำเร็จ!", "ลบรูปโปรไฟล์เรียบร้อยแล้ว");
        } catch (error) {
            await showErrorAlert(
                "ลบรูปไม่สำเร็จ",
                error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการลบรูปโปรไฟล์"
            );
        } finally {
            setIsUploadingImage(false);
            if (profileImageInputRef.current) {
                profileImageInputRef.current.value = "";
            }
        }
    };

    const handleProfileImagePreviewError = () => {
        setFormData((prev) => ({
            ...prev,
            image: "",
        }));
    };

    const hasAddressData = (addr: AddressData) => {
        return Object.values(addr).some(v => v && v.trim() !== "");
    };

    const renderAddressDisplay = (addr: AddressData) => {
        if (!hasAddressData(addr)) {
            return <p className="text-sm text-muted-foreground italic">ยังไม่ได้กรอกข้อมูล</p>;
        }
        return (
            <div className="text-sm text-foreground space-y-1">
                {addr.fullName && <p><span className="font-medium">ชื่อ - สกุล:</span> {addr.fullName}</p>}
                {addr.phone && <p><span className="font-medium">โทรศัพท์:</span> {addr.phone}</p>}
                {addr.address && <p><span className="font-medium">ที่อยู่:</span> {addr.address}</p>}
                {(addr.subdistrict || addr.district || addr.province) && (
                    <p>
                        <span className="font-medium">ตำบล/อำเภอ/จังหวัด:</span>{" "}
                        {[addr.subdistrict, addr.district, addr.province].filter(Boolean).join(" / ")}
                    </p>
                )}
                {addr.postalCode && <p><span className="font-medium">รหัสไปรษณีย์:</span> {addr.postalCode}</p>}
            </div>
        );
    };

    const renderAddressForm = (
        addr: AddressData,
        setAddr: React.Dispatch<React.SetStateAction<AddressData>>,
        prefix: string
    ) => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`${prefix}-fullName`}>ชื่อ - สกุล</Label>
                    <Input
                        id={`${prefix}-fullName`}
                        placeholder="ชื่อ - สกุล"
                        value={addr.fullName}
                        onChange={(e) => setAddr(prev => ({ ...prev, fullName: e.target.value }))}
                        className="bg-muted/60 border-border"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${prefix}-phone`}>หมายเลขโทรศัพท์</Label>
                    <Input
                        id={`${prefix}-phone`}
                        placeholder="0xx-xxx-xxxx"
                        value={addr.phone}
                        onChange={(e) => setAddr(prev => ({ ...prev, phone: e.target.value }))}
                        className="bg-muted/60 border-border"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${prefix}-address`}>ที่อยู่</Label>
                <Input
                    id={`${prefix}-address`}
                    placeholder="บ้านเลขที่ ซอย ถนน"
                    value={addr.address}
                    onChange={(e) => setAddr(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-muted/60 border-border"
                />
            </div>
            {/* Dependent Address Dropdowns */}
            <ThaiAddressSelector
                value={{
                    province: addr.province,
                    district: addr.district,
                    subdistrict: addr.subdistrict,
                    postalCode: addr.postalCode,
                }}
                onChange={(newValue) => {
                    setAddr(prev => ({
                        ...prev,
                        province: newValue.province,
                        district: newValue.district,
                        subdistrict: newValue.subdistrict,
                        postalCode: newValue.postalCode,
                    }));
                }}
                idPrefix={prefix}
            />
        </div>
    );

    if (isFetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Alert className="max-w-md border-red-500/25 bg-red-500/10 text-foreground">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600 dark:text-red-300">
                        กรุณาเข้าสู่ระบบเพื่อแก้ไขโปรไฟล์
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background px-3 py-6 sm:px-4 sm:py-8">
            <div className="mx-auto w-full max-w-[84rem] space-y-5">
                {/* Breadcrumb */}
                <PageBreadcrumb
                    items={[
                        { label: "แดชบอร์ด", href: "/dashboard" },
                        { label: "ข้อมูลผู้ใช้" },
                    ]}
                />

                {/* Page Header */}
                <div className="flex items-center gap-4">
                    <div className="rounded-2xl border border-primary/15 bg-primary/10 p-3 shadow-sm">
                        <User className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">ข้อมูลผู้ใช้</h1>
                        <p className="text-muted-foreground">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ</p>
                    </div>
                </div>

                {/* Row 1: Contact Info + Personal Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Contact Info Card */}
                    <Card className={elevatedCardClass}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                                <Phone className="h-5 w-5" />
                                ข้อมูลติดต่อ
                            </CardTitle>
                            <CardDescription>เบอร์มือถือและอีเมลสำหรับการติดต่อ</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Username (read-only) */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    Username
                                </Label>
                                <Input
                                    value={profile.username}
                                    disabled
                                    className="bg-muted text-muted-foreground border-border"
                                />
                                <p className="text-xs text-muted-foreground">Username ไม่สามารถเปลี่ยนได้</p>
                            </div>

                            {/* Display Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    ชื่อที่แสดง <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="กรอกชื่อของคุณ"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                    required
                                    className="bg-muted/50 border-border"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">{errors.name[0]}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    เบอร์มือถือ
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="0812345678"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            phone: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-500">{errors.phone[0]}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    อีเมล
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            email: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email[0]}</p>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-3">
                                <Button
                                    type="button"
                                    onClick={() => handleSubmit("contact")}
                                    className={saveButtonClass}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    บันทึก
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Personal Info Card */}
                    <Card className={elevatedCardClass}>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                                <User className="h-5 w-5" />
                                ข้อมูลส่วนตัว
                            </CardTitle>
                            <CardDescription>ชื่อและนามสกุล (ภาษาไทยและภาษาอังกฤษ)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Thai Name */}
                            <div className="space-y-2">
                                <Label htmlFor="firstName">ชื่อ (ภาษาไทย)</Label>
                                <Input
                                    id="firstName"
                                    type="text"
                                    placeholder="ชื่อ"
                                    value={formData.firstName}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            firstName: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">นามสกุล (ภาษาไทย)</Label>
                                <Input
                                    id="lastName"
                                    type="text"
                                    placeholder="นามสกุล"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            lastName: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                            </div>

                            {/* English Name */}
                            <div className="space-y-2">
                                <Label htmlFor="firstNameEn">ชื่อ (ภาษาอังกฤษ)</Label>
                                <Input
                                    id="firstNameEn"
                                    type="text"
                                    placeholder="First name"
                                    value={formData.firstNameEn}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            firstNameEn: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastNameEn">นามสกุล (ภาษาอังกฤษ)</Label>
                                <Input
                                    id="lastNameEn"
                                    type="text"
                                    placeholder="Last name"
                                    value={formData.lastNameEn}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            lastNameEn: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                            </div>

                            {/* Profile Image */}
                            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                <Label className="flex items-center gap-2 text-muted-foreground">
                                    <ImageIcon className="h-4 w-4" />
                                    รูปโปรไฟล์
                                </Label>
                                <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex items-center gap-4">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="group relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                                                        disabled={isUploadingImage}
                                                        aria-label="Open profile image menu"
                                                    >
                                                        {hasProfileImage ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                src={formData.image}
                                                                alt="Profile preview"
                                                                className="h-20 w-20 rounded-full border-4 border-white object-cover shadow-[0_16px_30px_-18px_rgba(15,23,42,0.45)] transition group-hover:scale-[1.02] group-hover:shadow-[0_18px_34px_-18px_rgba(37,99,235,0.55)]"
                                                                onError={handleProfileImagePreviewError}
                                                            />
                                                        ) : (
                                                            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-blue-200 bg-white text-2xl font-semibold text-primary shadow-[0_12px_24px_-16px_rgba(37,99,235,0.4)] transition group-hover:scale-[1.02] group-hover:border-blue-300 group-hover:shadow-[0_18px_34px_-18px_rgba(37,99,235,0.45)]">
                                                                {profileInitial}
                                                            </div>
                                                        )}
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="w-48 rounded-2xl border-slate-200 p-2">
                                                    <DropdownMenuItem
                                                        className="rounded-xl py-2"
                                                        onClick={() => profileImageInputRef.current?.click()}
                                                        disabled={isUploadingImage}
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        อัปโหลดรูปใหม่
                                                    </DropdownMenuItem>
                                                    {hasProfileImage && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="rounded-xl py-2"
                                                                variant="destructive"
                                                                onClick={clearProfileImage}
                                                                disabled={isUploadingImage}
                                                            >
                                                                <X className="h-4 w-4" />
                                                                ล้างรูป
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                            <div className="space-y-1.5">
                                                <p className="text-sm font-medium text-foreground">อัปโหลดรูปจากเครื่องได้</p>
                                                <p className="text-xs leading-5 text-muted-foreground">
                                                    รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 lg:justify-end">
                                            <input
                                                ref={profileImageInputRef}
                                                id="profile-image-upload"
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                className="hidden"
                                                onChange={handleProfileImageUpload}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 gap-2 rounded-2xl border-slate-200 bg-white px-4 shadow-sm hover:bg-slate-50"
                                                onClick={() => profileImageInputRef.current?.click()}
                                                disabled={isUploadingImage}
                                            >
                                                {isUploadingImage ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Upload className="h-4 w-4" />
                                                )}
                                                {isUploadingImage ? "กำลังอัปโหลด..." : "อัปโหลดรูป"}
                                            </Button>
                                            {hasProfileImage && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    className="h-11 gap-2 rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    onClick={clearProfileImage}
                                                    disabled={isUploadingImage}
                                                >
                                                    <X className="h-4 w-4" />
                                                    ล้างรูป
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Profile Image URL */}
                            <div className="space-y-2">
                                <Label htmlFor="image" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                    URL รูปโปรไฟล์ (ถ้าต้องการใช้ลิงก์ภายนอก)
                                </Label>
                                <Input
                                    id="image"
                                    type="text"
                                    placeholder="https://example.com/your-photo.jpg หรือ /uploads/profiles/..."
                                    value={formData.image}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            image: e.target.value,
                                        }))
                                    }
                                    className="border-slate-200 bg-white"
                                />
                                {errors.image && (
                                    <p className="text-sm text-red-500">{errors.image[0]}</p>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-3">
                                <Button
                                    type="button"
                                    onClick={() => handleSubmit("personal")}
                                    className={saveButtonClass}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4" />
                                    )}
                                    บันทึก
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Row 2: Tax Address + Shipping Address */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Tax Invoice Address Card */}
                    <Card className={addressCardClass}>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                                        <FileText className="h-5 w-5" />
                                        ที่อยู่ออกใบกำกับภาษี
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        ที่อยู่สำหรับออกใบกำกับภาษี (ไม่จำเป็นต้องกรอก)
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-border text-muted-foreground hover:bg-muted rounded-full"
                                    onClick={() => setEditingTax(!editingTax)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {editingTax ? "ยกเลิก" : "แก้ไข"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingTax ? (
                                <div className="space-y-4">
                                    {renderAddressForm(taxAddress, setTaxAddress, "tax")}
                                    <div className="flex justify-end pt-3">
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit("tax")}
                                            className={saveButtonClass}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            บันทึก
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        {renderAddressDisplay(taxAddress)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shipping Address Card */}
                    <Card className={addressCardClass}>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                                        <Truck className="h-5 w-5" />
                                        ที่อยู่จัดส่งของรางวัล
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        ที่อยู่สำหรับจัดส่งของรางวัล (ไม่จำเป็นต้องกรอก)
                                    </CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 border-border text-muted-foreground hover:bg-muted rounded-full"
                                    onClick={() => setEditingShip(!editingShip)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {editingShip ? "ยกเลิก" : "แก้ไข"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingShip ? (
                                <div className="space-y-4">
                                    {renderAddressForm(shipAddress, setShipAddress, "ship")}
                                    <div className="flex justify-end pt-3">
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit("ship")}
                                            className={saveButtonClass}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}
                                            บันทึก
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        {renderAddressDisplay(shipAddress)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Row 3: Password (full width) */}
                <Card className={elevatedCardClass}>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                            <Lock className="h-5 w-5" />
                            เปลี่ยนรหัสผ่าน
                        </CardTitle>
                        <CardDescription>ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">รหัสผ่านใหม่</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="อย่างน้อย 6 ตัวอักษร"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            password: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-500">{errors.password[0]}</p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                                    value={formData.confirmPassword}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            confirmPassword: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                {errors.confirmPassword && (
                                    <p className="text-sm text-red-500">{errors.confirmPassword[0]}</p>
                                )}
                            </div>
                        </div>

                        {/* Password Match Indicator */}
                        {formData.confirmPassword && (
                            <Alert
                                className={
                                    passwordsMatch
                                        ? "border-green-200 bg-green-50"
                                        : "border-red-200 bg-red-50"
                                }
                            >
                                {passwordsMatch ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-700">
                                            รหัสผ่านตรงกัน
                                        </AlertDescription>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-700">
                                            รหัสผ่านไม่ตรงกัน
                                        </AlertDescription>
                                    </>
                                )}
                            </Alert>
                        )}

                        {/* Save Button */}
                        <div className="flex justify-end pt-3">
                            <Button
                                type="button"
                                onClick={() => handleSubmit("password")}
                                className={saveButtonClass}
                                disabled={isLoading || !passwordsMatch || !formData.password}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                บันทึก
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
