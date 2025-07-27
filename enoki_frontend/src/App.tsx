import {
	createNetworkConfig,
	SuiClientProvider,
	// useSuiClientContext,
	WalletProvider,
} from '@mysten/dapp-kit';
import './App.css'
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegisterEnokiWallets from './components/RegisterEnokiWallets';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';

const {networkConfig} = createNetworkConfig({
  testnet: {url: getFullnodeUrl('testnet')},
  mainnet: {url: getFullnodeUrl('mainnet')},
});

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
		<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
			<RegisterEnokiWallets />
			<WalletProvider autoConnect>
				<BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </BrowserRouter>
			</WalletProvider>
		</SuiClientProvider>
  </QueryClientProvider>
	);
}

export default App
