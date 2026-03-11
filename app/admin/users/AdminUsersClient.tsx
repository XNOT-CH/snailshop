"use client";

import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import { showError, showSuccess, showLoading, hideLoading } from "@/lib/swal";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Crown, Coins, Gem, Search, Pencil } from "lucide-react";

const VIP_TOPUP_THRESHOLD = 10000;
const GOLD_BORDER_POINTS_THRESHOLD = 5000;

interface User {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    creditBalance: string;
    totalTopup: string;
    pointBalance: number;
    lifetimePoints: number;
    createdAt: string;
}

interface Role {
    id: string;
    name: string;
    code: string;
    iconUrl: string | null;
}

interface AdminUsersClientProps {
    initialUsers: User[];
}

export default function AdminUsersClient({ initialUsers }: Readonly<AdminUsersClientProps>) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [roles, setRoles] = useState<Role[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetch("/api/admin/roles")
            .then((r) => r.json())
            .then((data) => setRoles(data))
            .catch(console.error);
    }, []);

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                u.username.toLowerCase().includes(q) ||
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
        );
    }, [users, searchQuery]);

    const vipCount = users.filter((u) => Number(u.totalTopup) > VIP_TOPUP_THRESHOLD).length;
    const totalCredits = users.reduce((s, u) => s + Number(u.creditBalance), 0);
    const totalPoints = users.reduce((s, u) => s + u.pointBalance, 0);

    const openEditDialog = (user: User) => {
        const customRoles = roles.filter((r) => !["USER", "MODERATOR", "SELLER", "ADMIN"].includes(r.code));
        const customOptions = customRoles.map((r) => `<option value="${r.code}" ${user.role === r.code ? "selected" : ""}>${r.name} (${r.code})</option>`).join("");

        Swal.fire({
            title: `แก้ไขข้อมูล: ${user.username}`,
            width: "min(96vw, 520px)",
            showCancelButton: true,
            confirmButtonText: "บันทึก",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#1a56db",
            cancelButtonColor: "#6b7280",
            reverseButtons: true,
            focusConfirm: false,
            customClass: {
                popup: "rounded-2xl text-left",
                confirmButton: "rounded-xl px-6 py-2",
                cancelButton: "rounded-xl px-6 py-2",
            },
            html: `
                <p class="text-sm text-gray-500 mb-4">แก้ไขเครดิตและพอยต์ของผู้ใช้</p>
                <div class="space-y-4 text-left">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">เครดิตคงเหลือ (บาท)</label>
                            <input id="swal-credit" type="number" min="0" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${Number(user.creditBalance)}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">ยอดเติมสะสม (บาท)</label>
                            <input id="swal-topup" type="number" min="0" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${Number(user.totalTopup)}">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">พอยต์คงเหลือ</label>
                            <input id="swal-point" type="number" min="0" step="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${user.pointBalance}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">พอยต์สะสม</label>
                            <input id="swal-lifetime" type="number" min="0" step="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value="${user.lifetimePoints}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ยศ/บทบาท</label>
                        <select id="swal-role" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="USER" ${user.role === "USER" ? "selected" : ""}>ผู้ใช้ทั่วไป (USER)</option>
                            <option value="MODERATOR" ${user.role === "MODERATOR" ? "selected" : ""}>ผู้ดูแล (MODERATOR)</option>
                            <option value="SELLER" ${user.role === "SELLER" ? "selected" : ""}>ผู้ขาย (SELLER)</option>
                            <option value="ADMIN" ${user.role === "ADMIN" ? "selected" : ""}>แอดมิน (ADMIN)</option>
                            ${customOptions}
                        </select>
                        <p class="text-xs text-gray-400 mt-1">เลือกยศหรือบทบาทของผู้ใช้</p>
                    </div>
                </div>
            `,
            preConfirm: () => ({
                creditBalance: (document.getElementById("swal-credit") as HTMLInputElement)?.value,
                totalTopup: (document.getElementById("swal-topup") as HTMLInputElement)?.value,
                pointBalance: (document.getElementById("swal-point") as HTMLInputElement)?.value,
                lifetimePoints: (document.getElementById("swal-lifetime") as HTMLInputElement)?.value,
                role: (document.getElementById("swal-role") as HTMLSelectElement)?.value,
            }),
        }).then(async (result) => {
            if (!result.isConfirmed || !result.value) return;

            showLoading("กำลังบันทึก...");
            try {
                const response = await fetch(`/api/admin/users/${user.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(result.value),
                });
                const data = await response.json();
                hideLoading();

                if (!response.ok) {
                    showError(data.error || "เกิดข้อผิดพลาด");
                    return;
                }

                setUsers((prev) =>
                    prev.map((u) =>
                        u.id === user.id
                            ? {
                                ...u,
                                creditBalance: data.user.creditBalance,
                                totalTopup: data.user.totalTopup,
                                pointBalance: data.user.pointBalance,
                                lifetimePoints: data.user.lifetimePoints,
                                role: data.user.role,
                            }
                            : u
                    )
                );
                showSuccess("บันทึกข้อมูลสำเร็จ!");
            } catch {
                hideLoading();
                showError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        });
    };

    const statCards = [
        { label: "สมาชิกทั้งหมด", value: users.length, icon: Users, iconBg: "bg-blue-100", iconColor: "text-[#1a56db]" },
        { label: "สมาชิก VIP", value: vipCount, icon: Crown, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
        { label: "เครดิตรวมทั้งระบบ", value: `฿${totalCredits.toLocaleString()}`, icon: Coins, iconBg: "bg-green-100", iconColor: "text-green-600" },
        { label: "พอยต์รวมทั้งระบบ", value: totalPoints.toLocaleString(), icon: Gem, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Users className="h-6 w-6 text-[#1a56db]" />
                    ระบบบริหารจัดการสมาชิก
                </h1>
                <p className="text-muted-foreground mt-1">ดูข้อมูลสมาชิก เครดิต และพอยต์ทั้งหมด</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
                    <div key={label} className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-4 flex items-center gap-3 shadow-sm">
                        <div className={`p-2.5 rounded-lg shrink-0 ${iconBg}`}>
                            <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground truncate">{label}</p>
                            <p className="text-xl font-bold truncate">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm px-4 py-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="ค้นหาด้วยชื่อผู้ใช้, ชื่อ, หรืออีเมล..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
                {/* Card Header */}
                <div className="border-b border-border py-3 px-5 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#1a56db] rounded flex items-center justify-center">
                        <Users className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="font-bold text-foreground">
                        รายชื่อสมาชิก ({filteredUsers.length}{searchQuery && ` จาก ${users.length}`})
                    </span>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="py-14 text-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">
                            {searchQuery ? "ไม่พบผู้ใช้ที่ตรงกับคำค้นหา" : "ยังไม่มีสมาชิก"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ข้อมูลสมาชิก</TableHead>
                                    <TableHead className="text-right">เครดิตคงเหลือ</TableHead>
                                    <TableHead className="text-right">ยอดเติมสะสม</TableHead>
                                    <TableHead className="text-right">พอยต์คงเหลือ</TableHead>
                                    <TableHead className="text-right">พอยต์สะสม</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>วันที่สมัคร</TableHead>
                                    <TableHead className="text-center">จัดการ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => {
                                    const initials = user.username
                                        .split("_")
                                        .map((w) => w.charAt(0).toUpperCase())
                                        .join("")
                                        .slice(0, 2);
                                    const isVIP = Number(user.totalTopup) > VIP_TOPUP_THRESHOLD;
                                    const hasGoldBorder = user.lifetimePoints > GOLD_BORDER_POINTS_THRESHOLD;

                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className={`h-10 w-10 ${hasGoldBorder ? "ring-2 ring-amber-400 ring-offset-2" : ""}`}>
                                                        {user.image ? <AvatarImage src={user.image} alt={user.username} /> : null}
                                                        <AvatarFallback
                                                            className={`font-semibold ${hasGoldBorder
                                                                ? "bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900"
                                                                : "bg-blue-100 text-[#1a56db]"
                                                                }`}
                                                        >
                                                            {initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium">{user.username}</span>
                                                            {isVIP && (
                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-sm">
                                                                    👑 VIP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{user.email || "-"}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                ฿{Number(user.creditBalance).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-medium ${isVIP ? "text-amber-600" : "text-muted-foreground"}`}>
                                                    ฿{Number(user.totalTopup).toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-purple-600">
                                                💎 {user.pointBalance.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className={`font-medium ${hasGoldBorder ? "text-amber-600" : "text-muted-foreground"}`}>
                                                    {user.lifetimePoints.toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.role === "ADMIN" ? "default" : "secondary"}
                                                    className={user.role === "ADMIN" ? "bg-[#1a56db]" : ""}
                                                >
                                                    {user.role === "ADMIN" ? "แอดมิน" : "ผู้ใช้"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(user.createdAt).toLocaleDateString("th-TH", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(user)}
                                                    className="border-[#1a56db] text-[#1a56db] hover:bg-blue-50 dark:hover:bg-blue-950"
                                                >
                                                    <Pencil className="h-4 w-4 mr-1" />
                                                    แก้ไข
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm px-5 py-4">
                <h3 className="font-semibold text-foreground mb-3 text-sm">คำอธิบายสัญลักษณ์</h3>
                <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                            👑 VIP
                        </span>
                        <span>= ยอดเติมเงินสะสมมากกว่า 10,000 บาท</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 ring-2 ring-amber-400 ring-offset-1" />
                        <span>= พอยต์สะสมมากกว่า 5,000 แต้ม</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
