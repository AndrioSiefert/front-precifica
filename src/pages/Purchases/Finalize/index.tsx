import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { getItem } from '../../../http/item';
import {
    finalizePurchaseCapture,
    getPurchaseBatch,
    listPurchaseCaptures,
    resolveApiUrl,
    type PurchaseBatch,
    type PurchaseCapture,
} from '../../../http/purchase';

type Mode = 'markup' | 'sale';

function toNumberOrUndefined(v: string) {
    const s = (v ?? '').trim().replace(',', '.');
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

function moneyBRL(v: number | null | undefined) {
    if (v === null || v === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function FinalizePurchaseCapturePage() {
    const { batchId, captureId } = useParams();
    const batch_id = String(batchId || '');
    const capture_id = String(captureId || '');

    const nav = useNavigate();

    const [batch, setBatch] = useState<PurchaseBatch | null>(null);
    const [capture, setCapture] = useState<PurchaseCapture | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [mode, setMode] = useState<Mode>('markup');

    const [name, setName] = useState('');
    const [costUnit, setCostUnit] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [markup, setMarkup] = useState('');
    const [sale, setSale] = useState('');

    useEffect(() => {
        async function load() {
            try {
                setError(null);
                setLoading(true);

                const [b, caps] = await Promise.all([getPurchaseBatch(batch_id), listPurchaseCaptures(batch_id)]);
                setBatch(b);

                const found = caps.find((c) => c.id === capture_id) ?? null;
                setCapture(found);

                if (!found) {
                    setError('Foto não encontrada neste lote.');
                    return;
                }

                // defaults
                setName('');
                setCostUnit('');
                setQuantity('1');
                setMarkup('');
                setSale('');
                setMode('markup');

                if (found.itemId) {
                    try {
                        const item = await getItem(found.itemId);
                        setName(item.name ?? '');
                        setCostUnit(item.costUnit != null ? String(item.costUnit) : '');
                        setQuantity(item.quantity != null ? String(item.quantity) : '1');
                        if (item.saleUnitManual != null) {
                            setSale(String(item.saleUnitManual));
                            setMarkup('');
                            setMode('sale');
                        } else if (item.markupOverridePercent != null) {
                            setMarkup(String(item.markupOverridePercent));
                            setSale('');
                            setMode('markup');
                        }
                    } catch {
                        // se não achar item, mantém valores em branco
                    }
                }
            } catch {
                setError('Erro ao carregar captura');
            } finally {
                setLoading(false);
            }
        }

        if (!batch_id || !capture_id) return;
        void load();
    }, [batch_id, capture_id]);

    const preview = useMemo(() => {
        const c = toNumberOrUndefined(costUnit);
        const q = toNumberOrUndefined(quantity);
        if (c === undefined || q === undefined) return null;

        const totalCost = c * q;

        if (mode === 'sale') {
            const s = toNumberOrUndefined(sale);
            if (s === undefined) return { totalCost, saleUnit: null as number | null, totalSale: null as number | null, profit: null as number | null };
            const totalSale = s * q;
            const profit = totalSale - totalCost;
            return { totalCost, saleUnit: s, totalSale, profit };
        }

        const m = toNumberOrUndefined(markup);
        if (m === undefined) return { totalCost, saleUnit: null as number | null, totalSale: null as number | null, profit: null as number | null };
        const saleUnit = c * (1 + m / 100);
        const totalSale = saleUnit * q;
        const profit = totalSale - totalCost;
        return { totalCost, saleUnit, totalSale, profit };
    }, [costUnit, quantity, markup, sale, mode]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const n = name.trim();
        if (!n) {
            setError('Informe o nome do item.');
            return;
        }

        const c = toNumberOrUndefined(costUnit);
        const q = toNumberOrUndefined(quantity);
        if (c === undefined || c <= 0) {
            setError('Custo por unidade inválido.');
            return;
        }
        if (q === undefined || q <= 0) {
            setError('Quantidade inválida.');
            return;
        }

        const dto: any = {
            name: n,
            costUnit: c,
            quantity: q,
        };

        if (mode === 'sale') {
            const s = toNumberOrUndefined(sale);
            if (s === undefined || s <= 0) {
                setError('Preço de venda inválido.');
                return;
            }
            dto.saleUnitManual = s;
            dto.updatedField = 'sale';
        } else {
            const m = toNumberOrUndefined(markup);
            if (m === undefined || m < 0) {
                setError('Margem inválida.');
                return;
            }
            dto.markupOverridePercent = m;
            dto.updatedField = 'markup';
        }

        try {
            setSaving(true);
            await finalizePurchaseCapture(capture_id, dto);
            nav(`/compras/${batch_id}`);
        } catch {
            setError('Erro ao finalizar');
        } finally {
            setSaving(false);
        }
    }

    const title = batch?.title?.trim() ? batch.title : 'Compra sem título';

    return (
        <div className='space-y-5'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div className='min-w-0'>
                    <Link to={`/compras/${batch_id}`} className='inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900'>
                        <Icon name='back' className='h-4 w-4' />
                        Voltar para a compra
                    </Link>
                    <h1 className='mt-2 truncate text-3xl font-semibold text-slate-900 tracking-tight'>Finalizar foto</h1>
                    <p className='mt-1 text-sm text-slate-600'>
                        Lote: <b className='text-slate-900'>{title}</b>
                    </p>
                </div>
            </div>

            {loading ? <div className='text-sm text-slate-600'>Carregando...</div> : null}

            {error ? (
                <div className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>{error}</div>
            ) : null}

            {!loading && capture && !error ? (
                <form onSubmit={handleSubmit} className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60'>
                        <div className='flex items-center justify-between'>
                            <h2 className='text-base font-semibold text-slate-900'>Foto</h2>
                            <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700'>
                                <Icon name='photo' className='h-4 w-4' />
                                {capture.status === 'finalized' ? 'Finalizado' : 'Pendente'}
                            </span>
                        </div>

                        <div className='mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50'>
                            {capture.photoUrl ? (
                                <img src={resolveApiUrl(capture.photoUrl) ?? ''} alt='Foto' className='h-[420px] w-full bg-white object-contain' />
                            ) : (
                                <div className='grid h-[420px] w-full place-items-center text-sm text-slate-500'>Sem imagem</div>
                            )}
                        </div>

                        {preview ? (
                            <div className='mt-4 grid grid-cols-2 gap-3'>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Total custo</div>
                                    <div className='text-lg font-semibold text-slate-900'>{moneyBRL(preview.totalCost)}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Total venda</div>
                                    <div className='text-lg font-semibold text-slate-900'>{moneyBRL(preview.totalSale)}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Venda un.</div>
                                    <div className='text-lg font-semibold text-slate-900'>{moneyBRL(preview.saleUnit)}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Lucro</div>
                                    <div className='text-lg font-semibold text-slate-900'>{moneyBRL(preview.profit)}</div>
                                </div>
                            </div>
                        ) : (
                            <div className='mt-4 text-xs text-slate-600'>Preencha custo e quantidade para ver a prévia.</div>
                        )}
                    </div>

                    <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60'>
                        <h2 className='text-base font-semibold text-slate-900'>Informações do item</h2>

                        <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                            <div className='sm:col-span-2'>
                                <label className='block text-xs text-slate-500'>Nome do produto *</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                    placeholder='Ex: Camiseta, Saia, Calça...'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-xs text-slate-500'>Custo por unidade (R$) *</label>
                                <input
                                    value={costUnit}
                                    onChange={(e) => setCostUnit(e.target.value)}
                                    className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                    placeholder='Ex: 12,50'
                                    inputMode='decimal'
                                    required
                                />
                            </div>

                            <div>
                                <label className='block text-xs text-slate-500'>Quantidade *</label>
                                <input
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                    placeholder='Ex: 1'
                                    inputMode='numeric'
                                    required
                                />
                            </div>
                        </div>

                        <div className='mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                            <div className='text-sm font-semibold text-slate-900'>Como definir o preço?</div>
                            <p className='mt-1 text-xs text-slate-600'>Escolha <b>margem</b> ou <b>preço manual</b> para este item.</p>

                            <div className='mt-3 flex flex-wrap gap-2'>
                                <button
                                    type='button'
                                    onClick={() => setMode('markup')}
                                    className={
                                        mode === 'markup'
                                            ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                                            : 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                    }
                                >
                                    <Icon name='percent' className='h-4 w-4' />
                                    Margem (%)
                                </button>
                                <button
                                    type='button'
                                    onClick={() => setMode('sale')}
                                    className={
                                        mode === 'sale'
                                            ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                                            : 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                    }
                                >
                                    <Icon name='currency' className='h-4 w-4' />
                                    Preço de venda
                                </button>
                            </div>

                            {mode === 'markup' ? (
                                <div className='mt-3'>
                                    <label className='block text-xs text-slate-500'>Margem (%)</label>
                                    <input
                                        value={markup}
                                        onChange={(e) => setMarkup(e.target.value)}
                                        className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                        placeholder='Ex: 150'
                                        inputMode='decimal'
                                    />
                                    <p className='mt-1 text-xs text-slate-600'>Vai calcular o preço de venda com base no custo.</p>
                                </div>
                            ) : (
                                <div className='mt-3'>
                                    <label className='block text-xs text-slate-500'>Preço de venda (R$)</label>
                                    <input
                                        value={sale}
                                        onChange={(e) => setSale(e.target.value)}
                                        className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                        placeholder='Ex: 59,90'
                                        inputMode='decimal'
                                    />
                                    <p className='mt-1 text-xs text-slate-600'>Define o preço manual e ignora margem.</p>
                                </div>
                            )}
                        </div>

                        <div className='mt-4 flex flex-wrap gap-2'>
                            <button
                                type='submit'
                                className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300 disabled:opacity-60'
                                disabled={saving}
                            >
                                <Icon name='sparkle' className='h-4 w-4' />
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>

                            <Link
                                to={`/compras/${batch_id}`}
                                className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                            >
                                Cancelar
                            </Link>
                        </div>
                    </div>
                </form>
            ) : null}
        </div>
    );
}
