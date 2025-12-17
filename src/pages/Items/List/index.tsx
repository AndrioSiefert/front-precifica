import { useEffect, useMemo, useState } from 'react';
import {
    getPricingSettings,
    listItems,
    resetPricingSettings,
    updatePricingSettings,
    updateItem,
    resetItemPricing,
    type Item,
    type PricingSettings,
} from '../../../http/item';
import ItemCard from '../components/ItemCard';

type ModeFilter = 'all' | 'sale' | 'markup' | 'global' | 'unset';

function countByMode(items: Item[]) {
    const base = { sale: 0, markup: 0, global: 0, unset: 0 };
    for (const it of items) {
        const m = it.pricing?.pricingMode;
        if (m === 'sale') base.sale++;
        else if (m === 'markup') base.markup++;
        else if (m === 'global') base.global++;
        else if (m === 'unset') base.unset++;
    }
    return base;
}

export default function ItemsListPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [settings, setSettings] = useState<PricingSettings | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingGlobal, setSavingGlobal] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [q, setQ] = useState('');
    const [modeFilter, setModeFilter] = useState<ModeFilter>('all');

    const [globalMarkupInput, setGlobalMarkupInput] = useState<string>('');

    async function load(opts?: { silent?: boolean }) {
        const silent = opts?.silent ?? false;

        try {
            setError(null);
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const [s, data] = await Promise.all([getPricingSettings(), listItems()]);
            setSettings(s);
            setGlobalMarkupInput(s.defaultMarkupPercent === null ? '' : String(s.defaultMarkupPercent));
            setItems(Array.isArray(data) ? data : []);
        } catch {
            setError('Erro ao carregar itens/configurações');
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const stats = useMemo(() => countByMode(items), [items]);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        let base = items;

        if (modeFilter !== 'all') {
            base = base.filter((it) => (it.pricing?.pricingMode ?? 'unset') === modeFilter);
        }

        if (!qq) return base;

        return base.filter((it) => {
            const hay = `${it.name ?? ''} ${it.id ?? ''}`.toLowerCase();
            return hay.includes(qq);
        });
    }, [items, q, modeFilter]);

    async function handleSaveGlobal() {
        try {
            setError(null);
            setSavingGlobal(true);

            const s = globalMarkupInput.trim().replace(',', '.');

            if (!s) {
                const updated = await resetPricingSettings();
                setSettings(updated);
                await load({ silent: true });
                return;
            }

            const n = Number(s);
            if (!Number.isFinite(n) || n < 0) {
                setError('Margem global inválida.');
                return;
            }

            const updated = await updatePricingSettings(n);
            setSettings(updated);
            await load({ silent: true });
        } catch {
            setError('Erro ao salvar margem global');
        } finally {
            setSavingGlobal(false);
        }
    }

    async function handleClearGlobal() {
        try {
            setError(null);
            setSavingGlobal(true);

            const updated = await resetPricingSettings();
            setSettings(updated);
            setGlobalMarkupInput('');
            await load({ silent: true });
        } catch {
            setError('Erro ao limpar margem global');
        } finally {
            setSavingGlobal(false);
        }
    }

    async function handleUpdateItem(id: string, dto: Record<string, any>) {
        const updated = await updateItem(id, dto);
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    }

    async function handleResetItem(id: string) {
        const updated = await resetItemPricing(id);
        setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    }

    const globalStatusLabel =
        settings?.defaultMarkupPercent === null ? 'Não definida' : `${settings?.defaultMarkupPercent}%`;

    return (
        <div className='space-y-5'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                    <h1 className='text-2xl font-semibold'>Precificação</h1>
                    <p className='text-sm text-gray-600'>
                        Ajuste a margem global e personalize por item (margem ou preço).
                    </p>
                </div>

                <button
                    onClick={() => load({ silent: true })}
                    className='h-10 rounded-lg border px-3 text-sm hover:bg-gray-50 disabled:opacity-60'
                    type='button'
                    disabled={refreshing}
                    title='Recarregar itens'
                >
                    {refreshing ? 'Atualizando...' : 'Atualizar'}
                </button>
            </div>

            <div className='rounded-2xl border bg-white p-5 shadow-sm'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                    <div className='space-y-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <div className='text-base font-semibold'>Margem global</div>
                            <span className='rounded-full border bg-gray-50 px-2 py-0.5 text-xs text-gray-700'>
                                Atual: <b>{globalStatusLabel}</b>
                            </span>
                        </div>
                        <p className='text-xs text-gray-600'>
                            Itens em <b>GLOBAL</b> usam essa margem. Se estiver vazia, alguns itens ficam{' '}
                            <b>SEM PREÇO</b>.
                        </p>
                    </div>

                    <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
                        <div>
                            <label className='block text-xs text-gray-600'>Margem (%)</label>
                            <input
                                value={globalMarkupInput}
                                onChange={(e) => setGlobalMarkupInput(e.target.value)}
                                className='mt-1 w-44 rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='ex: 150'
                                inputMode='decimal'
                            />
                        </div>

                        <div className='flex gap-2'>
                            <button
                                onClick={handleSaveGlobal}
                                className='h-10 rounded-lg bg-black px-4 text-sm text-white hover:opacity-90 disabled:opacity-60'
                                type='button'
                                disabled={savingGlobal}
                            >
                                {savingGlobal ? 'Salvando...' : 'Salvar'}
                            </button>

                            <button
                                onClick={handleClearGlobal}
                                className='h-10 rounded-lg border px-4 text-sm hover:bg-gray-50 disabled:opacity-60'
                                type='button'
                                disabled={savingGlobal}
                                title='Limpa a margem global (volta para null)'
                            >
                                Limpar
                            </button>
                        </div>
                    </div>
                </div>

                <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    <div className='rounded-xl border bg-gray-50 p-3'>
                        <div className='text-[11px] text-gray-600'>GLOBAL</div>
                        <div className='text-lg font-semibold'>{stats.global}</div>
                    </div>
                    <div className='rounded-xl border bg-gray-50 p-3'>
                        <div className='text-[11px] text-gray-600'>ITEM</div>
                        <div className='text-lg font-semibold'>{stats.markup}</div>
                    </div>
                    <div className='rounded-xl border bg-gray-50 p-3'>
                        <div className='text-[11px] text-gray-600'>MANUAL</div>
                        <div className='text-lg font-semibold'>{stats.sale}</div>
                    </div>
                    <div className='rounded-xl border bg-gray-50 p-3'>
                        <div className='text-[11px] text-gray-600'>SEM PREÇO</div>
                        <div className='text-lg font-semibold'>{stats.unset}</div>
                    </div>
                </div>
            </div>

            <div className='rounded-2xl border bg-white p-5 shadow-sm'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
                    <div className='grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl'>
                        <div>
                            <label className='block text-xs text-gray-600'>Buscar</label>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='nome ou id...'
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-gray-600'>Filtrar modo</label>
                            <select
                                value={modeFilter}
                                onChange={(e) => setModeFilter(e.target.value as ModeFilter)}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                            >
                                <option value='all'>Todos</option>
                                <option value='global'>GLOBAL</option>
                                <option value='markup'>ITEM</option>
                                <option value='sale'>MANUAL</option>
                                <option value='unset'>SEM PREÇO</option>
                            </select>
                        </div>
                    </div>

                    <div className='text-sm text-gray-600'>
                        Mostrando <b>{filtered.length}</b> de <b>{items.length}</b>
                    </div>
                </div>
            </div>

            {loading ? <div className='text-sm text-gray-600'>Carregando...</div> : null}

            {error ? (
                <div className='rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700'>{error}</div>
            ) : null}

            {!loading && !error && filtered.length === 0 ? (
                <div className='text-sm text-gray-600'>Nenhum item encontrado.</div>
            ) : null}

            <div className='grid grid-cols-1 gap-4'>
                {filtered.map((item) => (
                    <ItemCard
                        key={item.id}
                        item={item}
                        onUpdateItem={handleUpdateItem}
                        onResetPricing={handleResetItem}
                    />
                ))}
            </div>
        </div>
    );
}
