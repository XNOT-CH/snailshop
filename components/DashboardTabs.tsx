"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Wallet, Package, Users } from "lucide-react";

interface DashboardTabsProps {
    overviewContent: React.ReactNode;
    topupContent: React.ReactNode;
    purchasesContent: React.ReactNode;
    membersContent?: React.ReactNode;
}

export function DashboardTabs({
    overviewContent,
    topupContent,
    purchasesContent,
    membersContent,
}: DashboardTabsProps) {
    const hasMembersTab = !!membersContent;

    return (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList
                className={`w-full grid ${hasMembersTab ? "grid-cols-4" : "grid-cols-3"} h-11 mb-6 bg-muted/80 backdrop-blur-sm rounded-xl p-1`}
            >
                <TabsTrigger
                    value="overview"
                    className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">ภาพรวม</span>
                    <span className="sm:hidden">รวม</span>
                </TabsTrigger>
                {hasMembersTab && (
                    <TabsTrigger
                        value="members"
                        className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                    >
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">ข้อมูลสมาชิก</span>
                        <span className="sm:hidden">สมาชิก</span>
                    </TabsTrigger>
                )}
                <TabsTrigger
                    value="topup"
                    className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">สรุปเติมเงิน</span>
                    <span className="sm:hidden">เติมเงิน</span>
                </TabsTrigger>
                <TabsTrigger
                    value="purchases"
                    className="gap-1.5 rounded-lg text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">สินค้าล่าสุด</span>
                    <span className="sm:hidden">สินค้า</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="animate-page-enter">
                {overviewContent}
            </TabsContent>
            {hasMembersTab && (
                <TabsContent value="members" className="animate-page-enter">
                    {membersContent}
                </TabsContent>
            )}
            <TabsContent value="topup" className="animate-page-enter">
                {topupContent}
            </TabsContent>
            <TabsContent value="purchases" className="animate-page-enter">
                {purchasesContent}
            </TabsContent>
        </Tabs>
    );
}
