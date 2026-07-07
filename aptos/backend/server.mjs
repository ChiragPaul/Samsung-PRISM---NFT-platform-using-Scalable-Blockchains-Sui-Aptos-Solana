import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";
const APTOS_NETWORK = process.env.APTOS_NETWORK ?? "testnet";
const FULLNODE_URL =
  process.env.APTOS_FULLNODE_URL ?? "https://fullnode.testnet.aptoslabs.com/v1";
const INDEXER_URL =
  process.env.APTOS_INDEXER_URL ?? "https://api.testnet.aptoslabs.com/v1/graphql";
const MODULE_ADDRESS =
  process.env.APTOS_MODULE_ADDRESS ??
  "0x7ff96292c8374435778564e0a738baa0867dee0d43bc08e7363cfef6c0dabc44";
const MARKETPLACE_ACCOUNT =
  process.env.APTOS_MARKETPLACE_ACCOUNT ?? MODULE_ADDRESS;
const REAL_NFT_MODULE_NAME = "RealNFT";
const MARKETPLACE_MODULE_NAME = "Marketplace";
const REAL_NFT_STORE = `${MODULE_ADDRESS}::${REAL_NFT_MODULE_NAME}::NFTStore`;
const MARKETPLACE_STORE = `${MODULE_ADDRESS}::${MARKETPLACE_MODULE_NAME}::MarketplaceStore`;
const REAL_NFT_VALUE_TYPE = `${MODULE_ADDRESS}::${REAL_NFT_MODULE_NAME}::NFT`;
const MARKETPLACE_LISTING_VALUE_TYPE = `${MODULE_ADDRESS}::${MARKETPLACE_MODULE_NAME}::Listing`;
const OCTAS_PER_APT = 100_000_000n;
const IPFS_GATEWAY =
  process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
const WATCHED_ACCOUNTS = Array.from(
  new Set(
    (process.env.APTOS_WATCHED_ACCOUNTS ?? MODULE_ADDRESS)
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
);

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function ipfsToHttp(url = "") {
  return url.startsWith("ipfs://") ? url.replace("ipfs://", IPFS_GATEWAY) : url;
}

function normalizeAddress(value = "") {
  return String(value).toLowerCase();
}

function formatOctasAsApt(value) {
  const raw = typeof value === "number" ? String(value) : String(value ?? "");
  if (!raw || raw === "--") {
    return "--";
  }

  const octas = BigInt(raw);
  const whole = octas / OCTAS_PER_APT;
  const fraction = octas % OCTAS_PER_APT;

  if (fraction === 0n) {
    return whole.toString();
  }

  return `${whole.toString()}.${fraction
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "")}`;
}

function isRenderableMetadataUri(uri = "") {
  return (
    uri.startsWith("ipfs://") ||
    uri.startsWith("https://") ||
    uri.startsWith("http://")
  );
}

async function fetchJson(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(
        typeof data?.message === "string"
          ? data.message
          : `Request failed with status ${response.status}`
      );
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
}