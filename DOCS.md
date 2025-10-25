# Signature

`<Signature />` wraps Wagmi’s `useSignTypedData` and `useSignMessage` to handle EIP-712 typed-data and `personal_sign` (falls back to `eth_sign`).

## Quick start

### EIP-712 example

```tsx
import { Signature } from '@coinbase/onchainkit/signature';
import { encodeAbiParameters } from 'viem';
import { base } from 'viem/chains';

const domain = {
  name: 'EAS Attestation',
  version: '1.0.0',
  chainId: base.id,
  verifyingContract: '0x4200000000000000000000000000000000000021',
};

const types = {
  Attest: [
    { name: 'schema', type: 'bytes32' },
    { name: 'recipient', type: 'address' },
    { name: 'time', type: 'uint64' },
    { name: 'revocable', type: 'bool' },
    { name: 'refUID', type: 'bytes32' },
    { name: 'data', type: 'bytes' },
    { name: 'value', type: 'uint256' },
  ],
};

const message = {
  schema: '0xf58b8b212ef75ee8cd7e8d803c37c03e0519890502d5e99ee2412aae1456cafe',
  recipient: '0x1230000000000000000000000000000000000000000',
  time: BigInt(0),
  revocable: false,
  refUID:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  data: encodeAbiParameters([{ type: 'string' }], ['test attestation']),
  value: BigInt(0),
};

export default function Example() {
  return (
    <Signature
      domain={domain}
      types={types}
      primaryType="Attest"
      message={message}
      label="Sign EIP712"
      onSuccess={(sig) => console.log(sig)}
    />
  );
}
```

### Personal sign example

```tsx
import { Signature } from '@coinbase/onchainkit/signature';

<Signature
  message="Hello, OnchainKit!"
  label="Personal_Sign me"
  onSuccess={(sig) => console.log(sig)}
/>
```

## Components

* **Core:** `<Signature />` (manages lifecycle)
* **Subcomponents:** `<SignatureButton />`, `<SignatureStatus />`, `<SignatureToast />`
* **Status/Toast parts:** `<SignatureLabel />`, `<SignatureIcon />`

## API (Signature)

```tsx
<Signature
  // EIP-712 typed data
  domain={domain}
  types={types}
  message={message}
  primaryType="YourPrimaryType"

  // OR personal_sign
  // message="Hello World"

  // Optional
  label="Sign"
  onSuccess={(signature) => {}}
  onError={(error: APIError) => {}}
  onStatus={(status: LifecycleStatus) => {}}
  resetAfter={5000}
  className="custom-class"
  disabled={false}
/>
```

### Lifecycle states

* `init` → `pending` → `success` | `error` → `reset`

Access via `onStatus`:

```tsx
<Signature
  onStatus={(s) => {
    if (s.statusName === 'success') console.log(s.statusData.signature);
    if (s.statusName === 'error') console.log(s.statusData.message);
  }}
/>
```

### Error handling

Built-in UI for common errors (rejection, invalid message, wallet issues). Custom:

```tsx
<Signature onError={(e: APIError) => {
  console.error(e.code, e.message);
}}/>
```

### Message types

* **EIP-712**: provide `domain`, `types`, `message`, `primaryType`
* **personal_sign**: provide `message` (string/bytes)

### Types

```ts
type SignatureProps = {
  chainId?: number;
  className?: string;
  onSuccess?: (signature: string) => void;
  onStatus?: (status: LifecycleStatus) => void;
  onError?: (error: APIError) => void;
  resetAfter?: number;
} & (
  | { // EIP712
      message: SignTypedDataParameters['message'];
      domain?: SignTypedDataParameters['domain'];
      types: SignTypedDataParameters['types'];
      primaryType: SignTypedDataParameters['primaryType'];
    }
  | { // personal_sign
      message: SignMessageParameters['message'];
      domain?: never; types?: never; primaryType?: never;
    }
) & (
  | { children: React.ReactNode; label?: never; disabled?: never }
  | { children?: never; label?: React.ReactNode; disabled?: boolean }
);

type LifecycleStatus =
  | { statusName: 'init';    statusData: null }
  | { statusName: 'error';   statusData: APIError }
  | { statusName: 'pending'; statusData: { type: MessageType } }
  | { statusName: 'success'; statusData: { signature: `0x${string}`; type: MessageType } };
```

## SignatureButton

```tsx
import { SignatureButton } from '@coinbase/onchainkit/signature';

<SignatureButton
  label="Sign Message"
  connectLabel="Connect Wallet"
  errorLabel="Try Again"
  successLabel="Signed!"
  pendingLabel="Signing..."
  disabled={false}
  className="custom-class"
/>

// Full control (render prop)
<SignatureButton
  render={({ label, onClick }) => (
    <button onClick={onClick} className="my-custom-signature-button">
      {label}
    </button>
  )}
/>
```

### Props

```ts
type SignatureButtonProps = {
  className?: string;
  disabled?: boolean;
  label?: ReactNode;
  errorLabel?: ReactNode;
  successLabel?: ReactNode;
  pendingLabel?: ReactNode;
  disconnectedLabel?: ReactNode;
  render?: ({
    label, onClick, context,
  }: {
    label: ReactNode;
    onClick: () => void;
    context: SignatureContextType;
  }) => ReactNode;
};
```

---

# Address

Renders a (by default) shortened address with optional copy-on-click.

```tsx
import { Address } from '@coinbase/onchainkit/identity';

<Address address="0x02feeb0AdE57b6adEEdE5A4EEea6Cf8c21BeB6B1" />
<Address address="0x02feeb0..." isSliced={false} />
<Address className="bg-emerald-400 px-2 py-1 rounded" address="0x02fe..." />
```

**Props**

```ts
type AddressProps = {
  address?: Address | null;
  className?: string;
  isSliced?: boolean;               // default: true
  hasCopyAddressOnClick?: boolean;  // default: true
};
```

---

# Badge

Shows an attestation badge (often used with `<Avatar />` / `<Name />`). Tooltip can show attestation info or custom text.

```tsx
import { Badge } from '@coinbase/onchainkit/identity';

<Badge className="badge" />
<Badge className="bg-blue-400 border-white" />
<Badge tooltip />                 // shows attestation name
<Badge tooltip="Coinbase Verified Account" />
```

**Props**

```ts
// BadgeReact
{ className?: string; tooltip?: boolean | string; }
```

Use with identity components (example schema ID for Coinbase Verified can be passed via surrounding `Identity`/provider).

---

# IdentityCard

Comprehensive identity view: resolves ENS/Basenames, shows avatar, supports chain awareness and badge tooltip.

```tsx
import { IdentityCard } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

<IdentityCard
  address="0x4bEf0221d6F7Dd0C969fe46a4e9b339a84F52FDF"
  chain={base}
  schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
  badgeTooltip // or "Coinbase Verified"
/>
```

**Props**

```ts
// IdentityCardReact
{
  address: string;
  chain: Chain;
  className?: string;
  schemaId?: Address | null;
  badgeTooltip?: boolean | string;
}
```

**Resilience:** invalid/missing data gracefully degrades (shortened address, default avatar, etc.).

---

# Name

Displays ENS or Basenames for an address. Style via `className`. Can nest a `<Badge />` when used within `Identity` or provider that supplies `schemaId`.

```tsx
import { Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

<Name address="0x02feeb0..." />
<Name address="0x02feeb0..." chain={base} />
<Name address="0x02feeb0..." className="bg-emerald-400 px-2 py-1 rounded" />
```

---

# Wallet

UI components to connect a (Smart) Wallet, show identity (Avatar/Name/Address/Balance), and present a dropdown. Works well on web and mobile web.

## Minimal

```tsx
import { Wallet } from '@coinbase/onchainkit/wallet';
<Wallet />
```

## Typical composition

```tsx
import {
  ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity } from '@coinbase/onchainkit/identity';
import { color } from '@coinbase/onchainkit/theme';

<Wallet>
  <ConnectWallet>
    <Avatar className="h-6 w-6" />
    <Name />
  </ConnectWallet>
  <WalletDropdown>
    <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
      <Avatar />
      <Name />
      <Address className={color.foregroundMuted} />
    </Identity>
    <WalletDropdownDisconnect />
  </WalletDropdown>
</Wallet>
```

## Extras

* Pre-made dropdown items: `WalletDropdownLink`, `WalletDropdownBasename`, `WalletDropdownFundLink`, `EthBalance`
* Customize connect text via `disconnectedLabel`
* Full control via `ConnectWallet`’s `render` prop
* Example SIWE flow: call `useSignMessage` in `onConnect`

**Key Props**

```ts
// WalletProps
{
  children?: React.ReactNode;
  isSponsored?: boolean;
  className?: string;
} & (
  | { draggable?: true; draggableStartingPosition?: { x: number; y: number } }
  | { draggable?: false; draggableStartingPosition?: never }
);

// ConnectWalletProps (selected)
{
  children?: ReactNode;
  className?: string;
  onConnect?: () => void;
  disconnectedLabel?: ReactNode;
  render?: ({
    label, onClick, context, status, isLoading,
  }) => ReactNode;
}

// WalletDropdownProps (selected)
{
  children?: React.ReactNode;
  className?: string;
  classNames?: { container?: string; qr?: any; swap?: any; };
  swappableTokens?: Token[];
}
```

**Setup note:** configure Wagmi (chains, connectors like `coinbaseWallet`, transports) and wrap with `WagmiProvider`.

---

# isWalletACoinbaseSmartWallet

Utility to verify a sender address is a Coinbase **Smart Wallet proxy** (with expected implementation) before sponsoring a transaction.

## Usage

```tsx
import { isWalletACoinbaseSmartWallet } from '@coinbase/onchainkit/wallet';
import { http, createPublicClient } from 'viem';
import { baseSepolia } from 'viem/chains';
import type { UserOperation } from 'permissionless';

const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const userOperation = { sender: '0x123' } as UserOperation<'v0.6'>;

const res = await isWalletACoinbaseSmartWallet({ client: publicClient, userOp: userOperation });
// res: { isCoinbaseSmartWallet: true } | { isCoinbaseSmartWallet: false, error, code }
```

## Types

```ts
type IsWalletACoinbaseSmartWalletResponse =
  | { isCoinbaseSmartWallet: true }
  | { isCoinbaseSmartWallet: false; error: string; code: string };

type IsWalletACoinbaseSmartWalletOptions = {
  client: PublicClient;
  userOp: RpcUserOperation<'0.6'>;
};
```