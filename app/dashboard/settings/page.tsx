"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Settings,
    Lock,
    Loader2,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.newPassword || !formData.confirmPassword) {
            alert("Please fill in all fields");
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (formData.newPassword.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password: formData.newPassword,
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert("✅ " + data.message);
                setFormData({ newPassword: "", confirmPassword: "" });
            } else {
                alert("❌ " + data.message);
            }
        } catch (error) {
            alert("Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-2">
                    <Settings className="h-8 w-8 text-indigo-600" />
                    Settings
                </h1>
                <p className="text-zinc-500 mt-1">
                    Manage your account settings
                </p>
            </div>

            <div className="max-w-lg">
                {/* Change Password Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Change Password
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* New Password */}
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password *</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={formData.newPassword}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            newPassword: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">
                                    Confirm Password *
                                </Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirm new password"
                                    value={formData.confirmPassword}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            confirmPassword: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>

                            {/* Password Match Indicator */}
                            {formData.confirmPassword && (
                                <Alert
                                    className={
                                        formData.newPassword === formData.confirmPassword
                                            ? "border-green-200 bg-green-50"
                                            : "border-red-200 bg-red-50"
                                    }
                                >
                                    {formData.newPassword === formData.confirmPassword ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <AlertDescription className="text-green-700">
                                                Passwords match
                                            </AlertDescription>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <AlertDescription className="text-red-700">
                                                Passwords do not match
                                            </AlertDescription>
                                        </>
                                    )}
                                </Alert>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full gap-2"
                                size="lg"
                                disabled={
                                    isLoading ||
                                    formData.newPassword !== formData.confirmPassword
                                }
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        Update Password
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
