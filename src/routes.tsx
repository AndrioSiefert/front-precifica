import { createBrowserRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ItemsListPage from './pages/Items/List';
import CreateItemPage from './pages/Items/Create';
import NotFoundPage from './pages/NotFound';
import PurchasesListPage from './pages/Purchases/List';
import NewPurchaseBatchPage from './pages/Purchases/New';
import PurchaseBatchPage from './pages/Purchases/Batch';
import FinalizePurchaseCapturePage from './pages/Purchases/Finalize';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        children: [
            { index: true, element: <PurchasesListPage /> },
            { path: 'compras', element: <PurchasesListPage /> },
            { path: 'compras/nova', element: <NewPurchaseBatchPage /> },
            { path: 'compras/:batchId', element: <PurchaseBatchPage /> },
            { path: 'compras/:batchId/captures/:captureId', element: <FinalizePurchaseCapturePage /> },
            { path: 'items', element: <ItemsListPage /> },
            { path: 'items/new', element: <CreateItemPage /> },
            { path: '*', element: <NotFoundPage /> },
        ],
    },
]);
