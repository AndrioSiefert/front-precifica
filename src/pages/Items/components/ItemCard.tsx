import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon';
import type { Item } from '../../../http/item';
import type { PurchaseBatch } from '../../../http/purchase';

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

function formatDateBR(iso?: string | null) {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
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
    onChangeBatch: (id: string, batchId: string | null) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    batches: PurchaseBatch[];
};

export default function ItemCard({ item, onUpdateItem, onResetPricing, onChangeBatch, onDelete, batches }: Props) {
    const pricing = item.pricing;

    const badge = useMemo(() => {
        const mode = pricing?.pricingMode;
        if (mode === 'sale') return { text: 'Manual', cls: 'bg-amber-50 text-amber-700 border-amber-100' };
        if (mode === 'markup') return { text: 'Item', cls: 'bg-cyan-50 text-cyan-700 border-cyan-100' };
        if (mode === 'global') return { text: 'Global', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' };
        if (mode === 'unset') return { text: 'Sem preço', cls: 'bg-rose-50 text-rose-700 border-rose-100' };
        return { text: '?', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }, [pricing?.pricingMode]);

    const [markupInput, setMarkupInput] = useState<string>(
        item.markupOverridePercent == null ? '' : String(item.markupOverridePercent),
    );
    const [saleInput, setSaleInput] = useState<string>(item.saleUnitManual == null ? '' : String(item.saleUnitManual));
    const [batchSelect, setBatchSelect] = useState<string>(item.batch?.id ?? '');

    const [saving, setSaving] = useState(false);
    const [changingBatch, setChangingBatch] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const [photoOpen, setPhotoOpen] = useState(false);

    useEffect(() => {
        setMarkupInput(item.markupOverridePercent == null ? '' : String(item.markupOverridePercent));
        setSaleInput(item.saleUnitManual == null ? '' : String(item.saleUnitManual));
        setBatchSelect(item.batch?.id ?? '');
        setLocalError(null);
        setSaving(false);
        setChangingBatch(false);
        setDeleting(false);
    }, [item.id, item.markupOverridePercent, item.saleUnitManual, item.batch?.id]);

    const serverMarkup = item.markupOverridePercent ?? null;
    const serverSale = item.saleUnitManual ?? null;

    const markupNum = toNumberOrNull(markupInput);
    const saleNum = toNumberOrNull(saleInput);

    const markupDirty = markupNum !== serverMarkup;
    const saleDirty = saleNum !== serverSale;

    const totalCost =
        typeof item.costUnit === 'number' && typeof item.quantity === 'number' ? item.costUnit * item.quantity : null;
    const defaultMarkupLabel = formatPercent(pricing?.defaultMarkupPercent ?? null);
    const currentBatchLabel = item.batch ? batchLabel(item.batch) : 'Sem pasta';

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
            setLocalError('Erro ao voltar para margem global/pasta');
        } finally {
            setSaving(false);
        }
    }

    async function handleChangeBatchSelect(nextId: string) {
        const previous = item.batch?.id ?? '';
        setBatchSelect(nextId);
        if (nextId === previous) return;

        try {
            setLocalError(null);
            setChangingBatch(true);
            await onChangeBatch(item.id, nextId || null);
        } catch {
            setLocalError('Erro ao mover o item de pasta');
            setBatchSelect(previous);
        } finally {
            setChangingBatch(false);
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm('Tem certeza que deseja excluir este item? Essa ação não pode ser desfeita.');
        if (!confirmed) return;

        try {
            setLocalError(null);
            setDeleting(true);
            await onDelete(item.id);
        } catch {
            setLocalError('Erro ao excluir item');
        } finally {
            setDeleting(false);
        }
    }

    function batchLabel(batch: PurchaseBatch) {
        const title = batch.title?.trim() ? batch.title : formatDateBR(batch.purchasedOn);
        return `${title} • ${formatDateBR(batch.purchasedOn)}`;
    }

    return (
        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60'>
            {photoOpen && item.photoUrl ? (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4'
                    onClick={() => setPhotoOpen(false)}
                    role='dialog'
                    aria-modal='true'
                >
                    <div
                        className='relative w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='flex items-center justify-between border-b border-slate-100 px-4 py-3'>
                            <div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
                                <Icon name='photo' className='h-4 w-4' /> {item.name}
                            </div>
                            <button
                                type='button'
                                className='rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:border-slate-300 hover:text-slate-900'
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
                <div className='w-full lg:w-64'>
                    <div
                        className='relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50'
                        role={item.photoUrl ? 'button' : undefined}
                        tabIndex={item.photoUrl ? 0 : -1}
                        onClick={() => item.photoUrl && setPhotoOpen(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && item.photoUrl) setPhotoOpen(true);
                        }}
                        title={item.photoUrl ? 'Clique para ampliar' : undefined}
                    >
                        {item.photoUrl ? (
                            <>
                                <img
                                    src={item.photoUrl}
                                    alt={item.name}
                                    className='h-full w-full object-cover transition hover:scale-[1.02]'
                                    loading='lazy'
                                    referrerPolicy='no-referrer'
                                    onError={(e) => {
                                        const el = e.currentTarget;
                                        el.style.display = 'none';
                                    }}
                                />
                                <div className='pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent' />
                            </>
                        ) : (
                            <div className='flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-slate-500'>
                                <Icon name='camera' className='h-5 w-5' />
                                Sem foto
                            </div>
                        )}
                        <div className='absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-600 backdrop-blur'>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold bg-gradient-to-r ${badge.cls}`}>
                                {badge.text}
                            </span>
                            <span className='text-slate-500'>#{String(item.id).slice(0, 6)}</span>
                        </div>
                    </div>

                    <div className='mt-3 grid grid-cols-2 gap-2'>
                        <button
                            type='button'
                            className='flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-50'
                            disabled={!item.photoUrl}
                            onClick={() => item.photoUrl && setPhotoOpen(true)}
                        >
                            <Icon name='eye' className='h-4 w-4' />
                            Ver foto
                        </button>

                        {item.photoUrl ? (
                            <a
                                href={item.photoUrl}
                                target='_blank'
                                rel='noreferrer'
                                className='flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                            >
                                <Icon name='download' className='h-4 w-4' />
                                Abrir
                            </a>
                        ) : (
                            <div className='flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500'>
                                Sem link
                            </div>
                        )}
                    </div>
                </div>

                <div className='min-w-0 flex-1 space-y-4'>
                    <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                        <div className='min-w-0 space-y-1'>
                            <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase text-slate-600 shadow-sm'>
                                <Icon name='list' className='h-3.5 w-3.5' /> Item
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                                <h3 className='truncate text-xl font-semibold text-slate-900'>{item.name}</h3>
                                <span className={`rounded-full border bg-gradient-to-r px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
                                    {badge.text}
                                </span>
                            </div>
                            <div className='mt-1 truncate text-xs text-slate-500'>ID: {item.id}</div>
                        </div>

                        <div className='flex flex-wrap gap-2 md:justify-end'>
                            <button
                                type='button'
                                onClick={handleUseGlobal}
                                disabled={saving || changingBatch || deleting}
                                className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60'
                                title='Zera margem override e preço manual'
                            >
                                <Icon name='percent' className='h-4 w-4' />
                                Usar margem padrao
                            </button>
                            <button
                                type='button'
                                onClick={handleCancelEdits}
                                disabled={saving || (!markupDirty && !saleDirty) || deleting}
                                className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60'
                            >
                                <Icon name='refresh' className='h-4 w-4' />
                                Cancelar
                            </button>
                            <button
                                type='button'
                                onClick={handleDelete}
                                disabled={deleting}
                                className='inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:border-rose-300 hover:text-rose-800 disabled:opacity-60'
                            >
                                <Icon name='trash' className='h-4 w-4' />
                                {deleting ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </div>
                    </div>

                    <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='currency' className='h-4 w-4' />
                                Preco efetivo
                            </div>
                            <div className='mt-1 text-lg font-semibold text-slate-900'>
                                {formatMoneyBRL(pricing?.saleUnitEffective ?? null)}
                            </div>
                        </div>

                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='percent' className='h-4 w-4' />
                                Margem efetiva
                            </div>
                            <div className='mt-1 text-lg font-semibold text-slate-900'>
                                {formatPercent(pricing?.markupEffectivePercent ?? null)}
                            </div>
                        </div>

                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='sparkle' className='h-4 w-4' />
                                Lucro unitario
                            </div>
                            <div className='mt-1 text-lg font-semibold text-slate-900'>
                                {formatMoneyBRL(pricing?.profitUnit ?? null)}
                            </div>
                        </div>
                    </div>

                    {pricing?.pricingMode === 'unset' ? (
                        <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                            Este item está <b>sem preço</b>. Defina a margem da pasta ou a margem global, ou informe margem/preço neste item.
                        </div>
                    ) : null}

                    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='folder' className='h-4 w-4' />
                                Pasta
                            </div>
                            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700'>
                                Margem da pasta: <b className='text-slate-900'>{formatPercent(item.batch?.defaultMarkupPercent ?? null)}</b>
                            </span>
                        </div>
                        <div className='mt-2 flex flex-col gap-2 sm:flex-row sm:items-end'>
                            <div className='flex-1'>
                                <label className='block text-xs text-slate-500'>Mover item para pasta</label>
                                <select
                                    value={batchSelect}
                                    onChange={(e) => handleChangeBatchSelect(e.target.value)}
                                    disabled={changingBatch || deleting || saving}
                                    className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                >
                                    <option value=''>Sem pasta</option>
                                    {batches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {batchLabel(b)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className='text-xs text-slate-600 sm:w-64'>
                                Pasta atual: <b className='text-slate-900'>{currentBatchLabel}</b>
                            </div>
                        </div>
                        <div className='mt-1 text-[11px] text-slate-600'>
                            Itens em modo GLOBAL usam a margem da pasta. Se a pasta não tiver margem, eles usam a margem global em Precificação.
                        </div>
                    </div>

                    <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='currency' className='h-4 w-4' />
                                Custo unitario
                            </div>
                            <div className='mt-1 text-sm font-semibold text-slate-900'>{formatMoneyBRL(item.costUnit ?? null)}</div>
                            <div className='mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600'>
                                Qtd: <b className='text-slate-900'>{formatNumber(item.quantity ?? null)}</b>
                            </div>
                        </div>

                        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='currency' className='h-4 w-4' />
                                Custo total
                            </div>
                            <div className='mt-1 text-sm font-semibold text-slate-900'>{formatMoneyBRL(totalCost)}</div>
                            <div className='mt-2 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700'>
                                Margem padrao (pasta/global): <b className='text-slate-900'>{defaultMarkupLabel}</b>
                            </div>
                        </div>

                        <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                            <div className='flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-600'>
                                <Icon name='calendar' className='h-4 w-4' />
                                Datas
                            </div>
                            <div className='mt-1 text-[11px] text-slate-700'>
                                Compra: <b className='text-slate-900'>{formatDateTime(item.purchasedAt ?? null)}</b>
                            </div>
                            <div className='mt-1 text-[11px] text-slate-700'>
                                Atualização: <b className='text-slate-900'>{formatDateTime(item.updatedAt ?? null)}</b>
                            </div>
                        </div>
                    </div>

                    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='space-y-1'>
                                <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase text-slate-600'>
                                    <Icon name='edit' className='h-3.5 w-3.5' /> Editar precificação
                                </div>
                                <div className='text-xs text-slate-600'>
                                    Salve <b>margem</b> (override) ou <b>preço manual</b>. Ao salvar um, o outro é ignorado.
                                </div>
                            </div>

                            <div className='flex flex-wrap gap-2'>
                                <button
                                    type='button'
                                    onClick={handleUseGlobal}
                                    disabled={saving || deleting || changingBatch}
                                    className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60'
                                >
                                    <Icon name='percent' className='h-4 w-4' />
                                    Voltar para margem padrao
                                </button>
                            </div>
                        </div>

                        <div className='mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2'>
                            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                                <div className='flex items-center gap-2 text-xs text-slate-700'>
                                    <Icon name='percent' className='h-4 w-4' />
                                    Margem do item (override %)
                                </div>
                                <div className='mt-2 flex gap-2'>
                                    <input
                                        value={markupInput}
                                        onChange={(e) => {
                                            setMarkupInput(e.target.value);
                                            if (saleInput) setSaleInput('');
                                        }}
                                        placeholder='ex: 180'
                                        inputMode='decimal'
                                        className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                    />
                                    <button
                                        type='button'
                                        onClick={handleSaveMarkup}
                                        disabled={saving || !markupDirty || deleting}
                                        className='shrink-0 rounded-xl border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300 disabled:opacity-60'
                                        title={markupDirty ? 'Salvar margem' : 'Sem alteracoes'}
                                    >
                                        {saving ? '...' : 'Salvar'}
                                    </button>
                                </div>
                                <div className='mt-2 text-[11px] text-slate-600'>
                                    Dica: deixar vazio e salvar = <b>voltar para margem padrao</b>.
                                </div>
                            </div>

                            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                                <div className='flex items-center gap-2 text-xs text-slate-700'>
                                    <Icon name='currency' className='h-4 w-4' />
                                    Preco manual (R$)
                                </div>
                                <div className='mt-2 flex gap-2'>
                                    <input
                                        value={saleInput}
                                        onChange={(e) => {
                                            setSaleInput(e.target.value);
                                            if (markupInput) setMarkupInput('');
                                        }}
                                        placeholder='ex: 280,00'
                                        inputMode='decimal'
                                        className='w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                    />
                                    <button
                                        type='button'
                                        onClick={handleSaveSale}
                                        disabled={saving || !saleDirty || deleting}
                                        className='shrink-0 rounded-xl border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300 disabled:opacity-60'
                                        title={saleDirty ? 'Salvar preço manual' : 'Sem alterações'}
                                    >
                                        {saving ? '...' : 'Salvar'}
                                    </button>
                                </div>
                                <div className='mt-2 text-[11px] text-slate-600'>
                                    Ao salvar, a <b>margem efetiva</b> e recalculada.
                                </div>
                            </div>
                        </div>

                        {localError ? (
                            <div className='mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>
                                {localError}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
