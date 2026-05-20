"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Eye,
    EyeOff,
    Eraser,
    Send,
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { updateProfile } from "@/lib/actions/user";
import { showLoading, hideLoading, showSuccessAlert, showErrorAlert } from "@/lib/swal";
import { ThaiAddressSelector } from "@/components/ThaiAddressSelector";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { compressImage } from "@/lib/compressImage";
import { FreeCropDialog } from "@/components/profile/FreeCropDialog";
import { PinSettingsCard } from "@/components/profile/PinSettingsCard";
import { requirePinForAction } from "@/lib/require-pin-for-action";
import { useLogout } from "@/components/useLogout";
import {
    deleteUserAddressProfile,
    getUserAddressProfiles,
    saveUserAddressProfile,
    type AddressProfileData,
} from "@/lib/actions/addressProfiles";

interface AddressData {
    fullName: string;
    phone: string;
    address: string;
    province: string;
    district: string;
    subdistrict: string;
    postalCode: string;
    taxId: string;
}

type AddressMode = "saved" | "new";

interface SavedAddressOption {
    id: string;
    label: string;
    description: string;
    address: AddressData;
    profileId?: string;
}

async function parseApiResponse(response: Response) {
    const contentType = response.headers.get("content-type") ?? "";
    const isJsonResponse = contentType.toLowerCase().includes("application/json");

    if (isJsonResponse) {
        return response.json();
    }

    const bodyText = await response.text();
    const normalizedBody = bodyText.trim().toLowerCase();

    if (normalizedBody.startsWith("<!doctype") || normalizedBody.startsWith("<html")) {
        return {
            success: false,
            message: "เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง หรือแจ้งแอดมินตรวจสอบระบบ production",
        };
    }

    return {
        success: false,
        message: bodyText.trim() || "เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง",
    };
}

function sanitizePhone(value: string) {
    return value.replace(/\D/g, "").slice(0, 10);
}

function sanitizeTaxId(value: string) {
    return value.replace(/\D/g, "").slice(0, 13);
}

function sanitizeThaiName(value: string) {
    return value.replace(/[^ก-๙\s]/g, "");
}

function sanitizeEnglishName(value: string) {
    return value.replace(/[^A-Za-z\s.'-]/g, "");
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
    hasPin: boolean;
    pinUpdatedAt: string | null;
    pinLockedUntil: string | null;
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
    taxId: "",
};

function cloneAddress(address: AddressData): AddressData {
    return { ...address };
}

function hasAddressData(addr: AddressData) {
    return Object.values(addr).some(v => v && v.trim() !== "");
}

function getAddressSummary(address: AddressData) {
    const location = [address.subdistrict, address.district, address.province].filter(Boolean).join(" / ");
    return [address.address, location, address.postalCode].filter(Boolean).join(" · ");
}

function toAddressData(profile: AddressProfileData): AddressData {
    return {
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        address: profile.address || "",
        province: profile.province || "",
        district: profile.district || "",
        subdistrict: profile.subdistrict || "",
        postalCode: profile.postalCode || "",
        taxId: profile.taxId || "",
    };
}

export default function ProfileSettingsPage() {
    const router = useRouter();
    const logout = useLogout();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [isSavingAddressProfile, setIsSavingAddressProfile] = useState(false);
    const [isEditingVerifiedEmail, setIsEditingVerifiedEmail] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [addressProfiles, setAddressProfiles] = useState<AddressProfileData[]>([]);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const cropUrlRef = useRef<string | null>(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropFileName, setCropFileName] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        currentPassword: "",
        pin: "",
    });
    const [taxAddress, setTaxAddress] = useState<AddressData>({ ...emptyAddress });
    const [shipAddress, setShipAddress] = useState<AddressData>({ ...emptyAddress });
    const [editingTax, setEditingTax] = useState(false);
    const [editingShip, setEditingShip] = useState(false);
    const [taxAddressMode, setTaxAddressMode] = useState<AddressMode>("saved");
    const [shipAddressMode, setShipAddressMode] = useState<AddressMode>("saved");
    const [selectedTaxAddressId, setSelectedTaxAddressId] = useState("");
    const [selectedShipAddressId, setSelectedShipAddressId] = useState("");
    const [taxAddressLabel, setTaxAddressLabel] = useState("ใบกำกับภาษี");
    const [shipAddressLabel, setShipAddressLabel] = useState("จัดส่งของรางวัล");
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [savedTaxAddress, setSavedTaxAddress] = useState<AddressData>({ ...emptyAddress });
    const [savedShipAddress, setSavedShipAddress] = useState<AddressData>({ ...emptyAddress });

    const hasProfileImage = Boolean(formData.image?.trim());
    const profileInitial = (formData.name || profile?.username || "U").trim().charAt(0).toUpperCase();
    const elevatedCardClass =
        "border border-slate-200/80 bg-white/95 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.28)]";
    const addressCardClass =
        "border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)]";
    const saveButtonClass =
        "h-11 w-full gap-2 rounded-2xl bg-blue-600 px-6 text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.75)] transition hover:bg-blue-700 hover:shadow-[0_18px_36px_-18px_rgba(29,78,216,0.75)] sm:w-auto sm:min-w-[148px]";
    const emailChanged = (formData.email || "").trim().toLowerCase() !== (profile?.email || "").trim().toLowerCase();
    const isEmailVerified = Boolean(profile?.emailVerified) && !emailChanged;
    const shouldLockVerifiedEmail = isEmailVerified && !isEditingVerifiedEmail;
    const emailStatusLabel = emailChanged ? "ต้องยืนยันใหม่" : isEmailVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน";

    const savedAddressOptions = useMemo<SavedAddressOption[]>(() => {
        const options: SavedAddressOption[] = [];
        const seen = new Set<string>();

        const addOption = (id: string, label: string, address: AddressData) => {
            if (!hasAddressData(address)) return;

            const key = [
                address.fullName,
                address.phone,
                address.address,
                address.province,
                address.district,
                address.subdistrict,
                address.postalCode,
            ].join("|");

            if (seen.has(key)) return;
            seen.add(key);

            options.push({
                id,
                label,
                description: getAddressSummary(address) || address.phone || "ข้อมูลเดิมที่เคยบันทึกไว้",
                address: cloneAddress(address),
            });
        };

        for (const profileItem of addressProfiles) {
            addOption(`profile-${profileItem.id}`, profileItem.label, toAddressData(profileItem));
            const current = options.at(-1);
            if (current?.id === `profile-${profileItem.id}`) {
                current.profileId = profileItem.id;
            }
        }

        addOption("tax-current", "ที่อยู่ออกใบกำกับภาษีเดิม", savedTaxAddress);
        addOption("ship-current", "ที่อยู่จัดส่งเดิม", savedShipAddress);

        return options;
    }, [addressProfiles, savedShipAddress, savedTaxAddress]);

    const refreshProfile = useCallback(async () => {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (!data.success || !data.data) return;

        const user = data.data as UserProfile;
        setProfile(user);
        setFormData((prev) => ({
            ...prev,
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            image: user.image || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            firstNameEn: user.firstNameEn || "",
            lastNameEn: user.lastNameEn || "",
        }));
        const nextTaxAddress = {
            fullName: user.taxFullName || "",
            phone: user.taxPhone || "",
            address: user.taxAddress || "",
            province: user.taxProvince || "",
            district: user.taxDistrict || "",
            subdistrict: user.taxSubdistrict || "",
            postalCode: user.taxPostalCode || "",
            taxId: "",
        };
        const nextShipAddress = {
            fullName: user.shipFullName || "",
            phone: user.shipPhone || "",
            address: user.shipAddress || "",
            province: user.shipProvince || "",
            district: user.shipDistrict || "",
            subdistrict: user.shipSubdistrict || "",
            postalCode: user.shipPostalCode || "",
            taxId: "",
        };
        const addressProfileResult = await getUserAddressProfiles();
        if (addressProfileResult.success && addressProfileResult.data) {
            setAddressProfiles(addressProfileResult.data);
        }
        setTaxAddress(nextTaxAddress);
        setShipAddress(nextShipAddress);
        setSavedTaxAddress(nextTaxAddress);
        setSavedShipAddress(nextShipAddress);
        setTaxAddressMode("saved");
        setShipAddressMode("saved");
        setSelectedTaxAddressId(hasAddressData(nextTaxAddress) ? "tax-current" : "");
        setSelectedShipAddressId(hasAddressData(nextShipAddress) ? "ship-current" : "");
        setIsEditingVerifiedEmail(false);
    }, []);

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
                    currentPassword: formData.currentPassword,
                    password: formData.password,
                    confirmPassword: formData.confirmPassword,
                    pin: formData.pin,
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

    const saveAddressProfileForSection = async (section: "tax" | "ship") => {
        const isTaxSection = section === "tax";
        const address = isTaxSection ? taxAddress : shipAddress;
        const mode = isTaxSection ? taxAddressMode : shipAddressMode;
        const selectedAddressId = isTaxSection ? selectedTaxAddressId : selectedShipAddressId;
        const label = (isTaxSection ? taxAddressLabel : shipAddressLabel).trim();
        const selectedOption = savedAddressOptions.find((option) => option.id === selectedAddressId);

        if (!hasAddressData(address)) {
            return true;
        }

        setIsSavingAddressProfile(true);
        const result = await saveUserAddressProfile({
            id: mode === "saved" ? selectedOption?.profileId : undefined,
            label: label || (isTaxSection ? "ใบกำกับภาษี" : "จัดส่งของรางวัล"),
            kind: isTaxSection ? "tax" : "shipping",
            ...address,
            taxId: isTaxSection ? address.taxId : "",
            isDefaultTax: isTaxSection,
            isDefaultShipping: !isTaxSection,
        });
        setIsSavingAddressProfile(false);

        if (!result.success || !result.data) {
            if (result.errors) setErrors(result.errors);
            hideLoading();
            await showErrorAlert("บันทึกข้อมูลที่อยู่ไม่สำเร็จ", result.message);
            return false;
        }

        setAddressProfiles((prev) => {
            const nextProfiles = prev.filter((item) => item.id !== result.data!.id);
            return [result.data!, ...nextProfiles];
        });

        if (isTaxSection) {
            setSelectedTaxAddressId(`profile-${result.data.id}`);
            setTaxAddressLabel(result.data.label);
        } else {
            setSelectedShipAddressId(`profile-${result.data.id}`);
            setShipAddressLabel(result.data.label);
        }

        return true;
    };

    // Fetch current profile on mount
    useEffect(() => {
        async function fetchProfile() {
            setIsFetching(true);
            try {
                await refreshProfile();
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            }
            setIsFetching(false);
        }
        fetchProfile();
    }, [refreshProfile]);

    useEffect(() => {
        return () => {
            if (cropUrlRef.current) {
                URL.revokeObjectURL(cropUrlRef.current);
            }
        };
    }, []);

    const handleSubmit = async (section: "contact" | "personal" | "password" | "tax" | "ship") => {
        setErrors({});

        // Client-side current password check
        if (section === "password" && formData.password && !formData.currentPassword) {
            setErrors({ currentPassword: ["กรุณากรอกรหัสผ่านปัจจุบัน"] });
            return;
        }

        // Client-side password match check
        if (section === "password" && formData.password && formData.password !== formData.confirmPassword) {
            setErrors({ confirmPassword: ["รหัสผ่านไม่ตรงกัน"] });
            return;
        }

        let pinForProtectedAction = "";
        if (section === "password" && formData.password && profile?.hasPin) {
            const pinCheck = await requirePinForAction("ยืนยัน PIN เพื่อเปลี่ยนรหัสผ่าน");
            if (!pinCheck.allowed) {
                return;
            }
            pinForProtectedAction = pinCheck.pin ?? "";
            setFormData((prev) => ({ ...prev, pin: pinForProtectedAction }));
        }

        setIsLoading(true);
        showLoading("กำลังบันทึก...");

        try {
            const submitData = section === "password" && pinForProtectedAction
                ? {
                    ...buildSubmitData(section),
                    pin: pinForProtectedAction,
                }
                : buildSubmitData(section);
            const result = await updateProfile(submitData);

            hideLoading();

            if (result.success) {
                if (section === "tax" || section === "ship") {
                    const profileSaved = await saveAddressProfileForSection(section);
                    if (!profileSaved) return;
                }

                await showSuccessAlert("สำเร็จ!", result.message);
                // Clear password fields after success
                if (section === "password") {
                    setFormData(prev => ({
                        ...prev,
                        password: "",
                        confirmPassword: "",
                        currentPassword: "",
                        pin: "",
                    }));
                    // Sign out after password change
                    if (result.passwordChanged) {
                        await logout();
                        return;
                    }
                }
                setEditingTax(false);
                setEditingShip(false);
                if (section === "contact") {
                    setIsEditingVerifiedEmail(false);
                }
                // Refresh profile data
                try {
                    await refreshProfile();
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

    const handleCancelEmailEdit = () => {
        setFormData((prev) => ({
            ...prev,
            email: profile?.email || "",
        }));
        setErrors((prev) => {
            const nextErrors = { ...prev };
            delete nextErrors.email;
            return nextErrors;
        });
        setIsEditingVerifiedEmail(false);
    };

    const handleSendVerificationEmail = async () => {
        if (!profile?.email || emailChanged || isEmailVerified) return;

        setIsSendingVerification(true);
        try {
            const response = await fetchWithCsrf("/api/profile/send-verification-email", {
                method: "POST",
            });
            const data = await parseApiResponse(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || "ส่งอีเมลยืนยันไม่สำเร็จ");
            }

            await showSuccessAlert("ส่งอีเมลแล้ว", data.message);
        } catch (error) {
            await showErrorAlert(
                "ส่งอีเมลไม่สำเร็จ",
                error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการส่งอีเมลยืนยัน"
            );
        } finally {
            setIsSendingVerification(false);
        }
    };

    const handleDeleteAddressProfile = async (profileId: string, section: "tax" | "ship") => {
        if (!profileId) return;

        setIsSavingAddressProfile(true);
        showLoading("กำลังลบข้อมูลที่อยู่...");
        try {
            const result = await deleteUserAddressProfile(profileId);
            hideLoading();

            if (!result.success) {
                await showErrorAlert("ลบข้อมูลไม่สำเร็จ", result.message);
                return;
            }

            setAddressProfiles((prev) => prev.filter((item) => item.id !== profileId));
            if (section === "tax") {
                setSelectedTaxAddressId("");
                setTaxAddressMode("new");
                setTaxAddressLabel("ใบกำกับภาษี");
                setTaxAddress({ ...emptyAddress });
            } else {
                setSelectedShipAddressId("");
                setShipAddressMode("new");
                setShipAddressLabel("จัดส่งของรางวัล");
                setShipAddress({ ...emptyAddress });
            }
            await showSuccessAlert("สำเร็จ!", result.message);
        } catch {
            hideLoading();
            await showErrorAlert("ลบข้อมูลไม่สำเร็จ", "เกิดข้อผิดพลาดในการลบข้อมูลที่อยู่");
        } finally {
            setIsSavingAddressProfile(false);
        }
    };

    const passwordsMatch = !formData.confirmPassword || formData.password === formData.confirmPassword;

    const uploadProfileImage = useCallback(async (file: File, options?: { showSuccessAlert?: boolean }) => {
        const shouldShowSuccessAlert = options?.showSuccessAlert ?? true;
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
            if (shouldShowSuccessAlert) {
                await showSuccessAlert("สำเร็จ!", "อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว");
            }
            return true;
        } catch (error) {
            await showErrorAlert(
                "อัปโหลดไม่สำเร็จ",
                error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์"
            );
            return false;
        } finally {
            setIsUploadingImage(false);
        }
    }, [router]);

    const clearCropDialog = useCallback(() => {
        if (cropUrlRef.current) {
            URL.revokeObjectURL(cropUrlRef.current);
            cropUrlRef.current = null;
        }

        setCropDialogOpen(false);
        setCropImageSrc(null);
        setCropFileName("");

        if (profileImageInputRef.current) {
            profileImageInputRef.current.value = "";
        }
    }, []);

    const handleProfileImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (cropUrlRef.current) {
            URL.revokeObjectURL(cropUrlRef.current);
        }

        const objectUrl = URL.createObjectURL(file);
        cropUrlRef.current = objectUrl;
        setCropFileName(file.name);
        setCropImageSrc(objectUrl);
        setCropDialogOpen(true);
    }, []);

    const handleCropConfirm = useCallback(async (croppedFile: File) => {
        const uploaded = await uploadProfileImage(croppedFile, { showSuccessAlert: false });
        if (!uploaded) {
            return;
        }

        clearCropDialog();
        await showSuccessAlert("สำเร็จ!", "อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว");
    }, [clearCropDialog, uploadProfileImage]);

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

    const applySavedAddress = (
        optionId: string,
        setAddr: React.Dispatch<React.SetStateAction<AddressData>>,
        setSelectedId: React.Dispatch<React.SetStateAction<string>>,
        setLabel: React.Dispatch<React.SetStateAction<string>>,
    ) => {
        const option = savedAddressOptions.find((item) => item.id === optionId);
        if (!option) return;

        setSelectedId(optionId);
        setAddr(cloneAddress(option.address));
        setLabel(option.label);
    };

    const startNewAddress = (
        setAddr: React.Dispatch<React.SetStateAction<AddressData>>,
        setMode: React.Dispatch<React.SetStateAction<AddressMode>>,
        setSelectedId: React.Dispatch<React.SetStateAction<string>>,
        setLabel: React.Dispatch<React.SetStateAction<string>>,
        fallbackLabel: string,
    ) => {
        setMode("new");
        setSelectedId("");
        setLabel(fallbackLabel);
        setAddr({ ...emptyAddress });
    };

    const clearAddressFields = (
        setAddr: React.Dispatch<React.SetStateAction<AddressData>>,
        setMode: React.Dispatch<React.SetStateAction<AddressMode>>,
        setSelectedId: React.Dispatch<React.SetStateAction<string>>,
    ) => {
        setMode("new");
        setSelectedId("");
        setAddr({ ...emptyAddress });
    };

    const applyFirstSavedAddress = (
        setAddr: React.Dispatch<React.SetStateAction<AddressData>>,
        setMode: React.Dispatch<React.SetStateAction<AddressMode>>,
        setSelectedId: React.Dispatch<React.SetStateAction<string>>,
        setLabel: React.Dispatch<React.SetStateAction<string>>,
    ) => {
        setMode("saved");
        const firstOption = savedAddressOptions[0];
        if (!firstOption) return;

        setSelectedId(firstOption.id);
        setAddr(cloneAddress(firstOption.address));
        setLabel(firstOption.label);
    };

    const renderAddressSourceControls = (
        mode: AddressMode,
        selectedAddressId: string,
        label: string,
        setAddr: React.Dispatch<React.SetStateAction<AddressData>>,
        setMode: React.Dispatch<React.SetStateAction<AddressMode>>,
        setSelectedId: React.Dispatch<React.SetStateAction<string>>,
        setLabel: React.Dispatch<React.SetStateAction<string>>,
        fallbackLabel: string,
    ) => {
        const hasSavedOptions = savedAddressOptions.length > 0;

        return (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div
                        role="button"
                        tabIndex={hasSavedOptions ? 0 : -1}
                        aria-disabled={!hasSavedOptions}
                        className={`flex min-h-16 items-start gap-3 rounded-2xl border p-4 text-left transition ${
                            mode === "saved"
                                ? "border-blue-300 bg-blue-50 text-blue-950 shadow-[0_14px_30px_-24px_rgba(37,99,235,0.75)]"
                                : "border-slate-200 bg-white text-foreground hover:border-blue-200 hover:bg-blue-50/40"
                        } ${!hasSavedOptions ? "cursor-not-allowed opacity-60" : ""}`}
                        onClick={() => {
                            if (hasSavedOptions) applyFirstSavedAddress(setAddr, setMode, setSelectedId, setLabel);
                        }}
                        onKeyDown={(event) => {
                            if (hasSavedOptions && (event.key === "Enter" || event.key === " ")) {
                                event.preventDefault();
                                applyFirstSavedAddress(setAddr, setMode, setSelectedId, setLabel);
                            }
                        }}
                    >
                        <Checkbox
                            checked={mode === "saved"}
                            disabled={!hasSavedOptions}
                            className="mt-0.5"
                            aria-hidden="true"
                            tabIndex={-1}
                        />
                        <span className="space-y-1">
                            <span className="block text-sm font-semibold">ใช้ข้อมูลเดิมที่เคยบันทึกไว้</span>
                            <span className="block text-xs text-muted-foreground">
                                เลือกชุดข้อมูลเดิมแล้วระบบจะเติมช่องให้ทันที
                            </span>
                        </span>
                    </div>

                    <div
                        role="button"
                        tabIndex={0}
                        className={`flex min-h-16 items-start gap-3 rounded-2xl border p-4 text-left transition ${
                            mode === "new"
                                ? "border-blue-300 bg-blue-50 text-blue-950 shadow-[0_14px_30px_-24px_rgba(37,99,235,0.75)]"
                                : "border-slate-200 bg-white text-foreground hover:border-blue-200 hover:bg-blue-50/40"
                        }`}
                        onClick={() => startNewAddress(setAddr, setMode, setSelectedId, setLabel, fallbackLabel)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                startNewAddress(setAddr, setMode, setSelectedId, setLabel, fallbackLabel);
                            }
                        }}
                    >
                        <Checkbox checked={mode === "new"} className="mt-0.5" aria-hidden="true" tabIndex={-1} />
                        <span className="space-y-1">
                            <span className="block text-sm font-semibold">กรอกข้อมูลใหม่</span>
                            <span className="block text-xs text-muted-foreground">
                                ใช้เมื่อข้อมูลผู้รับ ที่อยู่ หรือเบอร์โทรไม่เหมือนเดิม
                            </span>
                        </span>
                    </div>
                </div>

                {mode === "saved" ? (
                    hasSavedOptions ? (
                        <div className="space-y-2">
                            <Label>เลือกข้อมูลเดิม</Label>
                            <Select
                                value={selectedAddressId || savedAddressOptions[0]?.id || ""}
                                onValueChange={(value) => applySavedAddress(value, setAddr, setSelectedId, setLabel)}
                            >
                                <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-slate-50/80">
                                    <SelectValue placeholder="เลือกข้อมูลที่ต้องการใช้" />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedAddressOptions.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label} - {option.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            ยังไม่มีข้อมูลเดิมให้เลือก กรุณากรอกข้อมูลใหม่ก่อน
                        </p>
                    )
                ) : null}

                <div className="space-y-2">
                    <Label>ชื่อสำหรับจำข้อมูลชุดนี้</Label>
                    <Input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="เช่น บ้าน, ที่ทำงาน, บริษัท"
                        className="border-slate-200 bg-white"
                    />
                    {errors.label ? <p className="text-sm text-red-500">{errors.label[0]}</p> : null}
                </div>
            </div>
        );
    };

    const renderAddressDisplay = (addr: AddressData) => {
        if (!hasAddressData(addr)) {
            return <p className="text-sm text-muted-foreground italic">ยังไม่ได้กรอกข้อมูล</p>;
        }
        return (
            <div className="text-sm text-foreground space-y-1">
                {addr.fullName && <p><span className="font-medium">ชื่อ - สกุล:</span> {addr.fullName}</p>}
                {addr.phone && <p><span className="font-medium">โทรศัพท์:</span> {addr.phone}</p>}
                {addr.taxId && <p><span className="font-medium">เลขประจำตัวผู้เสียภาษี:</span> {addr.taxId}</p>}
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
        prefix: string,
        includeTaxId = false,
    ) => (
        <div className="space-y-4">
            {includeTaxId ? (
                <div className="space-y-2">
                    <Label htmlFor={`${prefix}-taxId`}>เลขประจำตัวผู้เสียภาษี</Label>
                    <Input
                        id={`${prefix}-taxId`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={13}
                        placeholder="กรอกเลขประจำตัวผู้เสียภาษี 13 หลัก"
                        value={addr.taxId}
                        onChange={(e) => setAddr(prev => ({ ...prev, taxId: sanitizeTaxId(e.target.value) }))}
                        className="bg-muted/60 border-border"
                    />
                    <p className="text-xs text-muted-foreground">กรอกเฉพาะตัวเลข 13 หลัก ถ้าต้องการออกใบกำกับภาษี</p>
                    {errors.taxId ? <p className="text-sm text-red-500">{errors.taxId[0]}</p> : null}
                </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor={`${prefix}-fullName`}>ชื่อ - สกุล</Label>
                    <Input
                        id={`${prefix}-fullName`}
                        placeholder="ชื่อ - สกุล"
                        value={addr.fullName}
                        onChange={(e) => setAddr(prev => ({ ...prev, fullName: sanitizeThaiName(e.target.value) }))}
                        className="bg-muted/60 border-border"
                    />
                    <p className="text-xs text-muted-foreground">กรอกได้เฉพาะภาษาไทย</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`${prefix}-phone`}>หมายเลขโทรศัพท์ <span className="text-red-500">*</span></Label>
                    <Input
                        id={`${prefix}-phone`}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        placeholder="0XXXXXXXXX"
                        value={addr.phone}
                        onChange={(e) => setAddr(prev => ({ ...prev, phone: sanitizePhone(e.target.value) }))}
                        className="bg-muted/60 border-border"
                    />
                    <p className="text-xs text-muted-foreground">กรอกเฉพาะตัวเลข 10 หลัก</p>
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
        <div className="profile-settings-page min-h-screen bg-background px-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:py-8">
            <div className="mx-auto w-full max-w-[84rem] space-y-4 sm:space-y-5">
                {/* Breadcrumb */}
                <PageBreadcrumb
                    items={[
                        { label: "แดชบอร์ด", href: "/dashboard" },
                        { label: "ข้อมูลผู้ใช้" },
                    ]}
                    className="px-3 sm:px-0"
                />

                {/* Page Header */}
                <div className="flex items-center gap-4 px-3 sm:px-0">
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
                                    เบอร์มือถือ <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={10}
                                    placeholder="0XXXXXXXXX"
                                    value={formData.phone}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            phone: sanitizePhone(e.target.value),
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                <p className="text-xs text-muted-foreground">กรอกเฉพาะตัวเลข 10 หลัก</p>
                                {errors.phone && (
                                    <p className="text-sm text-red-500">{errors.phone[0]}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Label htmlFor="email" className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        อีเมล
                                    </Label>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {formData.email ? (
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                                    isEmailVerified ? "text-emerald-700" : "text-amber-700"
                                                }`}
                                            >
                                                {isEmailVerified ? (
                                                    <CheckCircle className="h-3.5 w-3.5 stroke-[1.8]" />
                                                ) : (
                                                    <AlertTriangle className="h-3.5 w-3.5 stroke-[1.8]" />
                                                )}
                                                {emailStatusLabel}
                                            </span>
                                        ) : null}
                                        {isEmailVerified ? (
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-950 disabled:pointer-events-none disabled:opacity-50"
                                                onClick={() => setIsEditingVerifiedEmail(true)}
                                                disabled={isEditingVerifiedEmail || isLoading}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                เปลี่ยนอีเมล
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ระบุอีเมลของคุณที่นี่"
                                    value={formData.email}
                                    readOnly={shouldLockVerifiedEmail}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            email: e.target.value,
                                        }))
                                    }
                                    className={
                                        shouldLockVerifiedEmail
                                            ? "border-slate-200 bg-white text-slate-700 shadow-none focus-visible:ring-slate-200"
                                            : "border-slate-200 bg-white shadow-none focus-visible:ring-slate-200"
                                    }
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-500">{errors.email[0]}</p>
                                )}
                                {shouldLockVerifiedEmail ? (
                                    <p className="text-xs text-slate-500">
                                        อีเมลนี้ยืนยันแล้ว กดเปลี่ยนอีเมลก่อนหากต้องการแก้ไข
                                    </p>
                                ) : null}
                                {emailChanged ? (
                                    <p className="text-xs text-amber-600">
                                        หลังบันทึกอีเมลใหม่แล้ว ระบบจะให้ยืนยันอีเมลอีกครั้ง
                                    </p>
                                ) : null}
                                {isEditingVerifiedEmail ? (
                                    <div className="flex justify-end pt-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-8 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-slate-100"
                                            onClick={handleCancelEmailEdit}
                                            disabled={isLoading}
                                        >
                                            <X className="h-4 w-4" />
                                            ยกเลิกเปลี่ยนอีเมล
                                        </Button>
                                    </div>
                                ) : null}
                                {!isEmailVerified && profile?.email ? (
                                    <div className="flex justify-end pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-9 gap-2 rounded-lg border-slate-200 px-3 text-sm text-slate-700 shadow-none hover:bg-slate-50 hover:text-slate-900"
                                            onClick={handleSendVerificationEmail}
                                            disabled={isSendingVerification || isLoading || emailChanged}
                                        >
                                            {isSendingVerification ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                            ยืนยันอีเมล
                                        </Button>
                                    </div>
                                ) : null}
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
                                            firstName: sanitizeThaiName(e.target.value),
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                <p className="text-xs text-muted-foreground">กรอกได้เฉพาะภาษาไทย</p>
                                {errors.firstName && (
                                    <p className="text-sm text-red-500">{errors.firstName[0]}</p>
                                )}
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
                                            lastName: sanitizeThaiName(e.target.value),
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                <p className="text-xs text-muted-foreground">กรอกได้เฉพาะภาษาไทย</p>
                                {errors.lastName && (
                                    <p className="text-sm text-red-500">{errors.lastName[0]}</p>
                                )}
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
                                            firstNameEn: sanitizeEnglishName(e.target.value),
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                <p className="text-xs text-muted-foreground">กรอกได้เฉพาะภาษาอังกฤษ</p>
                                {errors.firstNameEn && (
                                    <p className="text-sm text-red-500">{errors.firstNameEn[0]}</p>
                                )}
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
                                            lastNameEn: sanitizeEnglishName(e.target.value),
                                        }))
                                    }
                                    className="bg-muted/50 border-border"
                                />
                                <p className="text-xs text-muted-foreground">กรอกได้เฉพาะภาษาอังกฤษ</p>
                                {errors.lastNameEn && (
                                    <p className="text-sm text-red-500">{errors.lastNameEn[0]}</p>
                                )}
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
                                    onClick={() => {
                                        const nextEditing = !editingTax;
                                        setEditingTax(nextEditing);
                                        if (nextEditing && savedAddressOptions.length > 0 && !selectedTaxAddressId) {
                                            applyFirstSavedAddress(setTaxAddress, setTaxAddressMode, setSelectedTaxAddressId, setTaxAddressLabel);
                                        }
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {editingTax ? "ยกเลิก" : "แก้ไข"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingTax ? (
                                <div className="space-y-4">
                                    {renderAddressSourceControls(
                                        taxAddressMode,
                                        selectedTaxAddressId,
                                        taxAddressLabel,
                                        setTaxAddress,
                                        setTaxAddressMode,
                                        setSelectedTaxAddressId,
                                        setTaxAddressLabel,
                                        "ใบกำกับภาษี",
                                    )}
                                    {renderAddressForm(taxAddress, setTaxAddress, "tax", true)}
                                    {selectedTaxAddressId.startsWith("profile-") ? (
                                        <div className="flex justify-start pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleDeleteAddressProfile(selectedTaxAddressId.replace("profile-", ""), "tax")}
                                                disabled={isSavingAddressProfile}
                                            >
                                                <X className="h-4 w-4" />
                                                ลบข้อมูลชุดนี้
                                            </Button>
                                        </div>
                                    ) : null}
                                    <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 gap-2 rounded-2xl border-slate-200 text-muted-foreground hover:bg-slate-50 hover:text-slate-900"
                                            onClick={() => clearAddressFields(setTaxAddress, setTaxAddressMode, setSelectedTaxAddressId)}
                                            disabled={isLoading || isSavingAddressProfile}
                                        >
                                            <Eraser className="h-4 w-4" />
                                            ล้างข้อมูล
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit("tax")}
                                            className={saveButtonClass}
                                            disabled={isLoading || isSavingAddressProfile}
                                        >
                                            {isLoading || isSavingAddressProfile ? (
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
                                    onClick={() => {
                                        const nextEditing = !editingShip;
                                        setEditingShip(nextEditing);
                                        if (nextEditing && savedAddressOptions.length > 0 && !selectedShipAddressId) {
                                            applyFirstSavedAddress(setShipAddress, setShipAddressMode, setSelectedShipAddressId, setShipAddressLabel);
                                        }
                                    }}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {editingShip ? "ยกเลิก" : "แก้ไข"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {editingShip ? (
                                <div className="space-y-4">
                                    {renderAddressSourceControls(
                                        shipAddressMode,
                                        selectedShipAddressId,
                                        shipAddressLabel,
                                        setShipAddress,
                                        setShipAddressMode,
                                        setSelectedShipAddressId,
                                        setShipAddressLabel,
                                        "จัดส่งของรางวัล",
                                    )}
                                    {renderAddressForm(shipAddress, setShipAddress, "ship")}
                                    {selectedShipAddressId.startsWith("profile-") ? (
                                        <div className="flex justify-start pt-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={() => handleDeleteAddressProfile(selectedShipAddressId.replace("profile-", ""), "ship")}
                                                disabled={isSavingAddressProfile}
                                            >
                                                <X className="h-4 w-4" />
                                                ลบข้อมูลชุดนี้
                                            </Button>
                                        </div>
                                    ) : null}
                                    <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 gap-2 rounded-2xl border-slate-200 text-muted-foreground hover:bg-slate-50 hover:text-slate-900"
                                            onClick={() => clearAddressFields(setShipAddress, setShipAddressMode, setSelectedShipAddressId)}
                                            disabled={isLoading || isSavingAddressProfile}
                                        >
                                            <Eraser className="h-4 w-4" />
                                            ล้างข้อมูล
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleSubmit("ship")}
                                            className={saveButtonClass}
                                            disabled={isLoading || isSavingAddressProfile}
                                        >
                                            {isLoading || isSavingAddressProfile ? (
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

                {/* Row 3: Password + PIN */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Card className={elevatedCardClass}>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                            <Lock className="h-5 w-5" />
                            เปลี่ยนรหัสผ่าน
                        </CardTitle>
                        <CardDescription>ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Current Password */}
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                placeholder="กรอกรหัสผ่านปัจจุบันของคุณ"
                                value={formData.currentPassword}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        currentPassword: e.target.value,
                                    }))
                                }
                                className="bg-muted/50 border-border"
                            />
                            {errors.currentPassword && (
                                <p className="text-sm text-red-500">{errors.currentPassword[0]}</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">รหัสผ่านใหม่</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showNewPassword ? "text" : "password"}
                                        placeholder="อย่างน้อย 6 ตัวอักษร"
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                password: e.target.value,
                                            }))
                                        }
                                        className="bg-muted/50 border-border pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword((prev) => !prev)}
                                        aria-label={showNewPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-red-500">{errors.password[0]}</p>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                                        value={formData.confirmPassword}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                confirmPassword: e.target.value,
                                            }))
                                        }
                                        className="bg-muted/50 border-border pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
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
                                disabled={isLoading || !passwordsMatch || !formData.password || !formData.currentPassword}
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
                <PinSettingsCard
                    hasPin={Boolean(profile?.hasPin)}
                    pinLockedUntil={profile?.pinLockedUntil ?? null}
                    pinUpdatedAt={profile?.pinUpdatedAt ?? null}
                    onUpdated={refreshProfile}
                />
                </div>
            </div>

                <FreeCropDialog
                    open={cropDialogOpen}
                    imageSrc={cropImageSrc}
                    fileName={cropFileName}
                    onClose={clearCropDialog}
                    onConfirm={handleCropConfirm}
            />
        </div>
    );
}
