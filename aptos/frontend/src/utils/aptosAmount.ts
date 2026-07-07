const OCTAS_PER_APT = 100_000_000

export function formatOctasAsApt(value: string | number) {
  const raw = typeof value === "number" ? String(value) : value
  if (!raw || raw === "--") {
    return "--"
  }

  const octas = BigInt(raw)
  const whole = octas / BigInt(OCTAS_PER_APT)
  const fraction = octas % BigInt(OCTAS_PER_APT)

  if (fraction === 0n) {
    return whole.toString()
  }

  return `${whole.toString()}.${fraction
    .toString()
    .padStart(8, "0")
    .replace(/0+$/, "")}`
}

export function parseAptToOctas(value: string) {
  const normalized = value.trim()

  if (!/^\d+(\.\d{1,8})?$/.test(normalized)) {
    throw new Error("Listing price must be a valid APT amount with up to 8 decimals.")
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".")
  const whole = BigInt(wholePart) * BigInt(OCTAS_PER_APT)
  const fractional = BigInt(fractionalPart.padEnd(8, "0"))

  return (whole + fractional).toString()
}
