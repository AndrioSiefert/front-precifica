import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { createPurchaseBatch } from '../../../http/purchase';

type FormState = {
    purchasedOn: string; // YYYY-MM-DD
    title: string;
    notes: string;
};

export default function NewPurchaseBatchPage() {
    const nav = useNavigate();

    const [form, setForm] = useState<FormState>({
        purchasedOn: '',
        title: '',
        notes: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!form.purchasedOn.trim()) {
            setError('Informe a data da compra.');
            return;
        }

        try {
            setLoading(true);
            const batch = await createPurchaseBatch({
                purchasedOn: form.purchasedOn.trim(),
                title: form.title.trim() ? form.title.trim() : null,
                notes: form.notes.trim() ? form.notes.trim() : null,
            });
            nav(`/compras/${batch.id}`);
        } catch {
            setError('Erro ao criar compra');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='space-y-5'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                    <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase text-slate-600 shadow-sm'>
                        <Icon name='cart' className='h-3.5 w-3.5' /> Nova compra
                    </div>
                    <h1 className='mt-2 text-3xl font-semibold text-slate-900 tracking-tight'>Criar lote</h1>
                    <p className='text-sm text-slate-600'>Crie a pasta do dia (ex.: 10/01/2026) e depois envie as fotos.</p>
                </div>

                <Link to='/compras' className='inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900'>
                    <Icon name='back' className='h-4 w-4' />
                    Voltar
                </Link>
            </div>

            {error ? (
                <div className='rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>{error}</div>
            ) : null}

            <form onSubmit={handleSubmit} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    <div>
                        <label className='block text-xs text-slate-500'>Data da compra *</label>
                        <input
                            type='date'
                            value={form.purchasedOn}
                            onChange={(e) => set('purchasedOn', e.target.value)}
                            className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                            required
                        />
                        <p className='mt-1 text-xs text-slate-500'>Essa data será aplicada em todos os itens finalizados deste lote.</p>
                    </div>

                    <div>
                        <label className='block text-xs text-slate-500'>Título</label>
                        <input
                            value={form.title}
                            onChange={(e) => set('title', e.target.value)}
                            className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                            placeholder='Ex: SP Janeiro, Feirão, Outlet...'
                        />
                    </div>

                    <div className='sm:col-span-2'>
                        <label className='block text-xs text-slate-500'>Observações</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => set('notes', e.target.value)}
                            className='mt-1 min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                            placeholder='Ex: fornecedor, cidade, detalhes...'
                        />
                    </div>
                </div>

                <div className='mt-4 flex flex-wrap gap-2'>
                    <button
                        type='submit'
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300 disabled:opacity-60'
                        disabled={loading}
                    >
                        <Icon name='plus' className='h-4 w-4' />
                        {loading ? 'Criando...' : 'Criar compra'}
                    </button>
                    <Link
                        to='/compras'
                        className='inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                    >
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
    );
}
