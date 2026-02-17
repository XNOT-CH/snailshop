"use client";

import { useState, useMemo, useEffect } from "react";
import { showError } from "@/lib/swal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Users, Crown, Coins, Gem, Search, Pencil, Loader2 } from "lucide-react";

// VIP threshold: Total Top-up > 10,000 THB
const VIP_TOPUP_THRESHOLD = 10000;

// Gold border threshold: Lifetime Points > 5,000
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

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [roles, setRoles] = useState<Role[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state for editing
    const [formData, setFormData] = useState({
        creditBalance: "",
        totalTopup: "",
        pointBalance: "",
        lifetimePoints: "",
        role: "",
    });

    // Fetch roles on mount
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await fetch("/api/admin/roles");
                if (res.ok) {
                    const data = await res.json();
                    setRoles(data);
                }
            } catch (error) {
                console.error("Error fetching roles:", error);
            }
        };
        fetchRoles();
    }, []);

    // Filter users based on search query
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(
            (user) =>
                user.username.toLowerCase().includes(query) ||
                (user.name && user.name.toLowerCase().includes(query)) ||
                (user.email && user.email.toLowerCase().includes(query))
        );
    }, [users, searchQuery]);

    // Stats should use full user list, not filtered
    const vipCount = users.filter((u) => Number(u.totalTopup) > VIP_TOPUP_THRESHOLD).length;
    const totalCredits = users.reduce((sum, u) => sum + Number(u.creditBalance), 0);
    const totalPoints = users.reduce((sum, u) => sum + u.pointBalance, 0);

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setFormData({
            creditBalance: Number(user.creditBalance).toString(),
            totalTopup: Number(user.totalTopup).toString(),
            pointBalance: user.pointBalance.toString(),
            lifetimePoints: user.lifetimePoints.toString(),
            role: user.role,
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!editingUser) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    creditBalance: formData.creditBalance,
                    totalTopup: formData.totalTopup,
                    pointBalance: formData.pointBalance,
                    lifetimePoints: formData.lifetimePoints,
                    role: formData.role,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.error || "เกิดข้อผิดพลาด");
                return;
            }

            // Update local state
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === editingUser.id
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

            setIsDialogOpen(false);
            setEditingUser(null);
        } catch (error) {
            console.error("Error updating user:", error);
            showError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                    ระบบบริหารจัดการสมาชิก <span className="text-3xl">👥</span>
                </h1>
                <p className="text-muted-foreground">ดูข้อมูลสมาชิก เครดิต และพอยต์ทั้งหมด</p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">สมาชิกทั้งหมด</p>
                            <p className="text-2xl font-bold">{users.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Crown className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">สมาชิก VIP</p>
                            <p className="text-2xl font-bold">{vipCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Coins className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">เครดิตรวมทั้งระบบ</p>
                            <p className="text-2xl font-bold">฿{totalCredits.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Gem className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">พอยต์รวมทั้งระบบ</p>
                            <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Box */}
            <Card>
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ค้นหาด้วยชื่อผู้ใช้, ชื่อ, หรืออีเมล..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Users Table Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        รายชื่อสมาชิก ({filteredUsers.length}
                        {searchQuery && ` จาก ${users.length}`})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {filteredUsers.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-4 text-muted-foreground">
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
                                            .map((word) => word.charAt(0).toUpperCase())
                                            .join("")
                                            .slice(0, 2);

                                        const isVIP = Number(user.totalTopup) > VIP_TOPUP_THRESHOLD;
                                        const hasGoldBorder = user.lifetimePoints > GOLD_BORDER_POINTS_THRESHOLD;

                                        return (
                                            <TableRow key={user.id}>
                                                {/* User Info Column */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar
                                                            className={`h-10 w-10 ${hasGoldBorder
                                                                ? "ring-2 ring-amber-400 ring-offset-2"
                                                                : ""
                                                                }`}
                                                        >
                                                            {user.image ? (
                                                                <AvatarImage src={user.image} alt={user.username} />
                                                            ) : null}
                                                            <AvatarFallback
                                                                className={`font-semibold ${hasGoldBorder
                                                                    ? "bg-gradient-to-br from-amber-200 to-amber-400 text-amber-900"
                                                                    : "bg-indigo-100 text-indigo-600"
                                                                    }`}
                                                            >
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-medium">{user.username}</span>
                                                                {isVIP && (
                                                                    <span
                                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-sm"
                                                                        title="VIP Member (เติมเงินสะสมมากกว่า 10,000 บาท)"
                                                                    >
                                                                        👑 VIP
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">{user.email || "-"}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Current Credit */}
                                                <TableCell className="text-right font-bold text-green-600">
                                                    ฿{Number(user.creditBalance).toLocaleString()}
                                                </TableCell>

                                                {/* Total Top-up */}
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`font-medium ${isVIP ? "text-amber-600" : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        ฿{Number(user.totalTopup).toLocaleString()}
                                                    </span>
                                                </TableCell>

                                                {/* Available Points */}
                                                <TableCell className="text-right font-bold text-purple-600">
                                                    💎 {user.pointBalance.toLocaleString()}
                                                </TableCell>

                                                {/* Lifetime Points */}
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`font-medium ${hasGoldBorder ? "text-amber-600" : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        {user.lifetimePoints.toLocaleString()}
                                                    </span>
                                                </TableCell>

                                                {/* Role */}
                                                <TableCell>
                                                    <Badge
                                                        variant={user.role === "ADMIN" ? "default" : "secondary"}
                                                        className={user.role === "ADMIN" ? "bg-purple-600" : ""}
                                                    >
                                                        {user.role === "ADMIN" ? "แอดมิน" : "ผู้ใช้"}
                                                    </Badge>
                                                </TableCell>

                                                {/* Registration Date */}
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(user.createdAt).toLocaleDateString("th-TH", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </TableCell>

                                                {/* Edit Button */}
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openEditDialog(user)}
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
                </CardContent>
            </Card>

            {/* Legend */}
            <Card>
                <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground mb-2">คำอธิบายสัญลักษณ์</h3>
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-600 text-white">
                                👑 VIP
                            </span>
                            <span>= ยอดเติมเงินสะสมมากกว่า 10,000 บาท</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 ring-2 ring-amber-400 ring-offset-1"></div>
                            <span>= พอยต์สะสมมากกว่า 5,000 แต้ม</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5" />
                            แก้ไขข้อมูล: {editingUser?.username}
                        </DialogTitle>
                        <DialogDescription>
                            แก้ไขเครดิตและพอยต์ของผู้ใช้
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="creditBalance">เครดิตคงเหลือ (บาท)</Label>
                                <Input
                                    id="creditBalance"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.creditBalance}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, creditBalance: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalTopup">ยอดเติมสะสม (บาท)</Label>
                                <Input
                                    id="totalTopup"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.totalTopup}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, totalTopup: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="pointBalance">พอยต์คงเหลือ</Label>
                                <Input
                                    id="pointBalance"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={formData.pointBalance}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, pointBalance: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lifetimePoints">พอยต์สะสม</Label>
                                <Input
                                    id="lifetimePoints"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={formData.lifetimePoints}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, lifetimePoints: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="role">ยศ/บทบาท</Label>
                            <select
                                id="role"
                                value={formData.role}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, role: e.target.value }))
                                }
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="USER">ผู้ใช้ทั่วไป (USER)</option>
                                <option value="MODERATOR">ผู้ดูแล (MODERATOR)</option>
                                <option value="SELLER">ผู้ขาย (SELLER)</option>
                                <option value="ADMIN">แอดมิน (ADMIN)</option>
                                {/* Custom roles from database */}
                                {roles.filter(r => !['USER', 'MODERATOR', 'SELLER', 'ADMIN'].includes(r.code)).map((role) => (
                                    <option key={role.id} value={role.code}>
                                        {role.name} ({role.code})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                เลือกยศหรือบทบาทของผู้ใช้
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                            ยกเลิก
                        </Button>
                        <Button onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                "บันทึก"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
