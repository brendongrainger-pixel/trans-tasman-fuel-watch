const brandLabel = document.getElementById("brandLabel");
const tickerLine = document.getElementById("tickerLine");

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

async function load() {
  const response = await fetch("/api/dashboard");
  if (!response.ok) throw new Error(`Dashboard request failed with ${response.status}`);
  const data = await response.json();
  brandLabel.textContent = data.brand.channelName;

  const au = data.countries.au.summary;
  const nz = data.countries.nz.summary;
  const items = [
    `AU lowest stock: ${au.tightestFuel} ${formatNumber(au.tightestDays, 1)}d`,
    `NZ lowest stock: ${nz.tightestFuel} ${formatNumber(nz.tightestDays, 1)}d`,
    data.market.brent.current === null
      ? "Brent unavailable"
      : `Brent ${formatNumber(data.market.brent.current, 2)} USD/bbl`,
    data.market.audUsd.current === null
      ? "AUD/USD unavailable"
      : `AUD/USD ${formatNumber(data.market.audUsd.current, 4)}`,
  ];

  tickerLine.innerHTML = items
    .concat(items)
    .map((item) => `<span class="ticker-pill">${item}</span>`)
    .join("");
}

load().catch((error) => {
  brandLabel.textContent = "Fuel Watch";
  tickerLine.innerHTML = `<span class="ticker-pill">${error.message}</span>`;
});

setInterval(() => {
  load().catch((error) => console.error(error));
}, 60000);
