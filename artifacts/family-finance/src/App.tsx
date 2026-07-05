import { Route, Switch, Router as WouterRouter } from 'wouter';
import RoleSelector from './pages/role-selector';
import ParentDashboard from './pages/parent/dashboard';
import ChoreManager from './pages/parent/chores';
import FamilyExpenses from './pages/parent/expenses';
import ParentInsights from './pages/parent/insights';
import Allowances from './pages/allowances';
import TeenDashboard from './pages/teen/dashboard';
import TeenGoals from './pages/teen/goals';
import TeenSpending from './pages/teen/spending';
import KidDashboard from './pages/kid/dashboard';
import NotFound from './pages/not-found';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoleSelector} />
      <Route path="/parent" component={ParentDashboard} />
      <Route path="/parent/chores" component={ChoreManager} />
      <Route path="/parent/expenses" component={FamilyExpenses} />
      <Route path="/parent/insights" component={ParentInsights} />
      <Route path="/allowances" component={Allowances} />
      <Route path="/teen" component={TeenDashboard} />
      <Route path="/teen/goals" component={TeenGoals} />
      <Route path="/teen/spending" component={TeenSpending} />
      <Route path="/kid" component={KidDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
