import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
    // Fetch all users from database
    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
                    จัดการผู้ใช้ <span className="text-3xl">👥</span>
                </h1>
                <p className="text-zinc-500">
                    ดูผู้ใช้ที่ลงทะเบียนทั้งหมด
                </p>
            </div>

            {/* Users Table Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        ผู้ใช้ทั้งหมด ({users.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="mx-auto h-12 w-12 text-zinc-300" />
                            <p className="mt-4 text-zinc-500">ยังไม่มีสมาชิก</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>รูป</TableHead>
                                    <TableHead>ชื่อผู้ใช้</TableHead>
                                    <TableHead>อีเมล</TableHead>
                                    <TableHead>ยอดเครดิต</TableHead>
                                    <TableHead>สถานะ</TableHead>
                                    <TableHead>วันที่สมัคร</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => {
                                    // Get initials for avatar
                                    const initials = user.username
                                        .split("_")
                                        .map((word) => word.charAt(0).toUpperCase())
                                        .join("")
                                        .slice(0, 2);

                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {user.username}
                                            </TableCell>
                                            <TableCell className="text-zinc-500">
                                                {user.email || "-"}
                                            </TableCell>
                                            <TableCell className="font-bold text-green-600">
                                                ฿{Number(user.creditBalance).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={user.role === "ADMIN" ? "default" : "secondary"}
                                                    className={user.role === "ADMIN" ? "bg-purple-600" : ""}
                                                >
                                                    {user.role === "ADMIN" ? "แอดมิน" : "ผู้ใช้"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-zinc-500">
                                                {new Date(user.createdAt).toLocaleDateString("th-TH", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
