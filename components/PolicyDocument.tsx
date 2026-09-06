import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import type { PublicRegistrationPolicy } from "@/lib/getRegistrationPolicies";
import { ScrollText, ShieldCheck } from "lucide-react";

interface PolicyDocumentProps {
    variant: "terms" | "privacy";
    items: PublicRegistrationPolicy[];
}

const VARIANTS = {
    terms: { title: "ข้อกำหนดการใช้งาน", icon: ScrollText },
    privacy: { title: "นโยบายความเป็นส่วนตัว", icon: ShieldCheck },
} as const;

// Renders the same clauses the signup page shows, as a standalone readable page.
// English is optional per clause, so it is only printed when the admin wrote it.
export function PolicyDocument({ variant, items }: Readonly<PolicyDocumentProps>) {
    const { title, icon: Icon } = VARIANTS[variant];

    return (
        <div className="animate-page-enter mx-auto max-w-4xl">
            <div className="relative left-1/2 w-screen -translate-x-1/2 border-y border-border/50 bg-card/90 px-4 py-6 shadow-xl shadow-primary/10 backdrop-blur-sm sm:left-auto sm:w-auto sm:translate-x-0 sm:border sm:bg-card/90 sm:px-6 sm:py-8">
                <PageBreadcrumb items={[{ label: title }]} className="mb-6" />

                <div className="mb-8 text-center">
                    <div className="mb-4 flex items-center justify-center gap-3">
                        <Icon className="h-10 w-10 text-primary" />
                        <h1 className="text-3xl font-bold">{title}</h1>
                    </div>
                </div>

                {items.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                        ยังไม่มีข้อมูลในหน้านี้
                    </p>
                ) : (
                    <ol className="space-y-6">
                        {items.map((item, index) => (
                            <li key={item.id} className="space-y-2">
                                <h2 className="text-base font-semibold text-foreground">
                                    <span className="mr-2 tabular-nums text-primary">{index + 1}.</span>
                                    {item.titleTh}
                                    {item.titleEn ? (
                                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                                            {item.titleEn}
                                        </span>
                                    ) : null}
                                </h2>
                                <p className="whitespace-pre-line text-sm text-muted-foreground">
                                    {item.contentTh}
                                </p>
                                {item.contentEn ? (
                                    <p className="whitespace-pre-line text-sm text-muted-foreground/80">
                                        {item.contentEn}
                                    </p>
                                ) : null}
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </div>
    );
}
