import { Link, Outlet, NavLink } from 'react-router-dom';
import { Icon } from '../Icon';

function navClass(isActive: boolean) {
    return [
        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-white',
        isActive
            ? 'bg-white text-slate-900 shadow-md shadow-slate-200 border border-slate-200'
            : 'text-slate-700 border border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:bg-slate-50',
    ].join(' ');
}

export default function AppLayout() {
    return (
        <div className='min-h-screen bg-transparent text-slate-900'>
            <header className='sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 backdrop-blur'>
                <div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                    {/* Brand */}
                    <Link to='/' className='flex items-center gap-3'>
                        <div className='grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-white text-slate-900 shadow-md shadow-slate-200'>
                            <Icon name='logo' className='h-6 w-6' />
                        </div>
                        <div className='leading-tight'>
                            <div className='text-lg font-semibold tracking-tight text-slate-900'>Precifica</div>
                            <div className='text-[11px] uppercase text-slate-500'>Compras, fotos e precificação</div>
                        </div>
                    </Link>

                    {/* Nav */}
                    <nav className='flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1 shadow-md shadow-slate-200/60'>
                        <NavLink to='/compras' className={({ isActive }) => navClass(isActive)}>
                            <Icon name='cart' className='h-4 w-4' />
                            Compras
                        </NavLink>

                        <NavLink to='/compras/nova' className={({ isActive }) => navClass(isActive)}>
                            <Icon name='plus' className='h-4 w-4' />
                            Nova compra
                        </NavLink>

                        <div className='h-6 w-px bg-slate-800' />

                        <NavLink to='/items' className={({ isActive }) => navClass(isActive)}>
                            <Icon name='box' className='h-4 w-4' />
                            Itens
                        </NavLink>

                        <NavLink to='/items/new' className={({ isActive }) => navClass(isActive)}>
                            <Icon name='sparkle' className='h-4 w-4' />
                            Novo item
                        </NavLink>
                    </nav>
                </div>
            </header>

            <main className='mx-auto max-w-6xl px-4 py-8'>
                <Outlet />
            </main>

            <footer className='border-t border-slate-200 bg-white/90'>
                <div className='mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500'>
                    Precifica © {new Date().getFullYear()} — pensado para catálogos rápidos
                </div>
            </footer>
        </div>
    );
}
