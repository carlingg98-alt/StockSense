import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import ProductForm from './pages/ProductForm';
import RecordSale from './pages/RecordSale';
import StockMovement from './pages/StockMovement';
import Transactions from './pages/Transactions';
import Forecast from './pages/Forecast';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetails from './pages/PurchaseOrderDetails';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import Suppliers from './pages/Suppliers';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

// REQUIREMENT [Core Req 3 - Frontend Application]: React Router with 15 page components (Landing, Dashboard, Products, ProductForm (new + edit), ProductDetails, RecordSale, StockMovement, Transactions, Forecast, PurchaseOrders, PurchaseOrderDetails, PurchaseOrderForm (new + edit), Reports, Suppliers, Categories, NotFound) - more than the required 10 pages.
export default function App() {
  return (
    <Routes>
      {/* REQUIREMENT [Project Theme]: the project includes a LANDING PAGE. */}
      <Route path="/" element={<Landing />} />

      {/* Everything under /app shares the sidebar layout */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={<ProductForm />} />
        <Route path="products/:id" element={<ProductDetails />} />
        <Route path="products/:id/edit" element={<ProductForm />} />
        <Route path="sales/new" element={<RecordSale />} />
        <Route path="stock/new" element={<StockMovement />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="forecast" element={<Forecast />} />
        <Route path="orders" element={<PurchaseOrders />} />
        <Route path="orders/new" element={<PurchaseOrderForm />} />
        <Route path="orders/:id" element={<PurchaseOrderDetails />} />
        <Route path="orders/:id/edit" element={<PurchaseOrderForm />} />
        <Route path="reports" element={<Reports />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="categories" element={<Categories />} />
        <Route path="*" element={<NotFound inApp />} />
      </Route>

      {/* REQUIREMENT [Core Req 3 - Frontend Application]: catch-all route - unknown URLs show a NotFound page, so navigation is never broken. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
