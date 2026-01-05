import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/Icon';
import { createItem } from '../../../http/item';
import { listPurchaseBatches, type PurchaseBatch } from '../../../http/purchase';

type LastEdited = 'markup' | 'sale' | null;

type FormState = {
    name: string;
    costUnit: string;
    quantity: string;
    purchasedAt: string;
    markupOverridePercent: string;
    saleUnitManual: string;
    batchId: string;
};

function toNumberOrUndefined(v: string) {
    const s = v.trim().replace(',', '.');
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

function toISOOrUndefined(datetimeLocal: string) {
    const s = datetimeLocal.trim();
    if (!s) return undefined;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
}

function formatDateBR(iso: string) {
    const [y, m, d] = (iso ?? '').split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
}

export default function CreateItemPage() {
    const [form, setForm] = useState<FormState>({
        name: '',
        costUnit: '',
        quantity: '',
        purchasedAt: '',
        markupOverridePercent: '',
        saleUnitManual: '',
        batchId: '',
    });

    const [lastEdited, setLastEdited] = useState<LastEdited>(null);

    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [batches, setBatches] = useState<PurchaseBatch[]>([]);
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [batchError, setBatchError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!photo) {
            setPhotoPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(photo);
        setPhotoPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [photo]);

    useEffect(() => {
        async function loadBatches() {
            try {
                setBatchError(null);
                setLoadingBatches(true);
                const data = await listPurchaseBatches();
                const sorted = Array.isArray(data)
                    ? [...data].sort((a, b) => (a.purchasedOn < b.purchasedOn ? 1 : -1))
                    : [];
                setBatches(sorted);
            } catch {
                setBatchError('Erro ao carregar pastas');
            } finally {
                setLoadingBatches(false);
            }
        }

        loadBatches();
    }, []);

    function set<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    const computedTotalCost = useMemo(() => {
        const cost = toNumberOrUndefined(form.costUnit);
        const qty = toNumberOrUndefined(form.quantity);
        if (cost === undefined || qty === undefined) return null;
        return cost * qty;
    }, [form.costUnit, form.quantity]);

    function handlePickPhoto() {
        fileInputRef.current?.click();
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        const f = e.dataTransfer.files?.[0];
        if (f) setPhoto(f);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setCreated(null);

        if (!form.name.trim()) {
            setError('Informe o nome do item.');
            return;
        }

        const markup = toNumberOrUndefined(form.markupOverridePercent);
        const sale = toNumberOrUndefined(form.saleUnitManual);

        const updatedField = lastEdited ?? (sale !== undefined ? 'sale' : markup !== undefined ? 'markup' : undefined);

        const dto: Record<string, any> = {
            name: form.name.trim(),
            costUnit: toNumberOrUndefined(form.costUnit),
            quantity: toNumberOrUndefined(form.quantity),
            purchasedAt: toISOOrUndefined(form.purchasedAt),
            markupOverridePercent: markup,
            saleUnitManual: sale,
            updatedField,
            batchId: form.batchId.trim() || undefined,
        };

        Object.keys(dto).forEach((k) => dto[k] === undefined && delete dto[k]);

        try {
            setLoading(true);
            const res = await createItem(dto, photo);
            setCreated(res);

            setForm({
                name: '',
                costUnit: '',
                quantity: '',
                purchasedAt: '',
                markupOverridePercent: '',
                saleUnitManual: '',
                batchId: '',
            });
            setLastEdited(null);
            setPhoto(null);
        } catch {
            setError('Erro ao cadastrar item');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className='space-y-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                    <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase text-slate-600 shadow-sm'>
                        <Icon name='sparkle' className='h-3.5 w-3.5' /> Cadastrar item
                    </div>
                    <h1 className='mt-2 text-3xl font-semibold text-slate-900 tracking-tight'>Novo item</h1>
                    <p className='text-sm text-slate-600'>Envia para <b>POST /items</b> (com foto opcional).</p>
                </div>

                <Link to='/items' className='inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900'>
                    <Icon name='list' className='h-4 w-4' />
                    Ver itens cadastrados
                </Link>
            </div>

            <form onSubmit={handleSubmit} className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60'>
                    <div className='flex items-center justify-between'>
                        <h2 className='text-base font-semibold text-slate-900'>Foto do item</h2>
                        {photo ? (
                            <button
                                type='button'
                                onClick={() => setPhoto(null)}
                                className='text-xs text-slate-600 underline hover:text-slate-900'
                            >
                                Remover foto
                            </button>
                        ) : null}
                    </div>

                    <div
                        className='mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4'
                        onDrop={handleDrop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                            <div className='h-40 w-full overflow-hidden rounded-xl border border-slate-200 bg-white sm:h-44 sm:w-44'>
                                {photoPreviewUrl ? (
                                    <img src={photoPreviewUrl} alt='Pré-visualização' className='h-full w-full object-cover' />
                                ) : (
                                    <div className='flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-slate-500'>
                                        <Icon name='camera' className='h-5 w-5' />
                                        Sem foto
                                    </div>
                                )}
                            </div>

                            <div className='flex-1 space-y-2'>
                                <p className='text-sm text-slate-700'>Arraste e solte uma imagem aqui, ou escolha um arquivo.</p>

                                <div className='flex flex-wrap gap-2'>
                                    <button
                                        type='button'
                                        onClick={handlePickPhoto}
                                        className='inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                                    >
                                        <Icon name='upload' className='h-4 w-4' />
                                        Escolher foto
                                    </button>

                                    <button
                                        type='button'
                                        onClick={() => setPhoto(null)}
                                        className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                        disabled={!photo}
                                    >
                                        Limpar
                                    </button>
                                </div>

                                {photo ? (
                                    <p className='text-xs text-slate-600'>
                                        Arquivo: <b className='text-slate-900'>{photo.name}</b> ({Math.round(photo.size / 1024)} KB)
                                    </p>
                                ) : (
                                    <p className='text-xs text-slate-500'>Formatos comuns: JPG, PNG, WEBP.</p>
                                )}
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='image/*'
                            className='hidden'
                            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                        />
                    </div>
                </div>

                <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/60'>
                    <h2 className='text-base font-semibold text-slate-900'>Informações</h2>

                    <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <label className='block text-xs text-slate-500'>Nome do item *</label>
                            <input
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                placeholder='Ex: Saia, Camiseta, Calca...'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-slate-500'>Custo por unidade (R$)</label>
                            <input
                                value={form.costUnit}
                                onChange={(e) => set('costUnit', e.target.value)}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                placeholder='Ex: 2,50'
                                inputMode='decimal'
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-slate-500'>Quantidade</label>
                            <input
                                value={form.quantity}
                                onChange={(e) => set('quantity', e.target.value)}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                placeholder='Ex: 5'
                                inputMode='numeric'
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-slate-500'>Margem (override) %</label>
                            <input
                                value={form.markupOverridePercent}
                                onChange={(e) => {
                                    setLastEdited('markup');
                                    set('markupOverridePercent', e.target.value);
                                    if (form.saleUnitManual) set('saleUnitManual', '');
                                }}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                placeholder='Ex: 150'
                                inputMode='decimal'
                            />
                            <p className='mt-1 text-[11px] text-slate-500'>Se preencher margem, o preço manual é ignorado.</p>
                        </div>

                        <div>
                            <label className='block text-xs text-slate-500'>Preco de venda manual (R$)</label>
                            <input
                                value={form.saleUnitManual}
                                onChange={(e) => {
                                    setLastEdited('sale');
                                    set('saleUnitManual', e.target.value);
                                    if (form.markupOverridePercent) set('markupOverridePercent', '');
                                }}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                placeholder='Ex: 19,90'
                                inputMode='decimal'
                            />
                            <p className='mt-1 text-[11px] text-slate-500'>Se preencher preço manual, a margem é recalculada automaticamente.</p>
                        </div>

                        <div className='sm:col-span-2'>
                            <label className='block text-xs text-slate-500'>Pasta (opcional)</label>
                            <select
                                value={form.batchId}
                                onChange={(e) => set('batchId', e.target.value)}
                                disabled={loadingBatches}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                            >
                                <option value=''>Sem pasta</option>
                                {batches.map((b) => {
                                    const title = b.title?.trim() ? b.title : formatDateBR(b.purchasedOn);
                                    return (
                                        <option key={b.id} value={b.id}>
                                            {title} • {formatDateBR(b.purchasedOn)}
                                        </option>
                                    );
                                })}
                            </select>
                            <p className='mt-1 text-[11px] text-slate-600'>
                                Margem da pasta vale so para ela. Itens em GLOBAL usam essa margem; se a pasta estiver sem margem, usam a margem global.
                            </p>
                            {batchError ? (
                                <div className='mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700'>
                                    {batchError}
                                </div>
                            ) : null}
                        </div>

                        <div className='sm:col-span-2'>
                            <label className='block text-xs text-slate-500'>Data e hora da compra</label>
                            <input
                                value={form.purchasedAt}
                                onChange={(e) => set('purchasedAt', e.target.value)}
                                className='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring'
                                type='datetime-local'
                            />
                        </div>

                        <div className='sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3'>
                            <div className='text-xs text-slate-500'>Resumo</div>
                            <div className='mt-1 text-sm text-slate-900'>
                                Custo total:{' '}
                                <b>
                                    {computedTotalCost === null
                                        ? '-'
                                        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(computedTotalCost)}
                                </b>
                            </div>
                        </div>
                    </div>

                    {error ? (
                        <div className='mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>
                            {error}
                        </div>
                    ) : null}

                    {created ? (
                        <div className='mt-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3'>
                            <div className='text-sm font-semibold text-emerald-800'>Item cadastrado com sucesso :)</div>
                            <div className='mt-2 text-sm text-slate-900'>
                                <b>{created?.name ?? 'Item'}</b>
                            </div>
                            <div className='mt-2 flex flex-wrap gap-2'>
                                <Link
                                    to='/items'
                                    className='rounded-xl border border-slate-300 bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-300'
                                >
                                    Ir para listagem
                                </Link>
                                {created?.photoUrl ? (
                                    <a
                                        href={created.photoUrl}
                                        target='_blank'
                                        rel='noreferrer'
                                        className='rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                    >
                                        Abrir foto
                                    </a>
                                ) : null}
                            </div>
                        </div>
                    ) : null}

                    <div className='mt-4 flex gap-2'>
                        <button
                            disabled={loading}
                            className='inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm disabled:opacity-60 hover:bg-slate-300'
                            type='submit'
                        >
                            {loading ? 'Salvando...' : 'Cadastrar'}
                        </button>

                        <button
                            type='button'
                            className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
                            onClick={() => {
                                setError(null);
                                setCreated(null);
                                setForm({
                                    name: '',
                                    costUnit: '',
                                    quantity: '',
                                    purchasedAt: '',
                                    markupOverridePercent: '',
                                    saleUnitManual: '',
                                    batchId: '',
                                });
                                setLastEdited(null);
                                setPhoto(null);
                            }}
                            disabled={loading}
                        >
                            Limpar formulario
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
