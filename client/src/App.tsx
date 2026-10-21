import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Admin from "@/pages/Admin";
import Account, { VerifyAccount } from "@/pages/Account";
import Checkout from "@/pages/Checkout";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import TrackOrder from "@/pages/TrackOrder";
import ProductDetail from "@/pages/ProductDetail";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/checkout" component={Checkout} />
    <Route path="/account" component={Account} />
    <Route path="/account/verify" component={VerifyAccount} />
    <Route path="/track" component={TrackOrder} />
    <Route path="/track/:orderNo" component={TrackOrder} />
    <Route path="/p/:serviceKey" component={ProductDetail} />
    <Route path="/product/:serviceKey" component={ProductDetail} />
    <Route path="/admin" component={Admin} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary>
    <ThemeProvider defaultTheme="light">
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Router />
        </CartProvider>
      </TooltipProvider>
    </ThemeProvider>
  </ErrorBoundary>;
}
