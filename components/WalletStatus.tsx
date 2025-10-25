"use client";

import { useAccount } from 'wagmi';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity } from '@coinbase/onchainkit/identity';
import { useMyCredential } from '@/lib/hooks/useCredential';
import { CredentialType } from '@/lib/contracts/config';

export function WalletStatus() {
  const { isConnected } = useAccount();
  const { credential, isLoading } = useMyCredential();

  const getCredentialBadge = () => {
    if (!isConnected || isLoading) return null;
    if (!credential) return <span className="text-xs text-gray-500">No Credential</span>;

    const credentialLabel =
      credential.credentialType === CredentialType.Doctor ? 'Doctor' : 'Pharmacist';
    const isValid = credential.isActive && BigInt(Date.now()) < credential.expiresAt * 1000n;

    return (
      <span
        className={`text-xs px-2 py-1 rounded ${
          isValid
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {credentialLabel} {!isValid && '(Inactive)'}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-4">
      {isConnected && <div>{getCredentialBadge()}</div>}
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className="text-gray-500" />
          </Identity>
          {credential && (
            <div className="px-4 py-2 border-t">
              <div className="text-sm font-medium">Credential</div>
              <div className="text-xs text-gray-600">
                Type: {credential.credentialType === CredentialType.Doctor ? 'Doctor' : 'Pharmacist'}
              </div>
              <div className="text-xs text-gray-600">
                Specialty: {credential.specialty}
              </div>
              <div className="text-xs text-gray-600">
                Expires: {new Date(Number(credential.expiresAt) * 1000).toLocaleDateString()}
              </div>
            </div>
          )}
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}
