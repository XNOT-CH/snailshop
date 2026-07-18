import { CalendarCheck, CheckCircle2, Coins, Dices, Gift, ShoppingBag, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { QuestClaimButton } from "@/components/quests/QuestClaimButton";
import { QuestResetCountdown } from "@/components/quests/QuestResetCountdown";
import { getDailyQuestBoard, type QuestGoalType } from "@/lib/features/quests/dailyQuests";
import { buildPageMetadata } from "@/lib/seo";
import { themeClasses } from "@/lib/theme";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
    title: "ภารกิจรายวัน",
    description: "ทำภารกิจง่าย ๆ ทุกวัน รับแต้มไปแลกของรางวัลในร้าน",
    path: "/quests",
});

const QUEST_ICONS: Record<QuestGoalType, LucideIcon> = {
    CHECK_IN: CalendarCheck,
    PURCHASE_COUNT: ShoppingBag,
    TOPUP_AMOUNT: Wallet,
    GACHA_SPINS: Dices,
    SEASON_PASS_CLAIM: Gift,
};

function progressText(goalType: QuestGoalType, progress: number, goalValue: number) {
    if (goalValue <= 1) {
        return progress >= goalValue ? "สำเร็จแล้ว" : "ยังไม่สำเร็จ";
    }
    const unit = goalType === "TOPUP_AMOUNT" ? "บาท" : "ครั้ง";
    return `${progress.toLocaleString("th-TH")} จาก ${goalValue.toLocaleString("th-TH")} ${unit}`;
}

export default async function QuestsPage() {
    const session = await auth();
    const userId = session?.user?.id ?? null;
    const board = await getDailyQuestBoard(userId);

    return (
        <div className="animate-page-enter">
            <div className="relative left-1/2 w-screen -translate-x-1/2 border-y border-border/50 bg-card/95 px-3 pb-8 pt-4 shadow-xl shadow-primary/10 sm:left-auto sm:w-auto sm:translate-x-0 sm:border sm:px-5 sm:py-7 lg:px-6">
                <PageBreadcrumb items={[{ label: "ภารกิจรายวัน" }]} className="mb-4" />

                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-8 w-8 text-primary" />
                            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">ภารกิจรายวัน</h1>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                            ทำภารกิจง่าย ๆ รับแต้มฟรีทุกวัน แต้มใช้แลกส่วนลดและของรางวัลในร้าน
                        </p>
                    </div>
                    <QuestResetCountdown resetAtIso={board.resetAtIso} />
                </div>

                {board.totalCount > 0 && (
                    <div className={`${themeClasses.surfaceSoft} mb-6 flex items-center gap-3 rounded-2xl px-4 py-3`}>
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                        <p className="text-sm font-medium text-foreground">
                            วันนี้รับรางวัลแล้ว {board.claimedCount} จาก {board.totalCount} ภารกิจ
                        </p>
                    </div>
                )}

                {board.totalCount === 0 ? (
                    <div className={`${themeClasses.surfaceSoft} rounded-2xl py-12 text-center`}>
                        <p className="text-lg text-muted-foreground">ยังไม่มีภารกิจในตอนนี้ กลับมาดูใหม่เร็ว ๆ นี้</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {board.quests.map((quest) => {
                            const Icon = QUEST_ICONS[quest.goalType] ?? Sparkles;
                            const isDone = quest.claimed || quest.claimable;

                            return (
                                <div
                                    key={quest.id}
                                    className={`${themeClasses.surface} flex flex-col gap-3 rounded-2xl p-4 transition-colors sm:flex-row sm:items-center sm:gap-4 ${quest.claimed ? "opacity-70" : ""}`}
                                >
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isDone ? "bg-primary/15 text-primary" : "bg-accent/60 text-muted-foreground"}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold text-foreground sm:text-base">{quest.title}</h2>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                                <Coins className="h-3 w-3" />
                                                +{quest.rewardPoints.toLocaleString("th-TH")} แต้ม
                                            </span>
                                        </div>
                                        {quest.description && (
                                            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{quest.description}</p>
                                        )}
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-accent/70">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-[width]"
                                                    style={{ width: `${quest.goalValue > 0 ? Math.round((quest.progress / quest.goalValue) * 100) : 0}%` }}
                                                />
                                            </div>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {progressText(quest.goalType, quest.progress, quest.goalValue)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 sm:self-center">
                                        <QuestClaimButton
                                            questId={quest.id}
                                            claimed={quest.claimed}
                                            claimable={quest.claimable}
                                            ctaHref={quest.ctaHref}
                                            isLoggedIn={Boolean(userId)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {!userId && (
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        เข้าสู่ระบบเพื่อเก็บความคืบหน้าและรับแต้มจากภารกิจ
                    </p>
                )}
            </div>
        </div>
    );
}
