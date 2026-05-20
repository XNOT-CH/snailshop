import {
    Heading,
    Text,
    Section,
    Row,
    Column,
    Hr,
} from "@react-email/components";
import { EmailLayout } from "@/components/emails/EmailLayout";
import {
    emailReceiptHeading,
    emailReceiptText,
} from "@/components/emails/emailStyles";
import { formatCurrencyAmount, type PublicCurrencySettings } from "@/lib/currencySettings";

interface PurchaseReceiptEmailProps {
    siteName?: string;
    userName: string;
    orderCount: number;
    totalTHB: number;
    totalPoints: number;
    currencySettings?: PublicCurrencySettings | null;
    items: Array<{
        productName: string;
        price: number;
        currency: string;
    }>;
}

export const PurchaseReceiptEmail = ({
    siteName = "SNAILSHOP",
    userName = "ลูกค้าผู้มีอุปการคุณ",
    orderCount = 0,
    totalTHB = 0,
    totalPoints = 0,
    currencySettings = null,
    items = [],
}: Readonly<PurchaseReceiptEmailProps>) => {
    return (
        <EmailLayout preview={`ขอบคุณสำหรับการสั่งซื้อจาก ${siteName} 🎉`}>
            <Heading style={emailReceiptHeading}>{`ใบเสร็จรับเงิน / ${siteName}`}</Heading>
            <Text style={emailReceiptText}>สวัสดีคุณ {userName},</Text>
            <Text style={emailReceiptText}>
                ขอบคุณสำหรับการสั่งซื้อสินค้าจำนวน {orderCount} รายการ สำเร็จเรียบร้อยแล้ว
            </Text>

            <Section style={receiptSection}>
                <Text style={receiptHeading}>สรุปรายการสั่งซื้อ:</Text>
                {items.map((item, index) => (
                    <Row key={`${item.productName}-${index}`} style={itemRow}>
                        <Column style={itemLeft}>
                            <Text style={itemText}>{item.productName}</Text>
                        </Column>
                        <Column style={itemRight}>
                            <Text style={itemText}>
                                {formatCurrencyAmount(item.price, item.currency, currencySettings)}
                            </Text>
                        </Column>
                    </Row>
                ))}
                <Hr style={hr} />
                <Row>
                    <Column style={totalLeft}>
                        <Text style={totalTextBold}>ยอดรวมทั้งหมด</Text>
                    </Column>
                    <Column style={totalRight}>
                        {totalTHB > 0 && <Text style={totalTextBold}>{formatCurrencyAmount(totalTHB, "THB", currencySettings)}</Text>}
                        {totalPoints > 0 && <Text style={totalTextBold}>{formatCurrencyAmount(totalPoints, "POINT", currencySettings)}</Text>}
                    </Column>
                </Row>
            </Section>

            <Text style={footerText}>
                หากคุณมีข้อสงสัยเกี่ยวกับการสั่งซื้อ โปรดติดต่อทีมสนับสนุนของเรา
            </Text>
        </EmailLayout>
    );
};

export default PurchaseReceiptEmail;

const receiptSection = {
    padding: "20px 48px",
    backgroundColor: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    margin: "20px 0",
};

const receiptHeading = {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "15px",
};

const itemRow = {
    marginBottom: "10px",
    width: "100%",
};

const itemLeft = { width: "70%" };
const itemRight = { width: "30%", textAlign: "right" as const };
const itemText = { margin: 0, color: "#475569", fontSize: "14px" };

const hr = {
    borderColor: "#e2e8f0",
    margin: "15px 0",
};

const totalLeft = { width: "60%" };
const totalRight = { width: "40%", textAlign: "right" as const };
const totalTextBold = { margin: 0, color: "#0f172a", fontSize: "16px", fontWeight: "bold" };

const footerText = {
    color: "#94a3b8",
    fontSize: "14px",
    lineHeight: "22px",
    padding: "0 48px",
    marginTop: "30px",
    textAlign: "center" as const,
};
