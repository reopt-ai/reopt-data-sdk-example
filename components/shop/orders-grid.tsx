"use client";

import { DataGrid, type DataGridColumn } from "@reopt-ai/opt-datagrid";

import { formatWon } from "@/lib/shop/catalog";

export interface OrderRow {
  id: string;
  createdAt: string;
  email: string;
  total: number;
  items: number;
  source: string;
  deviceId: string;
  profileId: string;
}

const columns: DataGridColumn<OrderRow>[] = [
  { id: "id", title: "Order", width: 150, getValue: (row) => row.id },
  {
    id: "createdAt",
    title: "Created",
    width: 190,
    getValue: (row) => row.createdAt,
  },
  { id: "email", title: "Email", width: 200, getValue: (row) => row.email },
  {
    id: "items",
    title: "Items",
    width: 70,
    getValue: (row) => String(row.items),
  },
  {
    id: "total",
    title: "Total",
    width: 120,
    getValue: (row) => formatWon(row.total),
  },
  {
    id: "source",
    title: "Source",
    width: 140,
    getValue: (row) => row.source,
  },
  {
    id: "deviceId",
    title: "device",
    width: 300,
    getValue: (row) => row.deviceId,
  },
  {
    id: "profileId",
    title: "profile",
    width: 200,
    getValue: (row) => row.profileId,
  },
];

export function OrdersGrid({ rows }: { rows: OrderRow[] }) {
  return (
    <div data-testid="orders-grid">
      <DataGrid
        rows={rows}
        columns={columns}
        height={320}
        getRowId={(row) => row.id}
      />
    </div>
  );
}
