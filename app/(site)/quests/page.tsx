import { redirect } from "next/navigation";
import { CalendarCheck, CheckCircle2, Coins, Dices, Gift, ShoppingBag, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import { auth } from "@/auth";
import { PageBand } from "@/components/PageBand";
import { QuestClaimButton } from "@/components/quests/QuestClaimButton";
import { QuestResetCountdown } from "@/components/quests/QuestResetCountdown";
import { getDailyQuestBoard, type QuestGoalType } from "@/lib/features/quests/dailyQuests";
import { getQuestGoalUnit } from "@/lib/features/quests/questGoalTypes";
import { buildPageMetadata } from "@/lib/seo";

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
    const unit = getQuestGoalUnit(goalType);
    return `${progress.toLocaleString("th-TH")} จาก ${goalValue.toLocaleString("th-TH")} ${unit}`;
}

export default async function QuestsPage() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");
    const board = await getDailyQuestBoard(userId);

    return (
        <div className="animate-page-enter flex min-h-[calc(100dvh-4rem)] flex-col">
            <PageBand tone="lead" className="pt-10 pb-4 lg:pt-12 lg:pb-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold leading-tight text-[var(--page-heading)] sm:text-4xl">ภารกิจรายวัน</h1>
                        <p className="mt-2 text-muted-foreground">
                            ทำภารกิจง่าย ๆ รับแต้มฟรีทุกวัน แต้มใช้แลกส่วนลดและของรางวัลในร้าน
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {board.totalCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                วันนี้รับแล้ว {board.claimedCount} จาก {board.totalCount} ภารกิจ
                            </span>
                        )}
                        <QuestResetCountdown resetAtIso={board.resetAtIso} />
                    </div>
                </div>
            </PageBand>

            <PageBand tone="plain" className="flex-1 pt-6 lg:pt-8">
                {board.totalCount === 0 ? (
                    <p className="rounded-2xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
                        ยังไม่มีภารกิจในตอนนี้ กลับมาดูใหม่เร็ว ๆ นี้
                    </p>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {board.quests.map((quest) => {
                            const Icon = QUEST_ICONS[quest.goalType] ?? Sparkles;
                            const isDone = quest.claimed || quest.claimable;

                            return (
                                <div
                                    key={quest.id}
                                    className={`flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors duration-300 ease-out ${quest.claimed ? "opacity-70" : "hover:border-primary/50"}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <h2 className="font-semibold text-foreground">{quest.title}</h2>
                                            {quest.description && (
                                                <p className="mt-1 text-sm text-muted-foreground">{quest.description}</p>
                                            )}
                                        </div>
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                            <Coins className="h-3.5 w-3.5" />
                                            +{quest.rewardPoints.toLocaleString("th-TH")} แต้ม
                                        </span>
                                    </div>

                                    <div className="mt-auto flex items-center gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-[width]"
                                                    style={{ width: `${quest.goalValue > 0 ? Math.min(100, Math.round((quest.progress / quest.goalValue) * 100)) : 0}%` }}
                                                />
                                            </div>
                                            <p className="mt-1.5 text-xs text-muted-foreground">
                                                {progressText(quest.goalType, quest.progress, quest.goalValue)}
                                            </p>
                                        </div>
                                        <QuestClaimButton
                                            questId={quest.id}
                                            claimed={quest.claimed}
                                            claimable={quest.claimable}
                                            ctaHref={quest.ctaHref}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PageBand>
        </div>
    );
}
