"use client";

import { useEffect, useMemo, useState } from "react";

import { ALL_DAYS } from "@/components/daily-topup-summary/constants";
import type {
    DailyTopupSummaryProps,
    SortDir,
    TopupSummary,
    WeeklyDataPoint,
} from "@/components/daily-topup-summary/types";

const PAGE_SIZE = 10;

export function useDailyTopupSummaryData({
    selectedDate,
    startDate,
    endDate,
}: Readonly<DailyTopupSummaryProps>) {
    const [data, setData] = useState<TopupSummary | null>(null);
    const [weeklyData, setWeeklyData] = useState<WeeklyDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set(ALL_DAYS));
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [sortKey, setSortKey] = useState<string>("time");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [currentPage, setCurrentPage] = useState(1);

    const allDaysSelected = selectedDays.size === ALL_DAYS.length;
    const selectedDaysKey = useMemo(
        () => Array.from(selectedDays).sort((a, b) => a - b).join(","),
        [selectedDays]
    );
    const filteredWeeklyData = useMemo(
        () => weeklyData.filter((day) => selectedDays.has(day.dayOfWeek)),
        [selectedDays, weeklyData]
    );

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const trendParams = new URLSearchParams();
                if (startDate && endDate) {
                    trendParams.set("startDate", startDate);
                    trendParams.set("endDate", endDate);
                } else if (selectedDate) {
                    trendParams.set("date", selectedDate);
                }

                const summaryParams = new URLSearchParams(trendParams);
                summaryParams.set("page", String(currentPage));
                summaryParams.set("pageSize", String(PAGE_SIZE));
                summaryParams.set("status", statusFilter);
                summaryParams.set("sortKey", sortKey || "time");
                summaryParams.set("sortDir", sortDir || "desc");
                if (searchTerm.trim()) {
                    summaryParams.set("search", searchTerm.trim());
                }
                if (!allDaysSelected) {
                    summaryParams.set("days", selectedDaysKey);
                }

                const [summaryRes, trendRes] = await Promise.all([
                    fetch(`/api/dashboard/topup-summary?${summaryParams.toString()}`),
                    fetch(`/api/dashboard/topup-trend?${trendParams.toString()}`),
                ]);
                const summaryJson = await summaryRes.json();
                const trendJson = await trendRes.json();

                if (summaryJson.success) {
                    setData(summaryJson.data);
                    setCurrentPage(summaryJson.data.recordsPagination.page);
                }

                if (trendJson.success) {
                    setWeeklyData(trendJson.data);
                }
            } catch (error) {
                console.error("Failed to fetch topup summary:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [
        allDaysSelected,
        currentPage,
        endDate,
        searchTerm,
        selectedDate,
        selectedDaysKey,
        sortDir,
        sortKey,
        startDate,
        statusFilter,
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDays, statusFilter]);

    const toggleDay = (day: number) => {
        setSelectedDays((previous) => {
            const next = new Set(previous);
            if (next.has(day)) {
                next.delete(day);
            } else {
                next.add(day);
            }
            return next;
        });
    };

    const selectAllDays = () => setSelectedDays(new Set(ALL_DAYS));
    const clearAllDays = () => setSelectedDays(new Set());

    const totalPages = data?.recordsPagination.totalPages ?? 1;
    const totalRecords = data?.recordsPagination.totalRecords ?? 0;
    const paginatedRecords = data?.records ?? [];
    const methodsTotal = data?.paymentMethods?.reduce((sum, method) => sum + method.amount, 0) || 0;

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir((previous) => {
                if (previous === "asc") {
                    return "desc";
                }
                if (previous === "desc") {
                    return null;
                }
                return "asc";
            });
            if (sortDir === null) {
                setSortKey("");
            }
            return;
        }

        setSortKey(key);
        setSortDir("asc");
    };

    const getSortDir = (key: string): SortDir => (sortKey === key ? sortDir : null);

    return {
        allDaysSelected,
        clearAllDays,
        currentPage,
        data,
        filteredWeeklyData,
        getSortDir,
        handleSort,
        isLoading,
        methodsTotal,
        paginatedRecords,
        searchTerm,
        selectAllDays,
        selectedDays,
        setCurrentPage,
        setSearchTerm,
        setStatusFilter,
        statusFilter,
        toggleDay,
        totalPages,
        totalRecords,
        weeklyData,
        pageSize: PAGE_SIZE,
    };
}
