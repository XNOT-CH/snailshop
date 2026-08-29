import type { QuestGoalType } from "@/lib/features/quests/dailyQuests";

/**
 * One description per goal type, shared by the storefront board and the admin
 * editor so a unit or wording change lands in both places at once.
 *
 * `progressSource` is what the admin editor shows to explain where progress
 * comes from — nothing here is configurable, it is derived from activity tables
 * (see getProgressByGoalType in dailyQuests.ts).
 */
export type QuestGoalTypeMeta = {
    value: QuestGoalType;
    label: string;
    unit: string;
    progressSource: string;
    /** CHECK_IN is satisfied by the claim itself, so its goal is always 1. */
    fixedGoalValue?: number;
};

export const QUEST_GOAL_TYPE_META: Record<QuestGoalType, QuestGoalTypeMeta> = {
    CHECK_IN: {
        value: "CHECK_IN",
        label: "เช็คอินรายวัน",
        unit: "ครั้ง",
        progressSource: "กดรับได้เลย ไม่มีเงื่อนไข",
        fixedGoalValue: 1,
    },
    PURCHASE_COUNT: {
        value: "PURCHASE_COUNT",
        label: "ซื้อสินค้า",
        unit: "ครั้ง",
        progressSource: "นับออเดอร์สถานะ COMPLETED ของวันนี้",
    },
    TOPUP_AMOUNT: {
        value: "TOPUP_AMOUNT",
        label: "เติมเงิน",
        unit: "บาท",
        progressSource: "รวมยอดเติมเงินที่อนุมัติแล้วของวันนี้",
    },
    GACHA_SPINS: {
        value: "GACHA_SPINS",
        label: "สุ่มกาชา",
        unit: "ครั้ง",
        progressSource: "นับการสุ่มกาชาของวันนี้",
    },
    SEASON_PASS_CLAIM: {
        value: "SEASON_PASS_CLAIM",
        label: "รับรางวัล Season Pass",
        unit: "ครั้ง",
        progressSource: "นับการกดรับรางวัล Season Pass ของวันนี้",
    },
};

export const QUEST_GOAL_TYPE_OPTIONS = Object.values(QUEST_GOAL_TYPE_META);

export function getQuestGoalUnit(goalType: string) {
    return QUEST_GOAL_TYPE_META[goalType as QuestGoalType]?.unit ?? "ครั้ง";
}

export function getQuestGoalLabel(goalType: string) {
    return QUEST_GOAL_TYPE_META[goalType as QuestGoalType]?.label ?? goalType;
}
