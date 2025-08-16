import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import RoleProtectedRoute from "../components/auth/RoleProtectedRoute";

// Pages
import Home from "../pages/Home";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/Dashboard";
import AuctionList from "../pages/auctions/AuctionList";
import AuctionDetail from "../pages/auctions/AuctionDetail";
import CreateAuction from "../pages/auctions/CreateAuction";
import MyAuctions from "../pages/auctions/MyAuctions";
import MyBids from "../pages/bids/MyBids";
import Profile from "../pages/Profile";
import AdminPanel from "../pages/admin/AdminPanel";
import NotFound from "../pages/NotFound";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />}>
      {/* Public routes */}
      <Route index element={<Home />} />
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="auctions" element={<AuctionList />} />
      <Route path="auctions/:id" element={<AuctionDetail />} />

      {/* Protected routes */}
      <Route
        path="dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="auctions/create"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["seller", "admin"]}>
              <CreateAuction />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="my-auctions"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["seller", "admin"]}>
              <MyAuctions />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="my-bids"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["buyer", "admin"]}>
              <MyBids />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="admin"
        element={
          <ProtectedRoute>
            <RoleProtectedRoute allowedRoles={["admin"]}>
              <AdminPanel />
            </RoleProtectedRoute>
          </ProtectedRoute>
        }
      />

      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Route>
  )
);
