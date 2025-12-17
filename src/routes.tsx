import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ItemsListPage from './pages/Items/List';
import CreateItemPage from './pages/Items/Create';
import NotFoundPage from './pages/NotFound';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        children: [
            { index: true, element: <ItemsListPage /> },
            { path: 'items', element: <ItemsListPage /> },
            { path: 'items/new', element: <CreateItemPage /> },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);
