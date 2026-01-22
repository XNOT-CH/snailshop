// =====================================
// User Types
// =====================================
export interface User {
    id: string;
    username: string;
    email: string | null;
    creditBalance: number;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserSession {
    id: string;
    username: string;
    creditBalance: number;
}

// =====================================
// Product Types
// =====================================
export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: string;
    secretData: string;
    isSold: boolean;
    orderId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductCardProps {
    id: string;
    image: string;
    title: string;
    price: number;
    category: string;
    isSold: boolean;
}

export interface ProductFormData {
    title: string;
    price: string;
    image: string;
    category: string;
    description: string;
    secretData: string;
}

// =====================================
// Order Types
// =====================================
export interface Order {
    id: string;
    userId: string;
    totalPrice: number;
    status: OrderStatus;
    purchasedAt: Date;
    product?: Product;
}

export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";

// =====================================
// Topup Types
// =====================================
export interface Topup {
    id: string;
    userId: string;
    amount: number;
    proofImage: string | null;
    status: TopupStatus;
    createdAt: Date;
    user?: User;
}

export type TopupStatus = "PENDING" | "APPROVED" | "REJECTED";

// =====================================
// API Response Types
// =====================================
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

export interface PurchaseResponse {
    success: boolean;
    message: string;
    orderId?: string;
    productName?: string;
}

export interface LoginResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        username: string;
        creditBalance: number;
    };
}

export interface RegisterResponse {
    success: boolean;
    message: string;
    userId?: string;
}

export interface TopupResponse {
    success: boolean;
    message: string;
    topupId?: string;
}

// =====================================
// UI Component Types
// =====================================
export type AlertVariant = "success" | "error" | "warning" | "info";

export interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description: string;
    variant?: AlertVariant;
    buttonText?: string;
}

export interface AlertState {
    isOpen: boolean;
    description: string;
    variant: AlertVariant;
}

export interface PurchasedItemProps {
    title: string;
    image: string;
    date: string;
    secretData: string;
}

export interface BuyButtonProps {
    productId: string;
    price: number;
    disabled?: boolean;
}

// =====================================
// Navigation Types
// =====================================
export interface NavLink {
    href: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
}

export interface SidebarLink extends NavLink {
    badge?: string | number;
}

// =====================================
// Dashboard Types
// =====================================
export interface DashboardSidebarProps {
    user: {
        username: string;
        email: string | null;
        creditBalance?: number | bigint;
    } | null;
}

export interface StatsCard {
    title: string;
    value: string | number;
    description?: string;
    icon?: React.ComponentType<{ className?: string }>;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
}

// =====================================
// Admin Types
// =====================================
export interface AdminProductTableProps {
    products: Product[];
}

export interface SlipApprovalRequest {
    id: string;
    action: "APPROVE" | "REJECT";
}

// =====================================
// Site Settings Types
// =====================================
export interface SiteSettings {
    id: string;
    heroTitle: string;
    heroDescription: string;
    announcement: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// =====================================
// Form Types
// =====================================
export interface LoginFormData {
    username: string;
    password: string;
}

export interface RegisterFormData {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface TopupFormData {
    amount: number;
    proofImage: string;
}
