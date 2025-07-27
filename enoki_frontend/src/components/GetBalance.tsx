import { useSuiClientQueries } from "@mysten/dapp-kit";
import React from "react";

interface BalanceComponentProps {
  ownerAddress: string;
  loadingMessage?: string;
  errorMessage?: string;
}

export const BalanceComponent: React.FC<BalanceComponentProps> = ({
  ownerAddress,
  loadingMessage = "Loading balances...",
  errorMessage = "Error fetching balances",
}) => {
  const { data, isPending, isError } = useSuiClientQueries({
    queries: [
      {
        method: "getAllBalances",
        params: {
          owner: ownerAddress,
          coinType: "0x2::sui::SUI",
        },
      }
    ],
    combine: (result) => {
      return {
        data: result.map((res) => res.data),
        isSuccess: result.every((res) => res.isSuccess),
        isPending: result.some((res) => res.isPending),
        isError: result.some((res) => res.isError),
      };
    },
  });

  if (isPending) {
    return <div>{loadingMessage}</div>;
  }

  if (isError) {
    return <div>{errorMessage}</div>;
  }

  return (
    <div>
      {(() => {
        const firstResult = data?.[0];
        if (Array.isArray(firstResult)) {
          const totalSui = firstResult
            .reduce((sum, item) => sum + Number(item.totalBalance), 0);
          return (
            <div>
              <strong>Total SUI Balance:</strong> {totalSui / 1e9}
            </div>
          );
        } else {
          return (
            <div>
              <strong>Total SUI Balance:</strong> 0
            </div>
          );
        }
      })()}
    </div>
  );
};
