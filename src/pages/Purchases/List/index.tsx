import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { listPurchaseBatches, purchaseReportPdfUrl, type PurchaseBatch } from '../../../http/purchase';

function formatDateBR(iso: string) {
    // iso: YYYY-MM-DD
    const [y, m, d] = (iso ?? '').split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

export default function PurchasesListPage() {
    const [batches, setBatches] = useState<PurchaseBatch[]>([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load(opts?: { silent?: boolean }) {
        const silent = opts?.silent ?? false;
        try {
            setError(null);
            if (!silent) setLoading(true);
            if (silent) setRefreshing(true);

            const data = await listPurchaseBatches();
            // mais recente primeiro (purchasedOn desc)
            const sorted = [...data].sort((a, b) => (a.purchasedOn < b.purchasedOn ? 1 : -1));
            setBatches(sorted);
        } catch {
            setError('Erro ao carregar compras');
        } finally {
            if (!silent) setLoading(false);
            if (silent) setRefreshing(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return batches;

        return batches.filter((b) => {
            const hay = `${b.purchasedOn} ${b.title ?? ''} ${b.notes ?? ''} ${b.id}`.toLowerCase();
            return hay.includes(qq);
        });
    }, [batches, q]);

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                    <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase text-slate-600 shadow-sm'>
                        <Icon name='cart' className='h-3.5 w-3.5' /> Compras
                    </div>
                    <h1 className='mt-2 text-3xl font-semibold text-slate-900 tracking-tight'>Lotes e fotos</h1>
                    <p className='text-sm text-slate-600'>
                        Crie uma compra, envie fotos e finalize para virar item. Visual renovado para navegar rápido em listas longas.
                    </p>
                </div>

                <div className='flex gap-2'>
                    <button
                        onClick={() => load({ silent: true })}
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 shadow-sm'
                        type='button'
                        disabled={refreshing}
                        title='Recarregar'
                    >
                        <Icon name='refresh' className='h-4 w-4' />
                        {refreshing ? 'Atualizando...' : 'Atualizar'}
                    </button>

                    <Link
                        to='/compras/nova'
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                    >
                        <Icon name='plus' className='h-4 w-4' />
                        Nova compra
                    </Link>
                </div>
            </div>

            <div className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
                    <div className='w-full max-w-xl'>
                        <label className='block text-xs text-slate-500'>Buscar</label>
                        <div className='mt-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-inner shadow-slate-100'>
                            <Icon name='search' className='h-4 w-4 text-slate-400' />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                className='w-full bg-transparent py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400'
                                placeholder='data, título, observação, id...'
                            />
                        </div>
                    </div>
                    <div className='text-sm text-slate-600'>
                        Mostrando <b className='text-slate-900'>{filtered.length}</b> de <b className='text-slate-900'>{batches.length}</b>
                    </div>
                </div>
            </div>

            {loading ? <div className='text-sm text-slate-600'>Carregando...</div> : null}

            {error ? (
                <div className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>{error}</div>
            ) : null}

            {!loading && !error && filtered.length === 0 ? (
                <div className='text-sm text-slate-600'>Nenhuma compra encontrada.</div>
            ) : null}

            <div className='grid grid-cols-1 gap-4'>
                {filtered.map((b) => (
                    <div key={b.id} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='min-w-0 space-y-2'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <span className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700'>
                                        <Icon name='calendar' className='h-4 w-4' />
                                        {formatDateBR(b.purchasedOn)}
                                    </span>
                                    <h2 className='truncate text-lg font-semibold text-slate-900'>
                                        {b.title?.trim() ? b.title : 'Compra sem título'}
                                    </h2>
                                </div>

                                {b.notes?.trim() ? (
                                    <p className='text-sm text-slate-700'>{b.notes}</p>
                                ) : (
                                    <p className='text-sm text-slate-500'>Sem observações</p>
                                )}

                                <p className='text-xs text-slate-500'>ID: {b.id}</p>
                            </div>

                            <div className='flex flex-wrap gap-2 sm:justify-end'>
                                <Link
                                    to={`/compras/${b.id}`}
                                    className='inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                                >
                                    <Icon name='eye' className='h-4 w-4' />
                                    Abrir
                                </Link>

                                <a
                                    href={purchaseReportPdfUrl(b.id)}
                                    className='inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                    target='_blank'
                                    rel='noreferrer'
                                >
                                    <Icon name='pdf' className='h-4 w-4' />
                                    PDF
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
