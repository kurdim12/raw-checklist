import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './routes/RequireAuth';
import { LoginRoute } from './routes/Login';
import { ChangePasswordRoute } from './routes/ChangePassword';
import { HomeRoute } from './routes/Home';
import { ChecklistRoute } from './routes/Checklist';
import { ChecklistIndexRoute } from './routes/ChecklistIndex';
import { InventoryRoute } from './routes/Inventory';
import { InventoryLogRoute } from './routes/InventoryLog';
import { OrdersRoute } from './routes/Orders';
import { ScheduleRoute } from './routes/Schedule';
import { AdminRoute } from './routes/Admin';
import { ProfileRoute } from './routes/Profile';
import { RecipesRoute } from './routes/Recipes';
import { RecipeDetailRoute } from './routes/RecipeDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordRoute />
          </RequireAuth>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRoute />} />
        <Route path="checklist" element={<ChecklistIndexRoute />} />
        <Route path="checklist/today/:shift" element={<ChecklistRoute />} />
        <Route path="inventory" element={<InventoryRoute />} />
        <Route path="inventory/log" element={<InventoryLogRoute />} />
        <Route path="orders" element={<OrdersRoute />} />
        <Route path="schedule" element={<ScheduleRoute />} />
        <Route path="admin" element={<AdminRoute />} />
        <Route path="profile" element={<ProfileRoute />} />
        <Route path="recipes" element={<RecipesRoute />} />
        <Route path="recipes/:code" element={<RecipeDetailRoute />} />
      </Route>
    </Routes>
  );
}
