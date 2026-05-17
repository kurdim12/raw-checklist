import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './routes/RequireAuth';
import { LoginRoute } from './routes/Login';
import { HomeRoute } from './routes/Home';
import {
  ChecklistIndexRoute,
  InventoryRoute,
  InventoryLogRoute,
  OrdersRoute,
  ScheduleRoute,
  AdminRoute,
  ProfileRoute,
} from './routes/stubs';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route path="checklist" element={<ChecklistIndexRoute />} />
        <Route path="checklist/today/:shift" element={<ChecklistIndexRoute />} />
        <Route path="inventory" element={<InventoryRoute />} />
        <Route path="inventory/log" element={<InventoryLogRoute />} />
        <Route path="orders" element={<OrdersRoute />} />
        <Route path="schedule" element={<ScheduleRoute />} />
        <Route path="admin" element={<AdminRoute />} />
        <Route path="profile" element={<ProfileRoute />} />
      </Route>
    </Routes>
  );
}
