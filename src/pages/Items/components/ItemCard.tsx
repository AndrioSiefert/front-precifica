import { useEffect, useMemo, useState } from 'react';
import type { Item } from '../../../http/item';

function formatMoneyBRL(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPercent(value?: number | null) {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    return `${formatNumber(value)}%`;
}

function formatDateTime(value?: string | null) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR');
}

function toNumberOrNull(v: string): number | null {
    const s = v.trim().replace(',', '.');
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

type Props = {
    item: Item;
    onUpdateItem: (id: string, dto: Record<string, any>) => Promise<void>;
    onResetPricing: (id: string) => Promise<void>;
};

export default function ItemCard({ item, onUpdateItem, onResetPricing }: Props) {
    const pricing = item.pricing;

    const badge = useMemo(() => {
        const mode = pricing?.pricingMode;
        if (mode === 'sale') return { text: 'MANUAL', cls: 'bg-yellow-50 text-yellow-900 border-yellow-200' };
        if (mode === 'markup') return { text: 'ITEM', cls: 'bg-blue-50 text-blue-900 border-blue-200' };
        if (mode === 'global') return { text: 'GLOBAL', cls: 'bg-green-50 text-green-900 border-green-200' };
        if (mode === 'unset') return { text: 'SEM PREÇO', cls: 'bg-red-50 text-red-900 border-red-200' };
        return { text: '—', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
    }, [pricing?.pricingMode]);

    const [markupInput, setMarkupInput] = useState<string>(
        item.markupOverridePercent == null ? '' : String(item.markupOverridePercent),
    );
    const [saleInput, setSaleInput] = useState<string>(item.saleUnitManual == null ? '' : String(item.saleUnitManual));

    const [saving, setSaving] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const [photoOpen, setPhotoOpen] = useState(false);

    useEffect(() => {
        setMarkupInput(item.markupOverridePercent == null ? '' : String(item.markupOverridePercent));
        setSaleInput(item.saleUnitManual == null ? '' : String(item.saleUnitManual));
        setLocalError(null);
        setSaving(false);
    }, [item.id, item.markupOverridePercent, item.saleUnitManual]);

    const serverMarkup = item.markupOverridePercent ?? null;
    const serverSale = item.saleUnitManual ?? null;

    const markupNum = toNumberOrNull(markupInput);
    const saleNum = toNumberOrNull(saleInput);

    const markupDirty = markupNum !== serverMarkup;
    const saleDirty = saleNum !== serverSale;

    const totalCost =
        typeof item.costUnit === 'number' && typeof item.quantity === 'number' ? item.costUnit * item.quantity : null;

    async function handleSaveMarkup() {
        try {
            setLocalError(null);
            setSaving(true);

            if (markupNum === null) {
                await onResetPricing(item.id);
                return;
            }

            if (markupNum < 0) {
                setLocalError('Margem não pode ser negativa.');
                return;
            }

            await onUpdateItem(item.id, {
                markupOverridePercent: markupNum,
                updatedField: 'markup',
            });

            setSaleInput('');
        } catch {
            setLocalError('Erro ao salvar margem do item');
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveSale() {
        try {
            setLocalError(null);
            setSaving(true);

            if (saleNum === null) {
                await onResetPricing(item.id);
                return;
            }

            if (saleNum < 0) {
                setLocalError('Preço não pode ser negativo.');
                return;
            }

            await onUpdateItem(item.id, {
                saleUnitManual: saleNum,
                updatedField: 'sale',
            });

            setMarkupInput('');
        } catch {
            setLocalError('Erro ao salvar preço manual');
        } finally {
            setSaving(false);
        }
    }

    function handleCancelEdits() {
        setMarkupInput(serverMarkup == null ? '' : String(serverMarkup));
        setSaleInput(serverSale == null ? '' : String(serverSale));
        setLocalError(null);
    }

    async function handleUseGlobal() {
        try {
            setLocalError(null);
            setSaving(true);
            await onResetPricing(item.id);
        } catch {
            setLocalError('Erro ao voltar para global');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className='rounded-2xl border bg-white p-4 shadow-sm'>
            {photoOpen && item.photoUrl ? (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
                    onClick={() => setPhotoOpen(false)}
                    role='dialog'
                    aria-modal='true'
                >
                    <div
                        className='relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='flex items-center justify-between border-b px-4 py-3'>
                            <div className='truncate text-sm font-semibold'>{item.name}</div>
                            <button
                                type='button'
                                className='rounded-lg border px-3 py-1 text-sm hover:bg-gray-50'
                                onClick={() => setPhotoOpen(false)}
                            >
                                Fechar
                            </button>
                        </div>
                        <div className='bg-black'>
                            <img src={item.photoUrl} alt={item.name} className='max-h-[75vh] w-full object-contain' />
                        </div>
                    </div>
                </div>
            ) : null}

            <div className='flex flex-col gap-4 lg:flex-row'>
                <div className='w-full lg:w-52'>
                    <div
                        className='aspect-square w-full overflow-hidden rounded-2xl border bg-gray-50'
                        role={item.photoUrl ? 'button' : undefined}
                        tabIndex={item.photoUrl ? 0 : -1}
                        onClick={() => item.photoUrl && setPhotoOpen(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && item.photoUrl) setPhotoOpen(true);
                        }}
                        title={item.photoUrl ? 'Clique para ampliar' : undefined}
                    >
                        {item.photoUrl ? (
                            <img
                                src={item.photoUrl}
                                alt={item.name}
                                className='h-full w-full object-cover'
                                loading='lazy'
                                referrerPolicy='no-referrer'
                                onError={(e) => {
                                    const el = e.currentTarget;
                                    el.style.display = 'none';
                                    const parent = el.parentElement;
                                    if (parent) {
                                        parent.innerHTML =
                                            '<div class="flex h-full w-full items-center justify-center text-xs text-gray-500">Imagem indisponível</div>';
                                    }
                                }}
                            />
                        ) : (
                            <div className='flex h-full w-full items-center justify-center text-xs text-gray-500'>
                                Sem foto
                            </div>
                        )}
                    </div>

                    <div className='mt-3 flex gap-2'>
                        <button
                            type='button'
                            className='w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60'
                            disabled={!item.photoUrl}
                            onClick={() => item.photoUrl && setPhotoOpen(true)}
                        >
                            Ver foto
                        </button>

                        {item.photoUrl ? (
                            <a
                                href={item.photoUrl}
                                target='_blank'
                                rel='noreferrer'
                                className='w-full rounded-lg bg-black px-3 py-2 text-center text-sm text-white hover:opacity-90'
                            >
                                Abrir
                            </a>
                        ) : null}
                    </div>
                </div>

                <div className='min-w-0 flex-1 space-y-4'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <h3 className='truncate text-xl font-semibold'>{item.name}</h3>
                                <span className={`rounded-full border px-2 py-0.5 text-xs ${badge.cls}`}>
                                    {badge.text}
                                </span>
                            </div>
                            <div className='mt-1 truncate text-xs text-gray-500'>{item.id}</div>
                        </div>

                        <button
                            type='button'
                            onClick={handleUseGlobal}
                            disabled={saving}
                            className='rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60'
                            title='Zera margem override e preço manual'
                        >
                            Usar global
                        </button>
                    </div>

                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                        <div className='rounded-2xl border bg-gray-50 p-4'>
                            <div className='text-[11px] text-gray-600'>Preço efetivo</div>
                            <div className='mt-1 text-lg font-semibold'>
                                {formatMoneyBRL(pricing?.saleUnitEffective ?? null)}
                            </div>
                        </div>

                        <div className='rounded-2xl border bg-gray-50 p-4'>
                            <div className='text-[11px] text-gray-600'>Margem efetiva</div>
                            <div className='mt-1 text-lg font-semibold'>
                                {formatPercent(pricing?.markupEffectivePercent ?? null)}
                            </div>
                        </div>

                        <div className='rounded-2xl border bg-gray-50 p-4'>
                            <div className='text-[11px] text-gray-600'>Lucro unitário</div>
                            <div className='mt-1 text-lg font-semibold'>
                                {formatMoneyBRL(pricing?.profitUnit ?? null)}
                            </div>
                        </div>
                    </div>

                    {pricing?.pricingMode === 'unset' ? (
                        <div className='rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
                            Este item está <b>sem preço</b>. Defina a <b>margem global</b> ou informe margem/preço neste
                            item.
                        </div>
                    ) : null}

                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                        <div className='rounded-2xl border bg-white p-4'>
                            <div className='text-[11px] text-gray-600'>Custo unitário</div>
                            <div className='mt-1 text-sm font-semibold'>{formatMoneyBRL(item.costUnit ?? null)}</div>
                            <div className='mt-2 text-[11px] text-gray-500'>
                                Qtd: <b>{formatNumber(item.quantity ?? null)}</b>
                            </div>
                        </div>

                        <div className='rounded-2xl border bg-white p-4'>
                            <div className='text-[11px] text-gray-600'>Custo total</div>
                            <div className='mt-1 text-sm font-semibold'>{formatMoneyBRL(totalCost)}</div>
                            <div className='mt-2 text-[11px] text-gray-500'>
                                Global atual: <b>{formatPercent(pricing?.defaultMarkupPercent ?? null)}</b>
                            </div>
                        </div>

                        <div className='rounded-2xl border bg-white p-4'>
                            <div className='text-[11px] text-gray-600'>Datas</div>
                            <div className='mt-1 text-[11px] text-gray-700'>
                                Compra: <b>{formatDateTime(item.purchasedAt ?? null)}</b>
                            </div>
                            <div className='mt-1 text-[11px] text-gray-700'>
                                Atualização: <b>{formatDateTime(item.updatedAt ?? null)}</b>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-2xl border bg-white p-4'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                            <div>
                                <div className='text-sm font-semibold'>Editar precificação</div>
                                <div className='text-xs text-gray-600'>
                                    Salve <b>margem</b> (override) ou <b>preço manual</b>. Ao salvar um, o outro é
                                    ignorado.
                                </div>
                            </div>

                            <button
                                type='button'
                                onClick={handleCancelEdits}
                                disabled={saving || (!markupDirty && !saleDirty)}
                                className='h-10 rounded-lg border px-3 text-sm hover:bg-gray-50 disabled:opacity-60'
                            >
                                Cancelar alterações
                            </button>
                        </div>

                        <div className='mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2'>
                            <div className='rounded-2xl border bg-gray-50 p-4'>
                                <div className='text-xs text-gray-600'>Margem do item (override %)</div>
                                <div className='mt-2 flex gap-2'>
                                    <input
                                        value={markupInput}
                                        onChange={(e) => {
                                            setMarkupInput(e.target.value);
                                            if (saleInput) setSaleInput('');
                                        }}
                                        placeholder='ex: 180'
                                        inputMode='decimal'
                                        className='w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring'
                                    />
                                    <button
                                        type='button'
                                        onClick={handleSaveMarkup}
                                        disabled={saving || !markupDirty}
                                        className='shrink-0 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60'
                                        title={markupDirty ? 'Salvar margem' : 'Sem alterações'}
                                    >
                                        {saving ? '...' : 'Salvar'}
                                    </button>
                                </div>
                                <div className='mt-2 text-[11px] text-gray-500'>
                                    Dica: deixar vazio e salvar = <b>voltar pro global</b>.
                                </div>
                            </div>

                            <div className='rounded-2xl border bg-gray-50 p-4'>
                                <div className='text-xs text-gray-600'>Preço manual (R$)</div>
                                <div className='mt-2 flex gap-2'>
                                    <input
                                        value={saleInput}
                                        onChange={(e) => {
                                            setSaleInput(e.target.value);
                                            if (markupInput) setMarkupInput('');
                                        }}
                                        placeholder='ex: 280,00'
                                        inputMode='decimal'
                                        className='w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring'
                                    />
                                    <button
                                        type='button'
                                        onClick={handleSaveSale}
                                        disabled={saving || !saleDirty}
                                        className='shrink-0 rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60'
                                        title={saleDirty ? 'Salvar preço manual' : 'Sem alterações'}
                                    >
                                        {saving ? '...' : 'Salvar'}
                                    </button>
                                </div>
                                <div className='mt-2 text-[11px] text-gray-500'>
                                    Ao salvar, a <b>margem efetiva</b> é recalculada.
                                </div>
                            </div>
                        </div>

                        {localError ? (
                            <div className='mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>
                                {localError}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
