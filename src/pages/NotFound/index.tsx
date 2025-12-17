import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <div className='space-y-2'>
            <h1 className='text-2xl font-semibold'>Not Found</h1>
            <Link to='/' className='text-sm underline'>
                Go home
            </Link>
        </div>
    );
}
