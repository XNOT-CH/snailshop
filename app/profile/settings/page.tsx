"use client";

import { useState, useEffect } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { updateProfile } from "@/lib/actions/user";
import { showLoading, hideLoading, showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { ThaiAddressSelector } from "@/components/ThaiAddressSelector";

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
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
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
            const submitData = {
                ...formData,
                taxAddress,
                shippingAddress: shipAddress,
            };
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
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-6xl mx-auto space-y-5">
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
                    <Card className="bg-card shadow-sm border-0">
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
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="button"
                                    onClick={() => handleSubmit("contact")}
                                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
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
                    <Card className="bg-card shadow-sm border-0">
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

                            {/* Profile Image URL */}
                            <div className="space-y-2">
                                <Label htmlFor="image" className="flex items-center gap-2 text-muted-foreground">
                                    URL รูปโปรไฟล์
                                </Label>
                                <Input
                                    id="image"
                                    type="url"
                                    placeholder="https://example.com/your-photo.jpg"
                                    value={formData.image}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            image: e.target.value,
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                {errors.image && (
                                    <p className="text-sm text-red-500">{errors.image[0]}</p>
                                )}
                            </div>

                            {/* Save Button */}
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="button"
                                    onClick={() => handleSubmit("personal")}
                                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
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
                    <Card className="bg-card shadow-sm border-0">
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
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit("tax")}
                                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
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
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        {renderAddressDisplay(taxAddress)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Shipping Address Card */}
                    <Card className="bg-card shadow-sm border-0">
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
                                    <div className="flex justify-end pt-2">
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit("ship")}
                                            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
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
                                <div className="p-4 rounded-lg bg-muted/50">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        {renderAddressDisplay(shipAddress)}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Row 3: Password (full width) */}
                <Card className="bg-card shadow-sm border-0">
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
                        <div className="flex justify-end pt-2">
                            <Button
                                type="button"
                                onClick={() => handleSubmit("password")}
                                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
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
