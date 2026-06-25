import Link from "next/link";
import { CheckCircle, Mail, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyEmailVerificationToken } from "@/lib/emailVerification";

interface VerifyEmailPageProps {
    searchParams: Promise<{
        token?: string;
    }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
    const { token } = await searchParams;
    const result = token
        ? await verifyEmailVerificationToken(token)
        : { success: false as const, message: "ไม่พบ token สำหรับยืนยันอีเมล" };
    const isSuccess = result.success;
    const Icon = isSuccess ? CheckCircle : XCircle;

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-10">
            <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center">
                <Card className="w-full border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)]">
                    <CardHeader className="space-y-4 text-center">
                        <div className={`mx-auto rounded-2xl p-3 ${isSuccess ? "bg-emerald-50 dark:bg-emerald-500/15" : "bg-red-50 dark:bg-red-500/15"}`}>
                            <Icon className={`h-9 w-9 ${isSuccess ? "text-emerald-600" : "text-red-600"}`} />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">
                                {isSuccess ? "ยืนยันอีเมลสำเร็จ" : "ยืนยันอีเมลไม่สำเร็จ"}
                            </CardTitle>
                            <CardDescription className="mt-2 text-base">
                                {result.message}
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        <Button asChild className="h-11 gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700">
                            <Link href="/profile/settings">
                                <Mail className="h-4 w-4" />
                                กลับไปข้อมูลติดต่อ
                            </Link>
                        </Button>
                        {!isSuccess ? (
                            <p className="text-center text-sm text-muted-foreground">
                                หากลิงก์หมดอายุ ให้กลับไปกดส่งอีเมลยืนยันใหม่ในหน้าข้อมูลติดต่อ
                            </p>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
