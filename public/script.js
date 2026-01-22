let cart = [];
let total = 0;

// Fetch products from backend
function loadProducts() {
  fetch("/api/products")
    .then(res => res.json())
    .then(products => {
      const productList = document.getElementById("productList");
      productList.innerHTML = "";
      products.forEach(p => {
        const btn = document.createElement("button");
        btn.textContent = `${p.name} - ₱${p.price}`;
        btn.onclick = () => addToCart(p);
        productList.appendChild(btn);
      });
    });
}

// Add product to cart
function addToCart(product) {
  const existing = cart.find(i => i.product_id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ product_id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  updateCart();
}

// Update cart UI
function updateCart() {
  const cartList = document.getElementById("cartList");
  cartList.innerHTML = "";
  total = 0;
  cart.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.name} x ${item.qty} = ₱${item.qty * item.price}`;
    cartList.appendChild(li);
    total += item.qty * item.price;
  });
  document.getElementById("total").textContent = total;
  updateChange();
}

// Update change
function updateChange() {
  const cash = parseFloat(document.getElementById("cash").value) || 0;
  document.getElementById("change").textContent = cash - total >= 0 ? cash - total : 0;
}

// Complete sale
document.getElementById("completeSale").onclick = () => {
  if (cart.length === 0) return alert("Cart is empty!");
  const cash = parseFloat(document.getElementById("cash").value) || 0;
  if (cash < total) return alert("Not enough cash!");

  fetch("/api/sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cart, total })
  })
  .then(res => res.json())
  .then(data => {
    alert("Sale recorded!");
    cart = [];
    document.getElementById("cash").value = "";
    updateCart();
    loadReport();
  });
};

// Load daily report
function loadReport() {
  fetch("/api/report")
    .then(res => res.json())
    .then(data => {
      document.getElementById("totalSales").textContent = data.total_sales;
      document.getElementById("totalIncome").textContent = data.total_income || 0;
    });
}

// Cash input listener
document.getElementById("cash").addEventListener("input", updateChange);
document.getElementById("refreshReport").addEventListener("click", loadReport);

// Initial load
loadProducts();
loadReport();
