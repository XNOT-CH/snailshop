"use client";

export interface TopupRecord {
    id: string;
    username: string;
    amount: number;
    time: string;
    status: string;
    senderBank: string | null;
    proofImage: string | null;
    transactionRef: string | null;
    rejectReason: string | null;
}

export interface StatusSummary {
    approved: { count: number; amount: number };
    pending: { count: number; amount: number };
    rejected: { count: number; amount: number };
}

export interface HourlyDataPoint {
    hour: string;
    amount: number;
}

export interface PaymentMethod {
    name: string;
    count: number;
    amount: number;
    color: string;
}

export interface TopupSummary {
    date: string;
    totalAmount: number;
    totalPeople: number;
    totalTransactions: number;
    allTransactions: number;
    averagePerTransaction: number;
    statusSummary: StatusSummary;
    hourlyData: HourlyDataPoint[];
    paymentMethods: PaymentMethod[];
    records: TopupRecord[];
    recordsPagination: {
        page: number;
        pageSize: number;
        totalRecords: number;
        totalPages: number;
    };
}

export interface WeeklyDataPoint {
    date: string;
    rawDate: string;
    dayOfWeek: number;
    amount: number;
    transactions: number;
}

export type SortDir = "asc" | "desc" | null;

export interface DailyTopupSummaryProps {
    selectedDate?: string;
    startDate?: string;
    endDate?: string;
}
