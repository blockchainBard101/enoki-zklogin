import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Link } from "react-router-dom";
import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { BalanceComponent } from "../components/GetBalance";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { toBase64 } from "@mysten/sui/utils";

const BACKEND_URL = "http://localhost:3001";

async function getSuiCoin(
  tx: Transaction,
  owner: string,
  client: ReturnType<typeof useSuiClient>,
  amount: bigint
) {
  const clientRes = await client.getCoins({
    owner,
    coinType: "0x2::sui::SUI",
  });
  const coinObjects = clientRes?.data;
  if (!coinObjects.length) throw new Error("No coins");
  const totalBalance = coinObjects.reduce(
    (acc, coin) => acc + BigInt(coin.balance),
    0n
  );
  if (totalBalance < amount) {
    throw new Error("Insufficient SUI balance");
  }
  const primary = coinObjects[0].coinObjectId;
  if (coinObjects.length > 1) {
    const rest = coinObjects.slice(1).map((c) => c.coinObjectId);
    tx.mergeCoins(
      tx.object(primary),
      rest.map((id) => tx.object(id))
    );
  }
  const [sui_coin] = tx.splitCoins(primary, [amount]);
  // const sui_coin = tx.splitCoins(tx.gas, [amount]);
  return sui_coin;
}

async function sponsorAndExecute({
  tx,
  suiClient,
  signTransaction,
  currentAccount,
  allowedMoveCallTargets,
  allowedAddresses,
}: {
  tx: Transaction;
  suiClient: ReturnType<typeof useSuiClient>;
  signTransaction: ReturnType<typeof useSignTransaction>["mutateAsync"];
  currentAccount: any;
  allowedMoveCallTargets?: string[];
  allowedAddresses: string[];
}) {
  // 1. Build transaction bytes
  const txBytes = await tx.build({
    client: suiClient,
    onlyTransactionKind: true,
  });

  // 2. Request sponsorship from backend
  const sponsorResponse = await fetch(
    `${BACKEND_URL}/api/sponsor-transaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionKindBytes: toBase64(txBytes),
        sender: currentAccount.address,
        network: "testnet",
        ...(allowedMoveCallTargets && { allowedMoveCallTargets }),
        allowedAddresses,
      }),
    }
  );

  if (!sponsorResponse.ok) {
    const error = await sponsorResponse.json();
    throw new Error(`Sponsorship failed: ${error.error}`);
  }

  const { bytes, digest } = await sponsorResponse.json();

  // 3. Sign with user's zkLogin key
  const { signature } = await signTransaction({ transaction: bytes });
  if (!signature) {
    throw new Error("Error signing transaction");
  }

  // 4. Execute the transaction via backend
  const executeResponse = await fetch(
    `${BACKEND_URL}/api/execute-transaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digest, signature }),
    }
  );

  if (!executeResponse.ok) {
    const error = await executeResponse.json();
    throw new Error(`Execution failed: ${error.error}`);
  }

  await executeResponse.json();
  return true;
}

export default function Home() {
  const currentAccount = useCurrentAccount();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  if (!currentAccount) {
    return (
      <div>
        <h1>You are not logged in.</h1>
        <Link to="/login">Go to Login</Link>
      </div>
    );
  }

  const handleAdd = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tx = new Transaction();
      tx.moveCall({
        target:
          "0xdb5eac8d152382bd1ab938e42e64fca25c2fca8596ac4a026260235d9427e8eb::smart_contract::add",
        arguments: [
          tx.object(
            "0xce1c0b9960f676ded7280fe53a404c8f3971eaa4cb04831b545c47735331e0ad"
          ),
        ],
      });

      await sponsorAndExecute({
        tx,
        suiClient,
        signTransaction,
        currentAccount,
        allowedMoveCallTargets: [
          "0xdb5eac8d152382bd1ab938e42e64fca25c2fca8596ac4a026260235d9427e8eb::smart_contract::add",
        ],
        allowedAddresses: [currentAccount.address],
      });

      alert("Transaction sent successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) {
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amt = Number(amount) * 1e9;
      const tx = new Transaction();
      const coins = await getSuiCoin(
        tx,
        currentAccount.address,
        suiClient,
        BigInt(amt)
      );
      tx.setSender(currentAccount.address);
      tx.transferObjects([coins], recipient);

      await sponsorAndExecute({
        tx,
        suiClient,
        signTransaction,
        currentAccount,
        allowedAddresses: [currentAccount.address, recipient],
      });

      alert("Transaction sent successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Welcome, {currentAccount.address}</h1>
      <p>This is your home page.</p>
      <BalanceComponent ownerAddress={currentAccount.address} />
      <div>
        <h2>Send SUI</h2>

        <div>
          <label>Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
          />
        </div>

        <div>
          <label>Amount</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
          />
        </div>

        <button onClick={handleSend} disabled={isLoading}>
          {isLoading ? "Processing..." : "Send Transaction"}
        </button>

        <button onClick={handleAdd} disabled={isLoading}>
          {isLoading ? "Processing..." : "Add"}
        </button>

        {error && <p>{error}</p>}
      </div>

      <div>
        <LogoutButton />
      </div>
    </div>
  );
}

// 0xce1c0b9960f676ded7280fe53a404c8f3971eaa4cb04831b545c47735331e0ad
