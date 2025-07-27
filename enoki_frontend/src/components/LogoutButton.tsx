import { useNavigate } from 'react-router-dom';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';

function LogoutButton() {
  const account = useCurrentAccount();
  const disconnectWallet = useDisconnectWallet();
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectWallet.mutate();
    navigate('/login');
  };

  if (!account) return null;

  return <button onClick={handleLogout}>Logout</button>;
}

export default LogoutButton;
