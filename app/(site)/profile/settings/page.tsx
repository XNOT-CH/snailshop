"use client";

import { SpinnerScreen } from "@/components/SpinnerScreen";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
    DropdownMenuLabel,
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
    Eye,
    EyeOff,
    Eraser,
    Send,
    Camera,
    ChevronLeft,
    ChevronRight,
    LogOut,
    type LucideIcon,
} from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { updateProfile } from "@/lib/actions/user";
import type { UpdateProfileInput } from "@/lib/validations/profile";
import { showLoading, hideLoading, showPasswordPrompt, showSuccessAlert, showErrorAlert } from "@/lib/swal";
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

type SettingsTab = "profile" | "contact" | "address" | "security";

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: LucideIcon }[] = [
    { id: "profile", label: "ข้อมูลส่วนตัว", icon: User },
    { id: "contact", label: "ข้อมูลติดต่อ", icon: Phone },
    { id: "address", label: "ที่อยู่", icon: MapPin },
    { id: "security", label: "รหัสผ่านและ PIN", icon: Lock },
];

function parseSettingsTab(value: string | null): SettingsTab | null {
    return SETTINGS_TABS.some((tab) => tab.id === value) ? (value as SettingsTab) : null;
}

// A hint for the person typing, not a rule: the server's password validation is
// unchanged and still decides what is accepted.
function getPasswordStrength(password: string) {
    if (!password) return null;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++;
    if (password.length >= 12 || /[^A-Za-z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) score++;
    const level = Math.max(score, 1);
    return { level, label: ["อ่อน", "ปานกลาง", "แข็งแรง"][level - 1] };
}

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

// useSearchParams needs a Suspense boundary, or the route cannot be prerendered.
export default function ProfileSettingsPage() {
    return (
        <Suspense fallback={<SpinnerScreen label="กำลังโหลดข้อมูล..." />}>
            <ProfileSettingsContent />
        </Suspense>
    );
}

function ProfileSettingsContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const logout = useLogout();
    // The open section lives in ?tab= so a link can land on it. With no tab,
    // phones show the section list and wider screens open the first section.
    const activeTab = parseSettingsTab(searchParams.get("tab"));
    const shownTab = activeTab ?? "profile";
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSendingVerification, setIsSendingVerification] = useState(false);
    const [isSavingAddressProfile, setIsSavingAddressProfile] = useState(false);
    const [isEditingVerifiedEmail, setIsEditingVerifiedEmail] = useState(false);
    const [loadError, setLoadError] = useState(false);
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
    const sectionCardClass =
        "overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_18px_45px_-34px_rgba(15,23,42,0.28)]";
    const sectionHeadClass = "space-y-1 px-5 pt-5 sm:px-6 sm:pt-6";
    const sectionTitleClass = "text-lg font-semibold text-[var(--page-heading)]";
    const sectionBodyClass = "space-y-5 p-5 sm:p-6";
    const sectionFootClass =
        "flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-4 sm:flex-row sm:justify-end sm:px-6";
    const saveButtonClass =
        "h-11 w-full gap-2 rounded-2xl bg-blue-600 px-6 text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.28)] transition hover:bg-blue-700 hover:shadow-[0_18px_36px_-18px_rgba(15,23,42,0.28)] sm:w-auto sm:min-w-[148px]";
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
        // 401 = not logged in — handled by the !profile alert below
        if (res.status === 401) return;
        if (!res.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ (${res.status})`);
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

    // Everything on this page lives in component state until a card is saved, so
    // closing the tab throws away whatever was typed.
    const hasUnsavedChanges =
        Boolean(profile) && (
            (formData.name ?? "") !== (profile?.name ?? "")
            || (formData.email ?? "") !== (profile?.email ?? "")
            || (formData.phone ?? "") !== (profile?.phone ?? "")
            || (formData.firstName ?? "") !== (profile?.firstName ?? "")
            || (formData.lastName ?? "") !== (profile?.lastName ?? "")
            || (formData.firstNameEn ?? "") !== (profile?.firstNameEn ?? "")
            || (formData.lastNameEn ?? "") !== (profile?.lastNameEn ?? "")
            || formData.password.length > 0
            || editingTax
            || editingShip
        );

    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", warnBeforeLeaving);
        return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
    }, [hasUnsavedChanges]);

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
            case "ship":
                // Addresses are saved through saveUserAddressProfile, which owns
                // both the profile row and the legacy columns it mirrors into.
                return {};
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

    // Fetch current profile on mount (retryable from the error state)
    const loadProfile = useCallback(async () => {
        setIsFetching(true);
        setLoadError(false);
        try {
            await refreshProfile();
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            setLoadError(true);
        }
        setIsFetching(false);
    }, [refreshProfile]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

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

        let passwordForEmailChange = "";
        if (section === "contact" && (formData.email ?? "").trim().toLowerCase() !== (profile?.email ?? "").trim().toLowerCase()) {
            const entered = await promptForCurrentPassword();
            if (!entered) return;
            passwordForEmailChange = entered;
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
            // One writer, one result: the address cards never touch updateProfile,
            // so a failure here cannot leave half of the address saved.
            if (section === "tax" || section === "ship") {
                const profileSaved = await saveAddressProfileForSection(section);
                hideLoading();
                if (!profileSaved) return;

                await showSuccessAlert("สำเร็จ!", "บันทึกข้อมูลที่อยู่เรียบร้อยแล้ว");
                setEditingTax(false);
                setEditingShip(false);
                try {
                    await refreshProfile();
                } catch { }
                router.refresh();
                return;
            }

            const submitData: UpdateProfileInput = {
                ...buildSubmitData(section),
                ...(section === "password" && pinForProtectedAction ? { pin: pinForProtectedAction } : {}),
                ...(section === "contact" && passwordForEmailChange
                    ? { currentPassword: passwordForEmailChange }
                    : {}),
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

    // The server asks for the account password before moving the e-mail, so the
    // card collects it instead of letting the save come back with an error.
    const promptForCurrentPassword = () =>
        showPasswordPrompt("ยืนยันรหัสผ่าน", "กรอกรหัสผ่านบัญชีเพื่อยืนยันการเปลี่ยนอีเมล");

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
                                ? "border-blue-300 bg-blue-50 text-blue-950 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.28)] dark:border-blue-400/45 dark:bg-blue-500/15 dark:text-blue-100 dark:shadow-none"
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
                                ? "border-blue-300 bg-blue-50 text-blue-950 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.28)] dark:border-blue-400/45 dark:bg-blue-500/15 dark:text-blue-100 dark:shadow-none"
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
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/12 dark:text-amber-100">
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
        return <SpinnerScreen label="กำลังโหลดข้อมูล..." />;
    }

    if (!profile && loadError) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <Alert className="max-w-md border-amber-500/25 bg-amber-500/10 text-foreground">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง
                    </AlertDescription>
                </Alert>
                <Button onClick={() => void loadProfile()} className="rounded-2xl px-6">
                    ลองใหม่
                </Button>
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

    // Completeness reads the saved profile, not what is being typed, so a
    // section only counts once it has actually been saved.
    const missingNameLabel = (
        [
            [profile.firstName, "ชื่อ (ภาษาไทย)"],
            [profile.lastName, "นามสกุล (ภาษาไทย)"],
            [profile.firstNameEn, "ชื่อ (ภาษาอังกฤษ)"],
            [profile.lastNameEn, "นามสกุล (ภาษาอังกฤษ)"],
        ] as const
    ).find(([value]) => !value?.trim())?.[1];
    const hasSavedShipAddress = hasAddressData(savedShipAddress);
    const tabStatus: Record<SettingsTab, { complete: boolean; summary: string }> = {
        profile: {
            complete: !missingNameLabel,
            summary: missingNameLabel
                ? `ยังไม่กรอก${missingNameLabel}`
                : [profile.firstName, profile.lastName].join(" "),
        },
        contact: {
            complete: Boolean(profile.phone && profile.email && profile.emailVerified),
            summary: [
                profile.phone || "ยังไม่กรอกเบอร์มือถือ",
                profile.email ? `อีเมล${profile.emailVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"}` : "ยังไม่กรอกอีเมล",
            ].join(" · "),
        },
        address: {
            complete: hasSavedShipAddress,
            summary: `จัดส่ง: ${hasSavedShipAddress ? "มีแล้ว" : "ยังไม่มี"} · ใบกำกับภาษี: ${
                hasAddressData(savedTaxAddress) ? "มีแล้ว" : "ยังไม่มี"
            }`,
        },
        security: {
            complete: profile.hasPin,
            summary: profile.hasPin ? "PIN เปิดใช้งานแล้ว" : "ยังไม่ได้ตั้ง PIN",
        },
    };
    const completeCount = SETTINGS_TABS.filter((tab) => tabStatus[tab.id].complete).length;
    const shownName = profile.name?.trim() || profile.username;
    const passwordStrength = getPasswordStrength(formData.password);
    const selectTab = (tab: SettingsTab) => router.replace(`${pathname}?tab=${tab}`, { scroll: false });

    const renderIncompletePill = () => (
        <span className="shrink-0 rounded-full bg-amber-500/12 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            ยังไม่ครบ
        </span>
    );

    const renderSaveButton = (onClick: () => void, disabled: boolean, busy: boolean) => (
        <Button type="button" onClick={onClick} className={saveButtonClass} disabled={disabled}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            บันทึก
        </Button>
    );

    const renderAddressSection = (section: "tax" | "ship") => {
        const isTax = section === "tax";
        const title = isTax ? "ที่อยู่ออกใบกำกับภาษี" : "ที่อยู่จัดส่งของรางวัล";
        const address = isTax ? taxAddress : shipAddress;
        const setAddress = isTax ? setTaxAddress : setShipAddress;
        const editing = isTax ? editingTax : editingShip;
        const setEditing = isTax ? setEditingTax : setEditingShip;
        const mode = isTax ? taxAddressMode : shipAddressMode;
        const setMode = isTax ? setTaxAddressMode : setShipAddressMode;
        const selectedId = isTax ? selectedTaxAddressId : selectedShipAddressId;
        const setSelectedId = isTax ? setSelectedTaxAddressId : setSelectedShipAddressId;
        const label = isTax ? taxAddressLabel : shipAddressLabel;
        const setLabel = isTax ? setTaxAddressLabel : setShipAddressLabel;
        const fallbackLabel = isTax ? "ใบกำกับภาษี" : "จัดส่งของรางวัล";

        const startEditing = () => {
            setEditing(true);
            if (savedAddressOptions.length > 0 && !selectedId) {
                applyFirstSavedAddress(setAddress, setMode, setSelectedId, setLabel);
            }
        };

        return (
            <section className={sectionCardClass}>
                <div className={sectionHeadClass}>
                    <h2 className={sectionTitleClass}>{title}</h2>
                    <p className="text-sm text-muted-foreground">
                        {isTax
                            ? "ที่อยู่สำหรับออกใบกำกับภาษี (ไม่จำเป็นต้องกรอก)"
                            : "ที่อยู่สำหรับจัดส่งของรางวัล (ไม่จำเป็นต้องกรอก)"}
                    </p>
                </div>
                {editing ? (
                    <>
                        <div className={sectionBodyClass}>
                            {renderAddressSourceControls(
                                mode,
                                selectedId,
                                label,
                                setAddress,
                                setMode,
                                setSelectedId,
                                setLabel,
                                fallbackLabel,
                            )}
                            {renderAddressForm(address, setAddress, section, isTax)}
                            {selectedId.startsWith("profile-") ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleDeleteAddressProfile(selectedId.replace("profile-", ""), section)}
                                    disabled={isSavingAddressProfile}
                                >
                                    <X className="h-4 w-4" />
                                    ลบข้อมูลชุดนี้
                                </Button>
                            ) : null}
                        </div>
                        <div className={sectionFootClass}>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-11 rounded-2xl text-muted-foreground"
                                onClick={() => setEditing(false)}
                                disabled={isLoading || isSavingAddressProfile}
                            >
                                ยกเลิก
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 gap-2 rounded-2xl border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => clearAddressFields(setAddress, setMode, setSelectedId)}
                                disabled={isLoading || isSavingAddressProfile}
                            >
                                <Eraser className="h-4 w-4" />
                                ล้างข้อมูล
                            </Button>
                            {renderSaveButton(
                                () => handleSubmit(section),
                                isLoading || isSavingAddressProfile,
                                isLoading || isSavingAddressProfile,
                            )}
                        </div>
                    </>
                ) : (
                    <div className={sectionBodyClass}>
                        {hasAddressData(address) ? (
                            <div className="flex flex-wrap items-start gap-3 rounded-2xl border-2 border-primary/70 bg-primary/5 p-4">
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-foreground">{label}</p>
                                        {isTax ? null : (
                                            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary">
                                                ค่าเริ่มต้น
                                            </span>
                                        )}
                                    </div>
                                    {renderAddressDisplay(address)}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 rounded-xl border-border"
                                    onClick={startEditing}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    แก้ไข
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-border px-5 py-7 text-center">
                                {isTax ? (
                                    <FileText className="h-7 w-7 text-muted-foreground" />
                                ) : (
                                    <Truck className="h-7 w-7 text-muted-foreground" />
                                )}
                                <p className="text-sm text-muted-foreground">ยังไม่มี{title}</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {savedAddressOptions.length > 0 ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-10 rounded-xl border-border"
                                            onClick={() => {
                                                setEditing(true);
                                                applyFirstSavedAddress(setAddress, setMode, setSelectedId, setLabel);
                                            }}
                                        >
                                            ใช้ที่อยู่เดิม
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="button"
                                        className="h-10 rounded-xl"
                                        onClick={() => {
                                            setEditing(true);
                                            startNewAddress(setAddress, setMode, setSelectedId, setLabel, fallbackLabel);
                                        }}
                                    >
                                        กรอกที่อยู่ใหม่
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>
        );
    };

    const sections: Record<SettingsTab, React.ReactNode> = {
        profile: (
            <section className={sectionCardClass}>
                <div className={sectionHeadClass}>
                    <h2 className={sectionTitleClass}>ข้อมูลส่วนตัว</h2>
                    <p className="text-sm text-muted-foreground">ชื่อและนามสกุล (ภาษาไทยและภาษาอังกฤษ)</p>
                </div>
                <div className={sectionBodyClass}>
                    <div className="grid grid-cols-1 gap-5 @xl:grid-cols-2">
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image">URL รูปโปรไฟล์ (ถ้าต้องการใช้ลิงก์ภายนอก)</Label>
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
                            className="bg-muted/50 border-border"
                        />
                        {errors.image && (
                            <p className="text-sm text-red-500">{errors.image[0]}</p>
                        )}
                    </div>
                </div>
                <div className={sectionFootClass}>
                    {renderSaveButton(() => handleSubmit("personal"), isLoading, isLoading)}
                </div>
            </section>
        ),
        contact: (
            <section className={sectionCardClass}>
                <div className={sectionHeadClass}>
                    <h2 className={sectionTitleClass}>ข้อมูลติดต่อ</h2>
                    <p className="text-sm text-muted-foreground">เบอร์มือถือและอีเมลสำหรับการติดต่อ</p>
                </div>
                <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 @xl:grid-cols-2">
                    {/* Username (read-only) */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground">Username</Label>
                        <Input
                            value={profile.username}
                            disabled
                            className="bg-muted text-muted-foreground border-border"
                        />
                        <p className="text-xs text-muted-foreground">Username ไม่สามารถเปลี่ยนได้</p>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">
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
                        <Label htmlFor="phone">
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
                            <div className="flex flex-wrap items-center gap-2">
                                <Label htmlFor="email">อีเมล</Label>
                                {formData.email ? (
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                                            isEmailVerified
                                                ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                                                : "bg-amber-500/12 text-amber-700 dark:text-amber-300"
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
                            </div>
                            {isEmailVerified ? (
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                                    onClick={() => setIsEditingVerifiedEmail(true)}
                                    disabled={isEditingVerifiedEmail || isLoading}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    เปลี่ยนอีเมล
                                </button>
                            ) : null}
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
                                    ? "bg-muted text-muted-foreground border-border"
                                    : "bg-muted/50 border-border"
                            }
                        />
                        {errors.email && (
                            <p className="text-sm text-red-500">{errors.email[0]}</p>
                        )}
                        {shouldLockVerifiedEmail ? (
                            <p className="text-xs text-muted-foreground">
                                อีเมลนี้ยืนยันแล้ว กดเปลี่ยนอีเมลก่อนหากต้องการแก้ไข
                            </p>
                        ) : null}
                        {emailChanged ? (
                            <p className="text-xs text-amber-600">
                                หลังบันทึกอีเมลใหม่แล้ว ระบบจะให้ยืนยันอีเมลอีกครั้ง
                            </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {!isEmailVerified && profile.email ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 gap-2 rounded-xl border-border px-3 text-sm"
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
                            ) : null}
                            {isEditingVerifiedEmail ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-9 rounded-xl px-3 text-sm text-muted-foreground"
                                    onClick={handleCancelEmailEdit}
                                    disabled={isLoading}
                                >
                                    <X className="h-4 w-4" />
                                    ยกเลิกเปลี่ยนอีเมล
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className={sectionFootClass}>
                    {renderSaveButton(() => handleSubmit("contact"), isLoading, isLoading)}
                </div>
            </section>
        ),
        address: (
            <>
                {renderAddressSection("ship")}
                {renderAddressSection("tax")}
            </>
        ),
        security: (
            <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-2">
                <section className={sectionCardClass}>
                    <div className={sectionHeadClass}>
                        <h2 className={sectionTitleClass}>เปลี่ยนรหัสผ่าน</h2>
                        <p className="text-sm text-muted-foreground">ปล่อยว่างไว้ถ้าไม่ต้องการเปลี่ยนรหัสผ่าน</p>
                    </div>
                    <div className={`${sectionBodyClass} max-w-md`}>
                        {/* Current Password */}
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">รหัสผ่านปัจจุบัน</Label>
                            <Input
                                id="currentPassword"
                                type="password"
                                autoComplete="current-password"
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

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">รหัสผ่านใหม่</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showNewPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    placeholder="อย่างน้อย 8 ตัวอักษร"
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
                            {passwordStrength ? (
                                <div className="space-y-1.5 pt-0.5">
                                    <div className="flex gap-1" aria-hidden="true">
                                        {[1, 2, 3].map((step) => (
                                            <span
                                                key={step}
                                                className={`h-1 flex-1 rounded-full ${
                                                    step > passwordStrength.level
                                                        ? "bg-muted"
                                                        : passwordStrength.level === 1
                                                            ? "bg-red-500"
                                                            : passwordStrength.level === 2
                                                                ? "bg-amber-500"
                                                                : "bg-emerald-500"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">ความแข็งแรง: {passwordStrength.label}</p>
                                </div>
                            ) : null}
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
                                    autoComplete="new-password"
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

                        {/* Password Match Indicator */}
                        {formData.confirmPassword && (
                            <Alert
                                className={
                                    passwordsMatch
                                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                                        : "border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10"
                                }
                            >
                                {passwordsMatch ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                                            รหัสผ่านตรงกัน
                                        </AlertDescription>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-rose-700 dark:text-rose-300">
                                            รหัสผ่านไม่ตรงกัน
                                        </AlertDescription>
                                    </>
                                )}
                            </Alert>
                        )}
                    </div>
                    <div className={sectionFootClass}>
                        {renderSaveButton(
                            () => handleSubmit("password"),
                            isLoading || !passwordsMatch || !formData.password || !formData.currentPassword,
                            isLoading,
                        )}
                    </div>
                </section>
                <PinSettingsCard
                    hasPin={Boolean(profile?.hasPin)}
                    pinLockedUntil={profile?.pinLockedUntil ?? null}
                    pinUpdatedAt={profile?.pinUpdatedAt ?? null}
                    onUpdated={refreshProfile}
                />
            </div>
        ),
    };

    // The dashboard shell already paints the page background and padding; on its
    // own route the page brings the same glow the other redesigned pages open with.
    const inDashboard = pathname.startsWith("/dashboard");

    return (
        <div
            className={
                inDashboard
                    ? "profile-settings-page"
                    : "profile-settings-page min-h-screen bg-[linear-gradient(var(--page-glow),var(--page-base)_320px)] px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-8"
            }
        >
            <div className={`@container w-full max-w-5xl space-y-6 ${inDashboard ? "" : "mx-auto"}`}>
                <PageBreadcrumb
                    items={[
                        { label: "แดชบอร์ด", href: "/dashboard" },
                        { label: "ตั้งค่าบัญชี" },
                    ]}
                />

                {/* Phones hide the title and the profile card inside a section so the form starts near the top. */}
                <div className={activeTab ? "hidden @3xl:block" : ""}>
                    <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">ตั้งค่าบัญชี</h1>
                    <p className="mt-2 text-muted-foreground">จัดการข้อมูลส่วนตัวและการตั้งค่าบัญชีของคุณ</p>
                </div>

                {/* Profile card: avatar, name, completeness */}
                <section
                    className={`${sectionCardClass} ${activeTab ? "hidden @3xl:flex" : "flex"} flex-col items-center gap-4 p-5 text-center @xl:flex-row @xl:flex-wrap @xl:gap-5 @xl:px-6 @xl:py-4 @xl:text-left`}
                >
                    <div className="relative shrink-0">
                        {hasProfileImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={formData.image}
                                alt="Profile preview"
                                className="h-14 w-14 rounded-full object-cover"
                                onError={handleProfileImagePreviewError}
                            />
                        ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                                {profileInitial}
                            </div>
                        )}
                        {isUploadingImage ? (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                        ) : null}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isUploadingImage}
                                    aria-label="เปลี่ยนรูปโปรไฟล์"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 rounded-2xl p-2">
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                    รองรับ JPG, PNG, WebP, GIF สูงสุด 5MB
                                </DropdownMenuLabel>
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
                        <input
                            ref={profileImageInputRef}
                            id="profile-image-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleProfileImageUpload}
                        />
                    </div>
                    <div className="w-full min-w-0 @xl:w-auto @xl:flex-[1_1_220px]">
                        <p className="font-semibold text-foreground">{shownName}</p>
                        {profile.email ? <p className="break-words text-sm text-muted-foreground">{profile.email}</p> : null}
                    </div>
                    <div className="w-full space-y-2 @xl:w-56">
                        <p className="text-sm text-muted-foreground">
                            ข้อมูลบัญชีครบแล้ว{" "}
                            <strong className="font-semibold text-foreground">{completeCount} จาก {SETTINGS_TABS.length} หมวด</strong>
                        </p>
                        <div className="flex gap-1" aria-hidden="true">
                            {SETTINGS_TABS.map((tab, index) => (
                                <span
                                    key={tab.id}
                                    className={`h-1.5 flex-1 rounded-full ${index < completeCount ? "bg-primary" : "bg-muted"}`}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Phones without a ?tab: the section list */}
                {activeTab ? null : (
                    <div className="space-y-4 @3xl:hidden">
                        {profile.email && !profile.emailVerified ? (
                            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                                <Mail className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
                                <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">อีเมลยังไม่ยืนยัน</p>
                                <Button
                                    type="button"
                                    className="h-9 gap-2 rounded-xl bg-amber-700 px-3 text-sm text-white hover:bg-amber-800"
                                    onClick={handleSendVerificationEmail}
                                    disabled={isSendingVerification || isLoading || emailChanged}
                                >
                                    {isSendingVerification ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    ยืนยันอีเมล
                                </Button>
                            </div>
                        ) : null}
                        <nav aria-label="หมวดการตั้งค่า" className={`${sectionCardClass} divide-y divide-border`}>
                            {SETTINGS_TABS.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <Link
                                        key={tab.id}
                                        href={`${pathname}?tab=${tab.id}`}
                                        className="flex min-h-16 items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/50"
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-medium text-foreground">{tab.label}</span>
                                            <span className="line-clamp-2 block text-sm text-muted-foreground">{tabStatus[tab.id].summary}</span>
                                        </span>
                                        {tabStatus[tab.id].complete ? null : renderIncompletePill()}
                                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    </Link>
                                );
                            })}
                        </nav>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 w-full gap-2 rounded-2xl border-red-200 bg-card text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:hover:bg-red-500/10"
                            onClick={() => void logout()}
                        >
                            <LogOut className="h-4 w-4" />
                            ออกจากระบบ
                        </Button>
                    </div>
                )}

                {/* Wider screens: section tabs. A second side menu would sit against the dashboard's own. */}
                <div className="hidden items-center gap-6 border-b border-border @3xl:flex">
                    <nav aria-label="หมวดการตั้งค่า" className="-mb-px flex flex-wrap gap-7">
                        {SETTINGS_TABS.map((tab) => {
                            const isActive = tab.id === shownTab;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    aria-current={isActive ? "page" : undefined}
                                    onClick={() => selectTab(tab.id)}
                                    className={`inline-flex min-h-12 items-center gap-2 border-b-2 px-1 transition-colors duration-300 ease-out ${
                                        isActive
                                            ? "border-primary font-semibold text-[var(--page-heading)]"
                                            : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {tab.label}
                                    {tabStatus[tab.id].complete ? null : renderIncompletePill()}
                                </button>
                            );
                        })}
                    </nav>
                    <span className="flex-1" />
                    <button
                        type="button"
                        onClick={() => void logout()}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                        <LogOut className="h-4 w-4" />
                        ออกจากระบบ
                    </button>
                </div>

                <div className={activeTab ? "" : "hidden @3xl:block"}>
                    <div className="space-y-5">
                        <Link
                            href={pathname}
                            replace
                            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground @3xl:hidden"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            หมวดการตั้งค่า
                        </Link>
                        {sections[shownTab]}
                    </div>
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
