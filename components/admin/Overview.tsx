"use client";

import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";

const data = [
    { name: "Jan", total: 1500 },
    { name: "Feb", total: 2300 },
    { name: "Mar", total: 3200 },
    { name: "Apr", total: 2800 },
    { name: "May", total: 4100 },
    { name: "Jun", total: 3500 },
    { name: "Jul", total: 4800 },
    { name: "Aug", total: 5200 },
    { name: "Sep", total: 4600 },
    { name: "Oct", total: 5800 },
    { name: "Nov", total: 6200 },
    { name: "Dec", total: 7500 },
];

export function Overview() {
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `฿${value}`}
                />
                <Tooltip
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, "Revenue"]}
                    labelStyle={{ color: "#333" }}
                    contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                    }}
                />
                <Bar
                    dataKey="total"
                    fill="#18181b"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
