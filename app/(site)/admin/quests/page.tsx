import { ListChecks } from "lucide-react";

// Placeholder so the sidebar entry has somewhere to land. The quest management
// screen isn't built yet — /quests on the storefront is still driven entirely by
// the seeded DailyQuest rows.
export default function AdminQuestsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#145de7]">
                    <ListChecks className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">ภารกิจรายวัน</h1>
                    <p className="text-sm text-muted-foreground">
                        หน้านี้ยังไม่เปิดใช้งาน ตอนนี้ภารกิจยังตั้งค่าจากฐานข้อมูลโดยตรง
                    </p>
                </div>
            </div>
        </div>
    );
}
