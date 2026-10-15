"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// ข้อมูล raw structure จาก thailand-geography-data
// public/data/thai-geography.json is thailand-geography-json (MIT, licence
// beside it) cut down to the four fields this selector reads.
interface RawGeography {
    provinceNameTh: string;
    districtNameTh: string;
    subdistrictNameTh: string;
    postalCode: number;
}

export interface AddressValue {
    province: string;
    district: string;
    subdistrict: string;
    postalCode: string;
}

interface ThaiAddressSelectorProps {
    value: AddressValue;
    onChange: (value: AddressValue) => void;
    idPrefix?: string;
    disabled?: boolean;
}

// Cache for geography data
let cachedData: RawGeography[] | null = null;

export function ThaiAddressSelector({
    value,
    onChange,
    idPrefix = "address",
    disabled = false,
}: Readonly<ThaiAddressSelectorProps>) {
    const [data, setData] = useState<RawGeography[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch data on mount
    useEffect(() => {
        async function fetchData() {
            if (cachedData) {
                setData(cachedData);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Served from our own origin: the CSP's connect-src only allows
                // 'self', so the GitHub copy this used to fetch was blocked.
                const res = await fetch("/data/thai-geography.json");
                if (!res.ok) throw new Error("Failed to fetch");
                const json = await res.json();
                cachedData = json;
                setData(json);
            } catch {
                setError("ไม่สามารถโหลดข้อมูลที่อยู่ได้");
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, []);

    // Get unique provinces
    const provinces = useMemo(() => {
        const seen = new Set<string>();
        return data
            .filter((item) => {
                if (seen.has(item.provinceNameTh)) return false;
                seen.add(item.provinceNameTh);
                return true;
            })
            .map((item) => item.provinceNameTh)
            .sort((a, b) => a.localeCompare(b, "th"));
    }, [data]);

    // Get districts for selected province
    const districts = useMemo(() => {
        if (!value.province) return [];
        const seen = new Set<string>();
        return data
            .filter((item) => item.provinceNameTh === value.province)
            .filter((item) => {
                if (seen.has(item.districtNameTh)) return false;
                seen.add(item.districtNameTh);
                return true;
            })
            .map((item) => item.districtNameTh)
            .sort((a, b) => a.localeCompare(b, "th"));
    }, [data, value.province]);

    // Get subdistricts for selected district
    const subdistricts = useMemo(() => {
        if (!value.province || !value.district) return [];
        const seen = new Set<string>();
        return data
            .filter(
                (item) =>
                    item.provinceNameTh === value.province &&
                    item.districtNameTh === value.district
            )
            .filter((item) => {
                if (seen.has(item.subdistrictNameTh)) return false;
                seen.add(item.subdistrictNameTh);
                return true;
            })
            .map((item) => ({
                name: item.subdistrictNameTh,
                postalCode: item.postalCode.toString(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "th"));
    }, [data, value.province, value.district]);

    // Handle province change
    const handleProvinceChange = (province: string) => {
        onChange({
            province,
            district: "",
            subdistrict: "",
            postalCode: "",
        });
    };

    // Handle district change
    const handleDistrictChange = (district: string) => {
        onChange({
            ...value,
            district,
            subdistrict: "",
            postalCode: "",
        });
    };

    // Handle subdistrict change
    const handleSubdistrictChange = (subdistrict: string) => {
        const found = subdistricts.find((s) => s.name === subdistrict);
        onChange({
            ...value,
            subdistrict,
            postalCode: found?.postalCode || "",
        });
    };

    if (error) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-amber-600">{error} - กรุณากรอกข้อมูลด้วยตนเอง</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor={`${idPrefix}-province`}>จังหวัด</Label>
                        <Input
                            id={`${idPrefix}-province`}
                            placeholder="จังหวัด"
                            value={value.province}
                            onChange={(e) => onChange({ ...value, province: e.target.value })}
                            disabled={disabled}
                            className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${idPrefix}-district`}>อำเภอ/เขต</Label>
                        <Input
                            id={`${idPrefix}-district`}
                            placeholder="อำเภอ/เขต"
                            value={value.district}
                            onChange={(e) => onChange({ ...value, district: e.target.value })}
                            disabled={disabled}
                            className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${idPrefix}-subdistrict`}>ตำบล/แขวง</Label>
                        <Input
                            id={`${idPrefix}-subdistrict`}
                            placeholder="ตำบล/แขวง"
                            value={value.subdistrict}
                            onChange={(e) => onChange({ ...value, subdistrict: e.target.value })}
                            disabled={disabled}
                            className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${idPrefix}-postalCode`}>รหัสไปรษณีย์</Label>
                        <Input
                            id={`${idPrefix}-postalCode`}
                            placeholder="xxxxx"
                            value={value.postalCode}
                            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
                            disabled={disabled}
                            className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Province */}
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-province`}>จังหวัด</Label>
                {isLoading ? (
                    <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">กำลังโหลด...</span>
                    </div>
                ) : (
                    <Select
                        value={value.province}
                        onValueChange={handleProvinceChange}
                        disabled={disabled}
                    >
                        <SelectTrigger
                            id={`${idPrefix}-province`}
                            className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                        >
                            <SelectValue placeholder="เลือกจังหวัด" />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                            {provinces.map((province) => (
                                <SelectItem key={province} value={province}>
                                    {province}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* District */}
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-district`}>อำเภอ/เขต</Label>
                <Select
                    value={value.district}
                    onValueChange={handleDistrictChange}
                    disabled={disabled || !value.province}
                >
                    <SelectTrigger
                        id={`${idPrefix}-district`}
                        className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                    >
                        <SelectValue placeholder={value.province ? "เลือกอำเภอ/เขต" : "เลือกจังหวัดก่อน"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                        {districts.map((district) => (
                            <SelectItem key={district} value={district}>
                                {district}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Subdistrict */}
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-subdistrict`}>ตำบล/แขวง</Label>
                <Select
                    value={value.subdistrict}
                    onValueChange={handleSubdistrictChange}
                    disabled={disabled || !value.district}
                >
                    <SelectTrigger
                        id={`${idPrefix}-subdistrict`}
                        className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                    >
                        <SelectValue placeholder={value.district ? "เลือกตำบล/แขวง" : "เลือกอำเภอก่อน"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                        {subdistricts.map((sub) => (
                            <SelectItem key={sub.name} value={sub.name}>
                                {sub.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Postal Code (auto-filled) */}
            <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-postalCode`}>รหัสไปรษณีย์</Label>
                <Input
                    id={`${idPrefix}-postalCode`}
                    placeholder="กรอกอัตโนมัติ"
                    value={value.postalCode}
                    onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
                    disabled={disabled}
                    className="h-11 w-full rounded-xl border-border bg-muted/40 data-[size=default]:h-11"
                    readOnly={Boolean(value.subdistrict)}
                />
                {value.subdistrict && (
                    <p className="text-xs text-muted-foreground">กรอกอัตโนมัติจากตำบล/แขวง</p>
                )}
            </div>
        </div>
    );
}
