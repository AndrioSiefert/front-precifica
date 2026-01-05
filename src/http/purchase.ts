import { api } from './client';

export type PurchaseBatch = {
    id: string;
    purchasedOn: string; // YYYY-MM-DD
    title: string | null;
    notes: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type PurchaseCapture = {
    id: string;
    batchId: string;
    photoKey: string;
    photoMime: string;
    photoUrl: string | null;
    status: 'draft' | 'finalized';
    itemId: string | null;
    createdAt?: string;
    updatedAt?: string;
};

export type PurchaseReportRow = {
    itemId: string;
    name: string;
    quantity: number;
    costUnit: number;
    costTotal: number;
    saleUnitEffective: number | null;
    saleTotal: number | null;
    profitUnit: number | null;
    profitTotal: number | null;
    pricingMode: 'sale' | 'markup' | 'global' | 'unset' | string;
    markupEffectivePercent: number | null;
    photoUrl: string | null;
};

export type PurchaseReport = {
    batch: {
        id: string;
        purchasedOn: string;
        title: string | null;
        notes: string | null;
    };
    summary: {
        itemsCount: number;
        pricedItemsCount: number;
        unpricedItemsCount: number;
        totalQuantity: number;
        totalCost: number;
        totalRevenue: number;
        totalProfit: number;
        defaultMarkupPercent: number | null;
    };
    rows: PurchaseReportRow[];
};

export async function listPurchaseBatches(): Promise<PurchaseBatch[]> {
    const { data } = await api.get<PurchaseBatch[]>('/purchase-batches');
    return Array.isArray(data) ? data : [];
}

export async function createPurchaseBatch(dto: {
    purchasedOn: string;
    title?: string | null;
    notes?: string | null;
}): Promise<PurchaseBatch> {
    const { data } = await api.post<PurchaseBatch>('/purchase-batches', dto);
    return data;
}

export async function updatePurchaseBatch(
    id: string,
    dto: { purchasedOn?: string; title?: string | null; notes?: string | null },
): Promise<PurchaseBatch> {
    const { data } = await api.patch<PurchaseBatch>(`/purchase-batches/${id}`, dto);
    return data;
}

export async function getPurchaseBatch(id: string): Promise<PurchaseBatch> {
    // backend pode ou não ter GET /purchase-batches/:id
    try {
        const { data } = await api.get<PurchaseBatch>(`/purchase-batches/${id}`);
        return data;
    } catch {
        const all = await listPurchaseBatches();
        const found = all.find((b) => b.id === id);
        if (!found) throw new Error('Batch not found');
        return found;
    }
}

export async function listPurchaseCaptures(batchId: string): Promise<PurchaseCapture[]> {
    const { data } = await api.get<PurchaseCapture[]>(`/purchase-batches/${batchId}/captures`);
    return Array.isArray(data) ? data : [];
}

export async function uploadPurchaseCapture(batchId: string, file: File): Promise<PurchaseCapture> {
    const form = new FormData();
    form.append('photo', file);

    const { data } = await api.post<PurchaseCapture>(`/purchase-batches/${batchId}/captures`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
}

export async function finalizePurchaseCapture(
    captureId: string,
    dto: {
        name: string;
        costUnit: number;
        quantity: number;
        markupOverridePercent?: number;
        saleUnitManual?: number;
        updatedField?: 'markup' | 'sale';
    },
): Promise<any> {
    const { data } = await api.post(`/purchase-captures/${captureId}/finalize`, dto);
    return data;
}

export async function getPurchaseReport(batchId: string): Promise<PurchaseReport> {
    const { data } = await api.get<PurchaseReport>(`/purchase-batches/${batchId}/report`);
    return data;
}

export function purchaseReportPdfUrl(batchId: string) {
    const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    const base = String(raw).replace(/\/$/, '');
    return `${base}/purchase-batches/${batchId}/report.pdf`;
}

export function resolveApiUrl(maybeUrl: string | null) {
    if (!maybeUrl) return null;
    const s = String(maybeUrl);
    if (/^https?:\/\//i.test(s)) return s;
    const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    const base = String(raw).replace(/\/$/, '');
    return `${base}${s.startsWith('/') ? '' : '/'}${s}`;
}
