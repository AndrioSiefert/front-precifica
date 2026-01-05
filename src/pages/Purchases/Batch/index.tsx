import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    deletePurchaseBatch,
    getPurchaseBatch,
    getPurchaseReport,
    listPurchaseCaptures,
    purchaseReportPdfUrl,
    resolveApiUrl,
    updatePurchaseBatch,
    uploadPurchaseCapture,
    deletePurchaseCapture,
    type PurchaseBatch,
    type PurchaseCapture,
    type PurchaseReport,
} from '../../../http/purchase';
import { Icon } from '../../../components/Icon';

type Tab = 'pendentes' | 'finalizados' | 'resumo';

function formatDateBR(iso: string) {
    const [y, m, d] = (iso ?? '').split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

function moneyBRL(v: number | null | undefined) {
    if (v === null || v === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function formatPercent(v: number | null | undefined) {
    if (v === null || v === undefined) return '-';
    return `${v}%`;
}

function tabClass(active: boolean) {
    return [
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
        active
            ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
            : 'text-slate-700 border border-slate-200 hover:border-slate-300 hover:text-slate-900 bg-slate-50',
    ].join(' ');
}

export default function PurchaseBatchPage() {
    const { batchId } = useParams();
    const id = String(batchId || '');
    const nav = useNavigate();

    const [batch, setBatch] = useState<PurchaseBatch | null>(null);
    const [captures, setCaptures] = useState<PurchaseCapture[]>([]);
    const [report, setReport] = useState<PurchaseReport | null>(null);

    const [tab, setTab] = useState<Tab>('pendentes');

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);

    const [markupInput, setMarkupInput] = useState<string>('');
    const [savingMarkup, setSavingMarkup] = useState(false);
    const [deletingBatch, setDeletingBatch] = useState(false);
    const [deletingCaptureId, setDeletingCaptureId] = useState<string | null>(null);

    async function load(opts?: { silent?: boolean }) {
        const silent = opts?.silent ?? false;
        try {
            setError(null);
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const [b, c, r] = await Promise.all([
                getPurchaseBatch(id),
                listPurchaseCaptures(id),
                getPurchaseReport(id),
            ]);

            setBatch(b);
            setCaptures(Array.isArray(c) ? c : []);
            setReport(r);
            setMarkupInput(b?.defaultMarkupPercent == null ? '' : String(b.defaultMarkupPercent));
        } catch {
            setError('Erro ao carregar compra');
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    }

    useEffect(() => {
        if (!id) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const pending = useMemo(() => captures.filter((c) => c.status === 'draft'), [captures]);
    const finalized = useMemo(() => captures.filter((c) => c.status === 'finalized'), [captures]);
    const captureByItemId = useMemo(() => {
        const map = new Map<string, PurchaseCapture>();
        finalized.forEach((c) => {
            if (c.itemId) map.set(c.itemId, c);
        });
        return map;
    }, [finalized]);

    async function handleUpload(files: FileList | null) {
        if (!files || files.length === 0) return;

        try {
            setUploading(true);
            setUploadMsg(null);

            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                setUploadMsg(`Enviando ${i + 1}/${files.length}: ${f.name}`);
                await uploadPurchaseCapture(id, f);
            }

            setUploadMsg('Upload concluido :)');
            await load({ silent: true });
            setTab('pendentes');
        } catch {
            setUploadMsg('Erro ao enviar uma ou mais fotos');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        void handleUpload(e.dataTransfer.files);
    }

    const headerTitle = batch?.title?.trim() ? batch.title : 'Compra sem título';

    async function handleSaveMarkup() {
        const raw = markupInput.trim().replace(',', '.');
        if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) {
            setError('Margem da pasta invalida.');
            return;
        }

        try {
            setError(null);
            setSavingMarkup(true);
            await updatePurchaseBatch(id, {
                defaultMarkupPercent: raw === '' ? null : Number(raw),
            });
            await load({ silent: true });
        } catch {
            setError('Erro ao salvar margem da pasta');
        } finally {
            setSavingMarkup(false);
        }
    }

    async function handleClearMarkup() {
        setMarkupInput('');
        try {
            setError(null);
            setSavingMarkup(true);
            await updatePurchaseBatch(id, { defaultMarkupPercent: null });
            await load({ silent: true });
        } catch {
            setError('Erro ao limpar margem da pasta');
        } finally {
            setSavingMarkup(false);
        }
    }

    async function handleDeleteBatch() {
        const confirmed = window.confirm('Tem certeza que deseja excluir esta pasta? Isso remove fotos e itens associados.');
        if (!confirmed) return;

        try {
            setError(null);
            setDeletingBatch(true);
            await deletePurchaseBatch(id);
            nav('/compras');
        } catch {
            setError('Erro ao excluir pasta');
        } finally {
            setDeletingBatch(false);
        }
    }

    async function handleDeleteCapture(captureId: string) {
        const confirmed = window.confirm('Excluir esta foto? Itens vinculados a ela tambem serao removidos.');
        if (!confirmed) return;

        try {
            setDeletingCaptureId(captureId);
            setError(null);
            await deletePurchaseCapture(captureId);
            await load({ silent: true });
        } catch {
            setError('Erro ao excluir foto');
        } finally {
            setDeletingCaptureId(null);
        }
    }

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Link to='/compras' className='inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900'>
                            <Icon name='back' className='h-4 w-4' />
                            Voltar
                        </Link>
                        {batch?.purchasedOn ? (
                            <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700'>
                                <Icon name='calendar' className='h-4 w-4' />
                                {formatDateBR(batch.purchasedOn)}
                            </span>
                        ) : null}
                    </div>

                    <h1 className='mt-2 truncate text-3xl font-semibold text-slate-900 tracking-tight'>{headerTitle}</h1>
                    {batch?.notes?.trim() ? <p className='mt-1 text-sm text-slate-700'>{batch.notes}</p> : null}
                    <div className='mt-1 text-xs text-slate-600'>
                        Margem desta pasta: <b className='text-slate-900'>{formatPercent(batch?.defaultMarkupPercent ?? null)}</b>
                    </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                    <button
                        onClick={() => load({ silent: true })}
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 shadow-sm'
                        type='button'
                        disabled={refreshing}
                    >
                        <Icon name='refresh' className='h-4 w-4' />
                        {refreshing ? 'Atualizando...' : 'Atualizar'}
                    </button>

                    <a
                        href={purchaseReportPdfUrl(id)}
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                        target='_blank'
                        rel='noreferrer'
                    >
                        <Icon name='pdf' className='h-4 w-4' />
                        Baixar PDF
                    </a>

                    <button
                        type='button'
                        onClick={handleDeleteBatch}
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 shadow-sm hover:border-rose-300 hover:text-rose-800 disabled:opacity-60'
                        disabled={deletingBatch}
                    >
                        <Icon name='trash' className='h-4 w-4' />
                        {deletingBatch ? 'Excluindo...' : 'Excluir pasta'}
                    </button>
                </div>
            </div>

            {loading ? <div className='text-sm text-slate-600'>Carregando...</div> : null}

            {error ? (
                <div className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>{error}</div>
            ) : null}

            {!loading && !error && batch && report ? (
                <>
                    {/* Margem da pasta */}
                    <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                                <div className='text-base font-semibold text-slate-900'>Margem desta pasta</div>
                                <p className='text-xs text-slate-600'>
                                    Itens em modo GLOBAL desta pasta usam essa margem. Outras pastas não são afetadas.
                                </p>
                            </div>
                            <div className='flex flex-col gap-2 sm:flex-row sm:items-end'>
                                <div>
                                    <label className='block text-xs text-slate-500'>Margem (%)</label>
                                    <input
                                        value={markupInput}
                                        onChange={(e) => setMarkupInput(e.target.value)}
                                        className='mt-1 w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                        placeholder='ex: 150'
                                        inputMode='decimal'
                                    />
                                </div>
                                <div className='flex gap-2'>
                                    <button
                                        type='button'
                                        onClick={handleSaveMarkup}
                                        disabled={savingMarkup}
                                        className='inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300 disabled:opacity-60'
                                    >
                                        <Icon name='percent' className='h-4 w-4' />
                                        {savingMarkup ? 'Salvando...' : 'Salvar'}
                                    </button>
                                    <button
                                        type='button'
                                        onClick={handleClearMarkup}
                                        disabled={savingMarkup}
                                        className='inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60'
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className='mt-2 text-xs text-slate-600'>
                            Valor atual: <b className='text-slate-900'>{formatPercent(batch.defaultMarkupPercent)}</b>. Se ficar vazio, os itens usam a margem global configurada em Precificação.
                        </div>
                    </div>

                    {/* Upload */}
                    <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                                <div className='text-base font-semibold text-slate-900'>Enviar fotos</div>
                                <p className='text-xs text-slate-600'>
                                    As fotos entram como <b>pendentes</b> até você finalizar.
                                </p>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                <button
                                    type='button'
                                    onClick={() => fileRef.current?.click()}
                                    className='inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300 disabled:opacity-60'
                                    disabled={uploading}
                                >
                                    <Icon name='upload' className='h-4 w-4' />
                                    {uploading ? 'Enviando...' : 'Escolher fotos'}
                                </button>
                                <input
                                    ref={fileRef}
                                    type='file'
                                    accept='image/*'
                                    multiple
                                    className='hidden'
                                    onChange={(e) => void handleUpload(e.target.files)}
                                />
                            </div>
                        </div>

                        <div
                            className='mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4'
                            onDrop={handleDrop}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            <div className='flex items-center gap-2 text-sm text-slate-800'>
                                <Icon name='upload' className='h-4 w-4' />
                                Arraste e solte aqui para enviar.
                            </div>
                            <div className='mt-1 text-xs text-slate-600'>Dica: voce pode selecionar varias fotos de uma vez.</div>

                            {uploadMsg ? (
                                <div className='mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700'>
                                    {uploadMsg}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md shadow-slate-200/60'>
                        <button type='button' onClick={() => setTab('pendentes')} className={tabClass(tab === 'pendentes')}>
                            Pendentes <span className='ml-1 text-xs opacity-80'>({pending.length})</span>
                        </button>
                        <button type='button' onClick={() => setTab('finalizados')} className={tabClass(tab === 'finalizados')}>
                            Finalizados <span className='ml-1 text-xs opacity-80'>({report.rows.length})</span>
                        </button>
                        <button type='button' onClick={() => setTab('resumo')} className={tabClass(tab === 'resumo')}>
                            Resumo
                        </button>
                    </div>

                    {/* Content */}
                    {tab === 'resumo' ? (
                        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Pendentes</div>
                                    <div className='text-lg font-semibold text-slate-900'>{pending.length}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Itens</div>
                                    <div className='text-lg font-semibold text-slate-900'>{report.summary.itemsCount}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Total custo</div>
                                    <div className='text-lg font-semibold text-slate-900'>{moneyBRL(report.summary.totalCost)}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-[11px] text-slate-600'>Lucro total</div>
                                    <div className='text-lg font-semibold text-slate-900'>{moneyBRL(report.summary.totalProfit)}</div>
                                </div>
                            </div>

                            <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3'>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-xs text-slate-600'>Total venda</div>
                                    <div className='text-base font-semibold text-slate-900'>{moneyBRL(report.summary.totalRevenue)}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-xs text-slate-600'>Qtd total</div>
                                    <div className='text-base font-semibold text-slate-900'>{report.summary.totalQuantity}</div>
                                </div>
                                <div className='rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm'>
                                    <div className='text-xs text-slate-600'>Margem da pasta</div>
                                    <div className='text-base font-semibold text-slate-900'>
                                        {formatPercent(report.summary.defaultMarkupPercent ?? null)}
                                    </div>
                                </div>
                            </div>

                            {report.summary.unpricedItemsCount > 0 ? (
                                <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
                                    Existem <b>{report.summary.unpricedItemsCount}</b> itens sem preço calculado (sem margem global e sem preço/margem no item).
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {tab === 'pendentes' ? (
                        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                            {pending.length === 0 ? (
                                <div className='text-sm text-slate-600'>Nenhuma foto pendente.</div>
                            ) : (
                                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                                    {pending.map((c) => (
                                        <Link
                                            key={c.id}
                                            to={`/compras/${id}/captures/${c.id}`}
                                            className='group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm'
                                            title='Finalizar'
                                        >
                                            <div className='relative aspect-square bg-slate-50'>
                                                {c.photoUrl ? (
                                                    <img
                                                        src={resolveApiUrl(c.photoUrl) ?? ''}
                                                        alt='Capture'
                                                        className='h-full w-full object-cover transition group-hover:scale-[1.02]'
                                                    />
                                                ) : null}
                                                <div className='absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] text-slate-700 border border-slate-200'>
                                                    Pendente
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        void handleDeleteCapture(c.id);
                                                    }}
                                                    className='absolute right-2 top-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 shadow-sm hover:border-rose-300'
                                                    disabled={deletingCaptureId === c.id}
                                                >
                                                    {deletingCaptureId === c.id ? '...' : 'Excluir'}
                                                </button>
                                            </div>
                                            <div className='p-2'>
                                                <div className='text-xs text-slate-700'>Clique para finalizar</div>
                                                <div className='mt-1 text-[11px] text-slate-500'>ID: {c.id.slice(0, 8)}...</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {finalized.length > 0 ? (
                                <div className='mt-5 text-xs text-slate-600'>
                                    Fotos ja finalizadas: <b className='text-slate-900'>{finalized.length}</b>
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {tab === 'finalizados' ? (
                        <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                            {report.rows.length === 0 ? (
                                <div className='text-sm text-slate-600'>Nenhum item finalizado ainda.</div>
                            ) : (
                                <div className='space-y-3'>
                                    {report.rows.map((row) => (
                                        <div key={row.itemId} className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                                            <div className='flex flex-col gap-4 lg:flex-row'>
                                                <div className='h-24 w-24 flex-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50'>
                                                    {row.photoUrl ? (
                                                        <img src={resolveApiUrl(row.photoUrl) ?? ''} alt={row.name} className='h-full w-full object-cover' />
                                                    ) : (
                                                        <div className='grid h-full w-full place-items-center text-xs text-slate-500'>Sem foto</div>
                                                    )}
                                                </div>

                                                <div className='min-w-0 flex-1'>
                                                    <div className='flex flex-wrap items-center gap-2'>
                                                        <div className='truncate text-base font-semibold text-slate-900'>{row.name}</div>
                                                        <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700'>
                                                            {String(row.pricingMode).toUpperCase()}
                                                        </span>
                                                    </div>

                                                    <div className='mt-2 grid grid-cols-2 gap-2 text-sm text-slate-800 sm:grid-cols-3'>
                                                        <div>
                                                            <div className='text-[11px] text-slate-500'>Qtd</div>
                                                            <div className='font-medium'>{row.quantity}</div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[11px] text-slate-500'>Custo un.</div>
                                                            <div className='font-medium'>{moneyBRL(row.costUnit)}</div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[11px] text-slate-500'>Total custo</div>
                                                            <div className='font-medium'>{moneyBRL(row.costTotal)}</div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[11px] text-slate-500'>Venda un.</div>
                                                            <div className='font-medium'>{moneyBRL(row.saleUnitEffective)}</div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[11px] text-slate-500'>Total venda</div>
                                                            <div className='font-medium'>{moneyBRL(row.saleTotal)}</div>
                                                        </div>
                                                        <div>
                                                            <div className='text-[11px] text-slate-500'>Lucro total</div>
                                                            <div className='font-medium'>{moneyBRL(row.profitTotal)}</div>
                                                        </div>
                                                    </div>
                                                    <div className='mt-3 flex flex-wrap gap-2'>
                                                        {captureByItemId.get(row.itemId) ? (
                                                            <Link
                                                                to={`/compras/${id}/captures/${captureByItemId.get(row.itemId)?.id}`}
                                                                className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-sm'
                                                            >
                                                                <Icon name='edit' className='h-4 w-4' />
                                                                Editar captura
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                to={`/items?q=${encodeURIComponent(row.name || row.itemId)}`}
                                                                className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-sm'
                                                            >
                                                                <Icon name='edit' className='h-4 w-4' />
                                                                Editar item
                                                            </Link>
                                                        )}
                                                        {captureByItemId.get(row.itemId) ? (
                                                            <button
                                                                type='button'
                                                                onClick={() => void handleDeleteCapture(captureByItemId.get(row.itemId)!.id)}
                                                                disabled={deletingCaptureId === captureByItemId.get(row.itemId)?.id}
                                                                className='inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:border-rose-300 hover:text-rose-800 disabled:opacity-60'
                                                            >
                                                                <Icon name='trash' className='h-4 w-4' />
                                                                {deletingCaptureId === captureByItemId.get(row.itemId)?.id ? 'Excluindo...' : 'Excluir'}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
