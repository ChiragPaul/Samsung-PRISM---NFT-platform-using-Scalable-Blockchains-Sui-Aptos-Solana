param(
    [string]$PackageId,
    [string]$MarketplaceId,
    [string]$SellerAddress,
    [string]$BuyerAddress,
    [string]$SellerLoyaltyId,
    [string]$BuyerLoyaltyId,
    [string]$BuyerPaymentCoinId,
    [int]$RoyaltyBps = 500,
    [long]$ListPriceMist = 1000000000,
    [int]$BatchMintCount = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-TimedCommand {
    param(
        [scriptblock]$ScriptBlock
    )

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $result = & $ScriptBlock
    $sw.Stop()

    [pscustomobject]@{
        TotalMilliseconds = [math]::Round($sw.Elapsed.TotalMilliseconds, 3)
        Result = $result
    }
}

function Invoke-SuiJson {
    param(
        [scriptblock]$ScriptBlock
    )

    $raw = & $ScriptBlock
    if (-not $raw) {
        return $null
    }

    $raw | ConvertFrom-Json
}

if (-not $PackageId -or -not $MarketplaceId -or -not $SellerAddress -or -not $BuyerAddress -or -not $SellerLoyaltyId -or -not $BuyerLoyaltyId -or -not $BuyerPaymentCoinId) {
    throw "Missing required parameters. Example: .\scripts\benchmark.ps1 -PackageId <id> -MarketplaceId <id> -SellerAddress <addr> -BuyerAddress <addr> -SellerLoyaltyId <id> -BuyerLoyaltyId <id> -BuyerPaymentCoinId <coinId>"
}

$report = New-Object System.Collections.Generic.List[object]

Write-Host "Switching to seller address $SellerAddress..."
sui client switch --address $SellerAddress | Out-Null

$mint1 = Invoke-TimedCommand {
    sui client call --package $PackageId --module nft --function mint_nft --args "Bench NFT A" "Benchmark NFT" "https://example.com/image.jpg" $RoyaltyBps --gas-budget 20000000 --json | Out-Null
}
$report.Add([pscustomobject]@{ Operation = 'mint_nft'; Tx = 1; LatencyMs = $mint1.TotalMilliseconds })

$mintedA = Invoke-SuiJson {
    sui client call --package $PackageId --module nft --function mint_nft --args "Bench NFT B" "Benchmark NFT" "https://example.com/image.jpg" $RoyaltyBps --gas-budget 20000000 --json
}
$nftA = ($mintedA.objectChanges | Where-Object { $_.type -eq 'created' -and $_.objectType -like "*::nft::NFT" } | Select-Object -First 1).objectId
$report.Add([pscustomobject]@{
    Operation = 'mint_nft'
    Tx = 2
    LatencyMs = $null
    Note = "Minted NFT id: $nftA"
})

$list1 = Invoke-TimedCommand {
    sui client call --package $PackageId --module marketplace --function list_nft --args $MarketplaceId $nftA $ListPriceMist --gas-budget 20000000 --json | Out-Null
}
$report.Add([pscustomobject]@{ Operation = 'list_nft'; Tx = 1; LatencyMs = $list1.TotalMilliseconds })

Write-Host "Switching to buyer address $BuyerAddress..."
sui client switch --address $BuyerAddress | Out-Null

$buy1 = Invoke-TimedCommand {
    sui client call --package $PackageId --module marketplace --function buy_nft --args $MarketplaceId $nftA $BuyerPaymentCoinId $BuyerLoyaltyId --gas-budget 30000000 --json | Out-Null
}
$report.Add([pscustomobject]@{ Operation = 'buy_nft'; Tx = 1; LatencyMs = $buy1.TotalMilliseconds })

Write-Host "Switching back to seller address $SellerAddress..."
sui client switch --address $SellerAddress | Out-Null

$mintedC = Invoke-SuiJson {
    sui client call --package $PackageId --module nft --function mint_nft --args "Bench NFT C" "Benchmark NFT" "https://example.com/image.jpg" $RoyaltyBps --gas-budget 20000000 --json
}
$nftC = ($mintedC.objectChanges | Where-Object { $_.type -eq 'created' -and $_.objectType -like "*::nft::NFT" } | Select-Object -First 1).objectId

$list2 = Invoke-TimedCommand {
    sui client call --package $PackageId --module marketplace --function list_nft --args $MarketplaceId $nftC $ListPriceMist --gas-budget 20000000 --json | Out-Null
}
$report.Add([pscustomobject]@{ Operation = 'list_nft'; Tx = 2; LatencyMs = $list2.TotalMilliseconds })

$cancel1 = Invoke-TimedCommand {
    sui client call --package $PackageId --module marketplace --function cancel_listing --args $MarketplaceId $nftC --gas-budget 20000000 --json | Out-Null
}
$report.Add([pscustomobject]@{ Operation = 'cancel_listing'; Tx = 1; LatencyMs = $cancel1.TotalMilliseconds })

$sw = [System.Diagnostics.Stopwatch]::StartNew()
1..$BatchMintCount | ForEach-Object {
    sui client call --package $PackageId --module nft --function mint_nft --args "TPS NFT $_" "TPS Benchmark" "https://example.com/image.jpg" $RoyaltyBps --gas-budget 20000000 --json | Out-Null
}
$sw.Stop()

$batchTps = if ($sw.Elapsed.TotalSeconds -gt 0) { [math]::Round($BatchMintCount / $sw.Elapsed.TotalSeconds, 3) } else { 0 }

Write-Host ""
Write-Host "Latency summary:"
$report | Format-Table -AutoSize
Write-Host ""
Write-Host "Batch throughput:"
[pscustomobject]@{
    Transactions = $BatchMintCount
    Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 3)
    TPS = $batchTps
} | Format-Table -AutoSize
