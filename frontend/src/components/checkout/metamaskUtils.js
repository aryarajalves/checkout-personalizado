/**
 * Utilitário de integração Web3 direta com a extensão MetaMask / carteiras EVM (window.ethereum).
 * Suporta conexão automática de conta, troca de rede (Polygon, Arbitrum, BSC, Ethereum)
 * e disparo de transações ERC-20 (USDT/USDC) ou moeda nativa (ETH).
 */

export const EVM_NETWORK_CONFIGS = {
  polygon: {
    chainId: '0x89', // 137
    chainName: 'Polygon Mainnet',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrls: ['https://polygon-rpc.com/'],
    blockExplorerUrls: ['https://polygonscan.com/'],
    tokens: {
      USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
    },
  },
  arbitrum: {
    chainId: '0xa4b1', // 42161
    chainName: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io/'],
    tokens: {
      USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
      USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    },
  },
  bsc: {
    chainId: '0x38', // 56
    chainName: 'BNB Smart Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com/'],
    tokens: {
      USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      USDC: { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
    },
  },
  ethereum: {
    chainId: '0x1', // 1
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io/'],
    tokens: {
      USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    },
  },
};

export function isMetaMaskInstalled() {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

/**
 * Codifica uma chamada padrão ERC-20 transfer(address _to, uint256 _value)
 * Method ID: 0xa9059cbb
 */
export function encodeErc20TransferData(recipientAddress, amountFloat, decimals = 6) {
  const cleanRecipient = recipientAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const multiplier = 10 ** decimals;
  const rawUnits = BigInt(Math.round(Number(amountFloat) * multiplier));
  const hexAmount = rawUnits.toString(16).padStart(64, '0');
  return `0xa9059cbb${cleanRecipient}${hexAmount}`;
}

/**
 * Conecta à carteira MetaMask do navegador, troca para a rede selecionada
 * e solicita a assinatura e envio da transação.
 */
export async function payWithMetaMask({ walletAddress, amount, currency, network }) {
  if (!isMetaMaskInstalled()) {
    throw new Error(
      'Extensão MetaMask não detectada neste navegador. Instale a MetaMask ou escaneie o QR Code.'
    );
  }

  const netKey = (network || 'polygon').toLowerCase();
  const currUpper = (currency || 'USDT').toUpperCase();

  if (currUpper === 'BTC') {
    throw new Error('A MetaMask suporta redes EVM (Polygon, Arbitrum, BSC, Ethereum). Para BTC, utilize o QR Code.');
  }

  // 1. Solicita conexão da conta na MetaMask (abre o popup da extensão)
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });

  if (!accounts || accounts.length === 0) {
    throw new Error('Nenhuma conta da MetaMask foi autorizada.');
  }
  const senderAddress = accounts[0];

  // 2. Troca ou adiciona a rede blockchain selecionada
  const netConfig = EVM_NETWORK_CONFIGS[netKey] || EVM_NETWORK_CONFIGS.polygon;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: netConfig.chainId }],
    });
  } catch (switchError) {
    // Código 4902 indica que a rede ainda não foi adicionada à MetaMask do usuário
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: netConfig.chainId,
            chainName: netConfig.chainName,
            nativeCurrency: netConfig.nativeCurrency,
            rpcUrls: netConfig.rpcUrls,
            blockExplorerUrls: netConfig.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw new Error(switchError.message || 'Não foi possível alternar para a rede selecionada na MetaMask.');
    }
  }

  // 3. Monta e dispara a transação na MetaMask
  let txParams;
  const tokenInfo = netConfig.tokens?.[currUpper];

  if (tokenInfo && (currUpper === 'USDT' || currUpper === 'USDC')) {
    const data = encodeErc20TransferData(walletAddress, amount, tokenInfo.decimals);
    txParams = {
      from: senderAddress,
      to: tokenInfo.address,
      value: '0x0',
      data,
    };
  } else {
    // Transferência nativa (ex: ETH)
    const weiValue = BigInt(Math.round(Number(amount) * 1e18));
    txParams = {
      from: senderAddress,
      to: walletAddress,
      value: `0x${weiValue.toString(16)}`,
    };
  }

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [txParams],
  });

  return {
    txHash,
    senderAddress,
  };
}
