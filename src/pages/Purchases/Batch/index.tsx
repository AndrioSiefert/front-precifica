import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    getPurchaseBatch,
    getPurchaseReport,
    listPurchaseCaptures,
    purchaseReportPdfUrl,
    resolveApiUrl,
    uploadPurchaseCapture,
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

            // envia em sequência (mais estável)
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                setUploadMsg(`Enviando ${i + 1}/${files.length}: ${f.name}`);
                await uploadPurchaseCapture(id, f);
            }

            setUploadMsg('Upload concluído ✅.');
            await load({ silent: true });
            setTab('pendentes');
        } catch {
            setUploadMsg('Erro ao enviar uma ou mais fotos');
        } finally {
            setUploading(false);
            // limpa input
            if (fileRef.current) fileRef.current.value = '';
        }
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        void handleUpload(e.dataTransfer.files);
    }

    const headerTitle = batch?.title?.trim() ? batch.title : 'Compra sem título';

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
                </div>
            </div>

            {loading ? <div className='text-sm text-slate-600'>Carregando...</div> : null}

            {error ? (
                <div className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>{error}</div>
            ) : null}

            {!loading && !error && batch && report ? (
                <>
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
                            <div className='mt-1 text-xs text-slate-600'>Dica: você pode selecionar várias fotos de uma vez.</div>

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
                                    <div className='text-xs text-slate-600'>Margem global</div>
                                    <div className='text-base font-semibold text-slate-900'>
                                        {report.summary.defaultMarkupPercent === null
                                            ? 'Não definida'
                                            : `${report.summary.defaultMarkupPercent}%`}
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
                                            </div>
                                            <div className='p-2'>
                                                <div className='text-xs text-slate-700'>Clique para finalizar</div>
                                                <div className='mt-1 text-[11px] text-slate-500'>ID: {c.id.slice(0, 8)}…</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {finalized.length > 0 ? (
                                <div className='mt-5 text-xs text-slate-600'>
                                    Fotos já finalizadas: <b className='text-slate-900'>{finalized.length}</b>
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
                                                    {captureByItemId.get(row.itemId) ? (
                                                        <div className='mt-3 flex flex-wrap gap-2'>
                                                            <Link
                                                                to={`/compras/${id}/captures/${captureByItemId.get(row.itemId)?.id}`}
                                                                className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-sm'
                                                            >
                                                                <Icon name='edit' className='h-4 w-4' />
                                                                Editar captura
                                                            </Link>
                                                        </div>
                                                    ) : (
                                                        <div className='mt-3 text-[11px] text-slate-500'>Captura não localizada para edição.</div>
                                                    )}
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
