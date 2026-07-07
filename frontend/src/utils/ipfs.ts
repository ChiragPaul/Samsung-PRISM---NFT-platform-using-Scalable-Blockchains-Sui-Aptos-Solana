import axios from "axios"

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT

function getPinataJwt() {
  if (!PINATA_JWT || PINATA_JWT === "YOUR_JWT") {
    throw new Error(
      "Pinata JWT missing. Set VITE_PINATA_JWT in frontend/.env before minting."
    )
  }

  return PINATA_JWT
}

function mapPinataError(error: unknown, action: string): Error {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return new Error(
        `Pinata authentication failed during ${action}. Check VITE_PINATA_JWT in frontend/.env.`
      )
    }

    if (error.response?.status) {
      return new Error(`Pinata ${action} failed with status ${error.response.status}`)
    }
  }

  return error instanceof Error ? error : new Error(`Pinata ${action} failed`)
}

export const ipfsToHttp = (url: string) => {
  if (!url) return ""

  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/")
  }

  return url
}

export const ipfsToGatewayUrls = (url: string) => {
  if (!url) {
    return []
  }

  if (!url.startsWith("ipfs://")) {
    return [url]
  }

  const cidPath = url.replace("ipfs://", "")
  return [
    `https://ipfs.io/ipfs/${cidPath}`,
    `https://cloudflare-ipfs.com/ipfs/${cidPath}`,
    `https://gateway.pinata.cloud/ipfs/${cidPath}`,
  ]
}

export const uploadFileToIPFS = async (file: File) => {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          Authorization: `Bearer ${getPinataJwt()}`,
          "Content-Type": "multipart/form-data",
        },
      }
    )

    return `ipfs://${res.data.IpfsHash}`
  } catch (error) {
    throw mapPinataError(error, "file upload")
  }
}

export const uploadJSONToIPFS = async (metadata: Record<string, unknown>) => {
  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          Authorization: `Bearer ${getPinataJwt()}`,
        },
      }
    )

    return `ipfs://${res.data.IpfsHash}`
  } catch (error) {
    throw mapPinataError(error, "metadata upload")
  }
}
