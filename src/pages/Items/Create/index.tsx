import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createItem } from '../../../http/item';

type LastEdited = 'markup' | 'sale' | null;

type FormState = {
    name: string;
    costUnit: string;
    quantity: string;
    purchasedAt: string;
    markupOverridePercent: string;
    saleUnitManual: string;
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

export default function CreateItemPage() {
    const [form, setForm] = useState<FormState>({
        name: '',
        costUnit: '',
        quantity: '',
        purchasedAt: '',
        markupOverridePercent: '',
        saleUnitManual: '',
    });

    const [lastEdited, setLastEdited] = useState<LastEdited>(null);

    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

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
                    <h1 className='text-2xl font-semibold'>Cadastrar item</h1>
                    <p className='text-sm text-gray-600'>
                        Envia para <b>POST /items</b> (com foto opcional).
                    </p>
                </div>

                <Link to='/items' className='text-sm underline text-gray-700 hover:text-black'>
                    Ver itens cadastrados
                </Link>
            </div>

            <form onSubmit={handleSubmit} className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <div className='rounded-2xl border bg-white p-4 shadow-sm'>
                    <div className='flex items-center justify-between'>
                        <h2 className='text-base font-semibold'>Foto do item</h2>
                        {photo ? (
                            <button
                                type='button'
                                onClick={() => setPhoto(null)}
                                className='text-xs underline text-gray-600 hover:text-black'
                            >
                                Remover foto
                            </button>
                        ) : null}
                    </div>

                    <div
                        className='mt-3 rounded-xl border border-dashed bg-gray-50 p-4'
                        onDrop={handleDrop}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                    >
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                            <div className='h-40 w-full overflow-hidden rounded-xl border bg-white sm:h-44 sm:w-44'>
                                {photoPreviewUrl ? (
                                    <img
                                        src={photoPreviewUrl}
                                        alt='Pré-visualização'
                                        className='h-full w-full object-cover'
                                    />
                                ) : (
                                    <div className='flex h-full w-full items-center justify-center text-xs text-gray-500'>
                                        Sem foto
                                    </div>
                                )}
                            </div>

                            <div className='flex-1 space-y-2'>
                                <p className='text-sm text-gray-700'>
                                    Arraste e solte uma imagem aqui, ou escolha um arquivo.
                                </p>

                                <div className='flex flex-wrap gap-2'>
                                    <button
                                        type='button'
                                        onClick={handlePickPhoto}
                                        className='rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90'
                                    >
                                        Escolher foto
                                    </button>

                                    <button
                                        type='button'
                                        onClick={() => setPhoto(null)}
                                        className='rounded-lg border px-4 py-2 text-sm hover:bg-gray-50'
                                        disabled={!photo}
                                    >
                                        Limpar
                                    </button>
                                </div>

                                {photo ? (
                                    <p className='text-xs text-gray-600'>
                                        Arquivo: <b>{photo.name}</b> ({Math.round(photo.size / 1024)} KB)
                                    </p>
                                ) : (
                                    <p className='text-xs text-gray-500'>Formatos comuns: JPG, PNG, WEBP.</p>
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

                <div className='rounded-2xl border bg-white p-4 shadow-sm'>
                    <h2 className='text-base font-semibold'>Informações</h2>

                    <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                        <div className='sm:col-span-2'>
                            <label className='block text-xs text-gray-600'>Nome do item *</label>
                            <input
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='Ex: Saia, Camiseta, Calça...'
                                required
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-gray-600'>Custo por unidade (R$)</label>
                            <input
                                value={form.costUnit}
                                onChange={(e) => set('costUnit', e.target.value)}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='Ex: 2,50'
                                inputMode='decimal'
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-gray-600'>Quantidade</label>
                            <input
                                value={form.quantity}
                                onChange={(e) => set('quantity', e.target.value)}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='Ex: 5'
                                inputMode='numeric'
                            />
                        </div>

                        <div>
                            <label className='block text-xs text-gray-600'>Margem (override) %</label>
                            <input
                                value={form.markupOverridePercent}
                                onChange={(e) => {
                                    setLastEdited('markup');
                                    set('markupOverridePercent', e.target.value);
                                    if (form.saleUnitManual) set('saleUnitManual', ''); // ✅ evita conflito
                                }}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='Ex: 150'
                                inputMode='decimal'
                            />
                            <p className='mt-1 text-[11px] text-gray-500'>
                                Se preencher margem, o preço manual é ignorado.
                            </p>
                        </div>

                        <div>
                            <label className='block text-xs text-gray-600'>Preço de venda manual (R$)</label>
                            <input
                                value={form.saleUnitManual}
                                onChange={(e) => {
                                    setLastEdited('sale');
                                    set('saleUnitManual', e.target.value);
                                    if (form.markupOverridePercent) set('markupOverridePercent', ''); // ✅ evita conflito
                                }}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                placeholder='Ex: 19,90'
                                inputMode='decimal'
                            />
                            <p className='mt-1 text-[11px] text-gray-500'>
                                Se preencher preço manual, a margem é recalculada automaticamente.
                            </p>
                        </div>

                        <div className='sm:col-span-2'>
                            <label className='block text-xs text-gray-600'>Data e hora da compra</label>
                            <input
                                value={form.purchasedAt}
                                onChange={(e) => set('purchasedAt', e.target.value)}
                                className='mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring'
                                type='datetime-local'
                            />
                        </div>

                        <div className='sm:col-span-2 rounded-xl border bg-gray-50 p-3'>
                            <div className='text-xs text-gray-600'>Resumo</div>
                            <div className='mt-1 text-sm text-gray-900'>
                                Custo total:{' '}
                                <b>
                                    {computedTotalCost === null
                                        ? '-'
                                        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                              computedTotalCost,
                                          )}
                                </b>
                            </div>
                        </div>
                    </div>

                    {error ? (
                        <div className='mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700'>
                            {error}
                        </div>
                    ) : null}

                    {created ? (
                        <div className='mt-3 rounded-lg border border-green-300 bg-green-50 p-3'>
                            <div className='text-sm font-semibold text-green-800'>Item cadastrado com sucesso ✅</div>
                            <div className='mt-2 text-sm text-green-900'>
                                <b>{created?.name ?? 'Item'}</b>
                            </div>
                            <div className='mt-2 flex flex-wrap gap-2'>
                                <Link to='/items' className='rounded-lg bg-black px-4 py-2 text-sm text-white'>
                                    Ir para listagem
                                </Link>
                                {created?.photoUrl ? (
                                    <a
                                        href={created.photoUrl}
                                        target='_blank'
                                        rel='noreferrer'
                                        className='rounded-lg border px-4 py-2 text-sm hover:bg-white'
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
                            className='rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-60'
                            type='submit'
                        >
                            {loading ? 'Salvando...' : 'Cadastrar'}
                        </button>

                        <button
                            type='button'
                            className='rounded-lg border px-4 py-2 text-sm hover:bg-gray-50'
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
                                });
                                setLastEdited(null);
                                setPhoto(null);
                            }}
                            disabled={loading}
                        >
                            Limpar formulário
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
