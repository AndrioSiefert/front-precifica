import { Link, Outlet, NavLink } from 'react-router-dom';

function navClass(isActive: boolean) {
    return [
        'rounded-xl px-3 py-2 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-black/10',
        isActive ? 'bg-black text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:text-black',
    ].join(' ');
}

export default function AppLayout() {
    return (
        <div className='min-h-screen bg-gray-50 text-gray-900'>
            <header className='sticky top-0 z-50 border-b bg-white/80 backdrop-blur'>
                <div className='mx-auto flex max-w-5xl items-center justify-between px-4 py-3'>
                    {/* Brand */}
                    <Link to='/' className='flex items-center gap-3'>
                        <div className='grid h-9 w-9 place-items-center rounded-2xl bg-black text-white shadow-sm'>
                            P
                        </div>
                        <div className='leading-tight'>
                            <div className='text-base font-semibold'>Precifica</div>
                            <div className='text-xs text-gray-500'>Cadastro e visualização</div>
                        </div>
                    </Link>

                    {/* Nav */}
                    <nav className='flex items-center gap-2 rounded-2xl border bg-white p-1 shadow-sm'>
                        <NavLink to='/items' className={({ isActive }) => navClass(isActive)}>
                            Itens
                        </NavLink>

                        <NavLink to='/items/new' className={({ isActive }) => navClass(isActive)}>
                            Criar
                        </NavLink>
                    </nav>
                </div>
            </header>

            <main className='mx-auto max-w-5xl px-4 py-6'>
                <Outlet />
            </main>

            <footer className='border-t bg-white'>
                <div className='mx-auto max-w-5xl px-4 py-4 text-xs text-gray-500'>
                    Precifica • {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
}
