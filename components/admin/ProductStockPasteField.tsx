"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parseStockPaste, type ParsedStockLine } from "@/lib/stock";

interface ProductStockPasteFieldProps {
    /** Usernames already in this product's stock. */
    existingUsers: string[];
    /** Usernames held by other products, mapped to that product's name. */
    takenUsers: Record<string, string>;
    onAdd: (entries: ParsedStockLine[]) => void;
    disabled?: boolean;
}

const PLACEHOLDER = `วางได้ทีละหลายบรรทัด บรรทัดละ 1 ไอดี เช่น
player001 / mypassword
player002:mypassword
player003,mypassword`;

const MAX_PROBLEMS_SHOWN = 5;

/**
 * Adding stock one account at a time was the whole reason a batch of fifty keys
 * took fifty rounds of typing. Everything here is a preview until the button is
 * pressed: rows that collide are listed with a reason instead of being added.
 */
export function ProductStockPasteField({
    existingUsers,
    takenUsers,
    onAdd,
    disabled = false,
}: ProductStockPasteFieldProps) {
    const [text, setText] = useState("");

    const review = useMemo(() => {
        const { items, problems } = parseStockPaste(text);
        const existing = new Set(existingUsers);

        const ready: ParsedStockLine[] = [];
        const blocked: { line: number; user: string; reason: string }[] = [];

        for (const item of items) {
            if (existing.has(item.user)) {
                blocked.push({ line: item.line, user: item.user, reason: "มีในสต๊อกของสินค้านี้แล้ว" });
                continue;
            }
            if (takenUsers[item.user]) {
                blocked.push({ line: item.line, user: item.user, reason: `อยู่ในสินค้า "${takenUsers[item.user]}"` });
                continue;
            }
            ready.push(item);
        }

        for (const problem of problems) {
            blocked.push({
                line: problem.line,
                user: problem.user ?? problem.raw,
                reason: problem.reason === "duplicate" ? "ซ้ำกับบรรทัดก่อนหน้า" : "ไม่พบรหัสผ่านในบรรทัดนี้",
            });
        }

        blocked.sort((a, b) => a.line - b.line);

        return { ready, blocked };
    }, [text, existingUsers, takenUsers]);

    const handleAdd = () => {
        if (review.ready.length === 0) return;

        onAdd(review.ready);
        setText("");
    };

    return (
        <div className="space-y-3">
            <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={PLACEHOLDER}
                rows={7}
                disabled={disabled}
                className="font-mono text-xs"
                aria-label="วางรายการสต๊อกหลายรายการ"
            />

            {text.trim().length > 0 ? (
                <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <ClipboardList className="h-3.5 w-3.5" />
                        อ่านได้ {review.ready.length} รายการ
                        {review.blocked.length > 0 ? ` · ข้าม ${review.blocked.length} บรรทัด` : ""}
                    </p>

                    {review.blocked.length > 0 ? (
                        <ul className="space-y-1">
                            {review.blocked.slice(0, MAX_PROBLEMS_SHOWN).map((problem) => (
                                <li key={`${problem.line}-${problem.user}`} className="text-xs text-muted-foreground">
                                    <span className="font-mono">บรรทัด {problem.line}</span> · {problem.user} — {problem.reason}
                                </li>
                            ))}
                            {review.blocked.length > MAX_PROBLEMS_SHOWN ? (
                                <li className="text-xs text-muted-foreground">
                                    และอีก {review.blocked.length - MAX_PROBLEMS_SHOWN} บรรทัด
                                </li>
                            ) : null}
                        </ul>
                    ) : null}
                </div>
            ) : null}

            <Button
                type="button"
                onClick={handleAdd}
                disabled={disabled || review.ready.length === 0}
                className="w-full gap-2 rounded-xl"
            >
                <Plus className="h-4 w-4" />
                {review.ready.length > 0 ? `เพิ่ม ${review.ready.length} รายการ` : "เพิ่มสต๊อก"}
            </Button>
        </div>
    );
}
