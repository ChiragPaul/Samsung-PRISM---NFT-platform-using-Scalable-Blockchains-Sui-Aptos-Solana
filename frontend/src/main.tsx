import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"

import { BrowserRouter } from "react-router-dom"
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react"
import { APTOS_NETWORK } from "./constants/aptos"
import { extractErrorMessage } from "./utils/errors"

createRoot(document.getElementById("root")!).render(
  <AptosWalletAdapterProvider
    autoConnect={false}
    dappConfig={{ network: APTOS_NETWORK }}
    onError={(error) => {
      console.error("WALLET ADAPTER ERROR:", error)
      console.error("WALLET ADAPTER MESSAGE:", extractErrorMessage(error))
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AptosWalletAdapterProvider>
)
