"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ShopControlsProps {
    currentPage: number;
    totalPages: number;
    currentSort: string;
}

export function ShopControls({ currentPage, totalPages, currentSort }: ShopControlsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const createQueryString = (name: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(name, value);
        return params.toString();
    };

    const handleSortChange = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("sort", val);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const handlePageChange = (newPage: number) => {
        router.push(`${pathname}?${createQueryString("page", newPage.toString())}`, { scroll: false });
    };

    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Button
                    variant={currentSort === 'popular' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 rounded-md font-normal border ${currentSort === 'popular' ? 'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border-[#bfdbfe]' : 'bg-card hover:bg-accent text-foreground border-border'}`}
                    onClick={() => handleSortChange('popular')}
                >
                    ยอดนิยม
                </Button>
                <Button
                    variant={currentSort === 'latest' || currentSort === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 rounded-md font-normal border ${currentSort === 'latest' || currentSort === 'all' ? 'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border-[#bfdbfe]' : 'bg-card hover:bg-accent text-foreground border-border'}`}
                    onClick={() => handleSortChange('latest')}
                >
                    ล่าสุด
                </Button>
                <Button
                    variant={currentSort === 'best_selling' ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 rounded-md font-normal border ${currentSort === 'best_selling' ? 'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border-[#bfdbfe]' : 'bg-card hover:bg-accent text-foreground border-border'}`}
                    onClick={() => handleSortChange('best_selling')}
                >
                    สินค้าขายดี
                </Button>

                <Select value={currentSort.startsWith('price') ? currentSort : ''} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[180px] h-9 rounded-sm font-normal text-xs sm:text-sm bg-card border-border hover:bg-accent transition-colors">
                        <SelectValue placeholder="ราคา: จากมากไปน้อย" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="price_asc">ราคา: จากน้อยไปมาก</SelectItem>
                        <SelectItem value="price_desc">ราคา: จากมากไปน้อย</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground min-w-[36px] text-center">
                        <span className="text-primary">{currentPage}</span><span className="opacity-50">/{totalPages}</span>
                    </span>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-border bg-card hover:bg-accent hover:text-primary transition-colors"
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-border bg-card hover:bg-accent hover:text-primary transition-colors"
                            disabled={currentPage >= totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground hover:text-foreground hidden sm:flex"
                    onClick={() => router.push('/shop', { scroll: false })}
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    ย้อนกลับ
                </Button>
            </div>
        </div>
    );
}
