"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { PublicRegistrationPolicy } from "@/lib/getRegistrationPolicies";

interface PolicyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    items: PublicRegistrationPolicy[];
}

// English is optional in the admin form, so fall back to the Thai text rather
// than rendering an empty heading.
function policyTitle(policy: PublicRegistrationPolicy) {
    return policy.titleEn ? `${policy.titleTh} · ${policy.titleEn}` : policy.titleTh;
}

/**
 * The signup page's terms and privacy clauses, read in a dialog instead of
 * inline. Inline they doubled the length of the form and every clause was one
 * more tab stop before the submit button; nobody opened them there anyway.
 */
export function PolicyDialog({ open, onOpenChange, title, items }: Readonly<PolicyDialogProps>) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] gap-3 overflow-hidden sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>กดที่แต่ละหัวข้อเพื่ออ่านรายละเอียด</DialogDescription>
                </DialogHeader>

                <div className="-mr-2 max-h-[65vh] overflow-y-auto pr-2">
                    {items.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลในหัวข้อนี้</p>
                    ) : (
                        <Accordion type="multiple" className="w-full">
                            {items.map((policy) => (
                                <AccordionItem key={policy.id} value={policy.id}>
                                    <AccordionTrigger className="py-3 text-left text-sm">
                                        {policyTitle(policy)}
                                    </AccordionTrigger>
                                    <AccordionContent className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                        {policy.contentTh}
                                        {policy.contentEn ? `\n\n${policy.contentEn}` : ""}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
