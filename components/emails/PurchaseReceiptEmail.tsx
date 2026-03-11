import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Section,
    Row,
    Column,
    Hr,
} from "@react-email/components";
import * as React from "react";

interface PurchaseReceiptEmailProps {
    userName: string;
    orderCount: number;
    totalTHB: number;
    totalPoints: number;
    items: Array<{
        productName: string;
        price: number;
        currency: string;
    }>;
}

export const PurchaseReceiptEmail = ({
    userName = "ลูกค้าผู้มีอุปการคุณ",
    orderCount = 0,
    totalTHB = 0,
    totalPoints = 0,
    items = [],
}: PurchaseReceiptEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>ขอบคุณสำหรับการสั่งซื้อจาก SnailShop 🎉</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>ใบเสร็จรับเงิน / SnailShop</Heading>
                    <Text style={text}>สวัสดีคุณ {userName},</Text>
                    <Text style={text}>
                        ขอบคุณสำหรับการสั่งซื้อสินค้าจำนวน {orderCount} รายการ สำเร็จเรียบร้อยแล้ว
                    </Text>

                    <Section style={receiptSection}>
                        <Text style={receiptHeading}>สรุปรายการสั่งซื้อ:</Text>
                        {items.map((item, index) => (
                            <Row key={index} style={itemRow}>
                                <Column style={itemLeft}>
                                    <Text style={itemText}>{item.productName}</Text>
                                </Column>
                                <Column style={itemRight}>
                                    <Text style={itemText}>
                                        {item.price.toLocaleString()} {item.currency === "THB" ? "บาท" : "Points"}
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
                                {totalTHB > 0 && <Text style={totalTextBold}>฿{totalTHB.toLocaleString()}</Text>}
                                {totalPoints > 0 && <Text style={totalTextBold}>💎{totalPoints.toLocaleString()} Points</Text>}
                            </Column>
                        </Row>
                    </Section>

                    <Text style={footerText}>
                        หากคุณมีข้อสงสัยเกี่ยวกับการสั่งซื้อ โปรดติดต่อทีมสนับสนุนของเรา
                    </Text>
                </Container>
            </Body>
        </Html>
    );
};

export default PurchaseReceiptEmail;

const main = {
    backgroundColor: "#f6f9fc",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px 0 48px",
    marginBottom: "64px",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const h1 = {
    color: "#333",
    fontSize: "24px",
    fontWeight: "bold",
    padding: "0 48px",
    margin: "30px 0 15px",
};

const text = {
    color: "#525f7f",
    fontSize: "16px",
    lineHeight: "26px",
    padding: "0 48px",
    margin: "10px 0",
};

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
