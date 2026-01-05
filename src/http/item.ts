import { api } from './client';

export type ItemPricing = {
    pricingMode: 'sale' | 'markup' | 'global' | 'unset';
    defaultMarkupPercent: number | null;
    saleUnitEffective: number | null;
    markupEffectivePercent: number | null;
    profitUnit: number | null;
};

export type Item = {
    id: string;
    name: string;

    costUnit?: number;
    quantity?: number;

    markupOverridePercent?: number | null;
    saleUnitManual?: number | null;

    purchasedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;

    photoKey?: string | null;
    photoMime?: string | null;
    photoUrl?: string | null;

    pricing?: ItemPricing; // ✅ NOVO
};

export type PricingSettings = {
    id: string;
    defaultMarkupPercent: number | null;
    updatedAt?: string;
};

export async function listItems(): Promise<Item[]> {
    const { data } = await api.get<Item[]>('/items');
    return data;
}

export async function getItem(id: string): Promise<Item> {
    try {
        const { data } = await api.get<Item>(`/items/${id}`);
        return data;
    } catch {
        const all = await listItems();
        const found = all.find((i) => i.id === id);
        if (!found) throw new Error('Item not found');
        return found;
    }
}

/**
 * Nest endpoint expects multipart with field name: "photo"
 */
export async function createItem(dto: Record<string, any>, photo?: File | null): Promise<Item> {
    const form = new FormData();

    Object.entries(dto ?? {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        const v =
            typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                ? String(value)
                : JSON.stringify(value);

        form.append(key, v);
    });

    if (photo) form.append('photo', photo);

    const { data } = await api.post<Item>('/items', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data;
}

export async function updateItem(id: string, dto: Record<string, any>): Promise<Item> {
    const { data } = await api.patch<Item>(`/items/${id}`, dto);
    return data;
}

export async function resetItemPricing(id: string): Promise<Item> {
    const { data } = await api.patch<Item>(`/items/${id}/pricing/reset`);
    return data;
}

export async function getPricingSettings(): Promise<PricingSettings> {
    const { data } = await api.get<PricingSettings>('/pricing-settings');
    return data;
}

export async function updatePricingSettings(defaultMarkupPercent: number): Promise<PricingSettings> {
    const { data } = await api.patch<PricingSettings>('/pricing-settings', { defaultMarkupPercent });
    return data;
}

export async function resetPricingSettings(): Promise<PricingSettings> {
    const { data } = await api.patch<PricingSettings>('/pricing-settings/reset');
    return data;
}
