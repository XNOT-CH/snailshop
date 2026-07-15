"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, Dices, Wallet, Users } from "lucide-react";

interface DashboardTabsProps {
    overviewContent: React.ReactNode;
    topupContent: React.ReactNode;
    membersContent?: React.ReactNode;
    gachaContent?: React.ReactNode;
}

export function DashboardTabs({
    overviewContent,
    topupContent,
    membersContent,
    gachaContent,
}: Readonly<DashboardTabsProps>) {
    const hasMembersTab = Boolean(membersContent);
    const hasGachaTab = Boolean(gachaContent);
    const tabCount = 2 + (hasMembersTab ? 1 : 0) + (hasGachaTab ? 1 : 0);
    const tabGridClass = { 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[
        tabCount
    ] as string;

    return (
        <Tabs defaultValue="overview" className="w-full">
            <div className="mb-6">
                <TabsList
                    className={`grid h-auto w-full rounded-xl bg-muted/80 p-1 backdrop-blur-sm ${tabGridClass}`}
                >
                <TabsTrigger
                    value="overview"
                    className="min-h-10 gap-1.5 rounded-lg px-2 py-2 text-xs whitespace-normal sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">ภาพรวม</span>
                    <span className="sm:hidden">รวม</span>
                </TabsTrigger>
                {hasMembersTab && (
                    <TabsTrigger
                        value="members"
                        className="min-h-10 gap-1.5 rounded-lg px-2 py-2 text-xs whitespace-normal sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                    >
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">ข้อมูลสมาชิก</span>
                        <span className="sm:hidden">สมาชิก</span>
                    </TabsTrigger>
                )}
                <TabsTrigger
                    value="topup"
                    className="min-h-10 gap-1.5 rounded-lg px-2 py-2 text-xs whitespace-normal sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                >
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">สรุปเติมเงิน</span>
                    <span className="sm:hidden">เติมเงิน</span>
                </TabsTrigger>
                {hasGachaTab && (
                    <TabsTrigger
                        value="gacha"
                        className="min-h-10 gap-1.5 rounded-lg px-2 py-2 text-xs whitespace-normal sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-200"
                    >
                        <Dices className="h-4 w-4" />
                        <span>กาชา</span>
                    </TabsTrigger>
                )}
                </TabsList>
            </div>

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
            {hasGachaTab && (
                <TabsContent value="gacha" className="animate-page-enter">
                    {gachaContent}
                </TabsContent>
            )}
        </Tabs>
    );
}
