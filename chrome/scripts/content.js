// Atrapa el click de cooconvertor.js del popup
chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.action === "convertCurrencies") {
    await createPortfolioValueChart();
    await convertCurrencies();
    sendResponse({ result: "Conversion started" });
  }
  return true;
});

// formato date de cocos al de rates.json
function formatDate(dateStr) {
  const months = {
    Ene: "01",
    Feb: "02",
    Mar: "03",
    Abr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Ago: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dic: "12",
  };
  const parts = dateStr.split(" ");
  const day = parts[0].padStart(2, "0");
  const month = months[parts[1]];
  const year = parts[2];
  return `${day}/${month}/${year}`;
}

async function fetchRates() {
  try {
    const response = await fetch(chrome.runtime.getURL("scripts/rates.json"));
    const ratesArray = await response.json();
    const rates = ratesArray.reduce((acc, rateEntry) => {
      acc[rateEntry.date] = rateEntry.rate.replace(",", ".");
      return acc;
    }, {});
    return rates;
  } catch (error) {
    console.error("Error fetching local rates:", error);
  }
}

function convertToUSD(amountStr, rate) {
  const valueInPesos = parseFloat(
    amountStr.replace("AR$", "").replace(/\./g, "").replace(/,/, ".")
  );
  return (valueInPesos / rate).toFixed(2);
}

// Convierte los montos de las operaciones de compra/venta a USD
async function convertCurrencies() {
  const rates = await fetchRates();
  const rows = document.querySelectorAll(".styles_cashRow__ITVXM");

  rows.forEach((row) => {
    const dateElement = row.querySelector(".styles_date__8B2RV");
    const priceElement = row.querySelector(
      ".styles_numbers__LAjlU:not(:last-child)"
    );
    const totalElement = row.querySelector(
      ".styles_numbers__LAjlU:nth-last-child(2)"
    );
    const quantity = row.querySelector(".styles_numbers__LAjlU:last-child");

    if (dateElement && priceElement && totalElement) {
      const dateText = formatDate(dateElement.innerText);
      const rate = rates[dateText];

      if (rate) {
        convertAmountElement(priceElement, rate);
        convertAmountElement(totalElement, rate);
      }
    }
  });
}

function convertAmountElement(element, rate) {
  let amountText = element.innerText;
  let isNegative = amountText.includes("-");
  let amountValue = amountText
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(/,/, ".");

  if (amountValue) {
    const valueInPesos = parseFloat(amountValue);
    if (!isNaN(valueInPesos)) {
      const convertedValue = (valueInPesos / rate).toFixed(2);
      element.innerText = `${isNegative ? "-" : ""}$${convertedValue} USD`;
    }
  }
}

// Crea el chart con las operaciones de compra/venta en USD
async function createPortfolioValueChart() {
  const rates = await fetchRates();
  const operationsByDate = {};

  document.querySelectorAll(".styles_cashRow__ITVXM").forEach((row) => {
    const dateElement = row.querySelector(".styles_date__8B2RV");
    const totalElement = row.querySelector(
      ".styles_numbers__LAjlU:nth-last-child(2)"
    );
    const operationTypeElement = row.querySelector(
      ".styles_numbers__LAjlU:not(:last-child)"
    );

    if (dateElement && totalElement && operationTypeElement) {
      const dateText = formatDate(dateElement.innerText);
      const rate = rates[dateText];

      if (rate) {
        let totalText = totalElement.innerText;
        let totalValue = parseFloat(totalText.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(/,/, '.'));
        console.log(totalValue, totalText);

        if (!isNaN(totalValue)) {
          let totalValueUSD = totalValue / rate;
          if (!operationsByDate[dateText]) {
            operationsByDate[dateText] = 0;
          }
          operationsByDate[dateText] += totalValueUSD;
        }
      }
    }
  });

  const sortedDates = Object.keys(operationsByDate).sort(
    (a, b) =>
      new Date(a.split("/").reverse().join("-")) -
      new Date(b.split("/").reverse().join("-"))
  );
  let cumulativeSum = 0;
  let cumulativeValuesByDate = sortedDates.reduce((acc, date) => {
    cumulativeSum += operationsByDate[date];
    acc[date] = cumulativeSum;
    return acc;
  }, {});

  const chartLabels = Object.keys(cumulativeValuesByDate);
  const chartData = chartLabels.map((label) => cumulativeValuesByDate[label]);

  const canvasId = "my-chart";
  let canvas = document.getElementById(canvasId);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = canvasId;
    canvas.width = 900;
    canvas.height = 300;
    canvas.style.width = "900px";
    canvas.style.height = "300px";

    const insertionPoint = document.querySelector(".styles_cashHeader__Fgblt");
    if (insertionPoint) {
      insertionPoint.parentNode.insertBefore(canvas, insertionPoint);
    } else {
      document.body.insertBefore(canvas, document.body.firstChild);
    }
  }

  const ctx = canvas.getContext("2d");
  const myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Valor Portfolio (Basado compra/venta en USD)",
          data: chartData,
          backgroundColor: "rgba(0, 123, 255, 0.2)",
          borderColor: "rgba(0, 123, 255, 1)",
          borderWidth: 1,
          fill: true,
        },
      ],
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
        },
      },
    },
  });
}

function loadChartJs() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("scripts/chart.umd.min.js");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Chart.js failed to load."));
    document.head.appendChild(script);
  });
}
