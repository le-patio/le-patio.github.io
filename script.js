// ─────────────────────────────────────────────────────────────────────────────
// 1) Video & Image Visibility (InView)
// ─────────────────────────────────────────────────────────────────────────────

InView.init({
    rootSelector: 'body',
    rootMargin: '200px 0px',
    threshold: 0,
    steps: 10,
    className: 'in-view',
    observePlainImgsToo: false 
});

InView.observeWithin(document);

// ─────────────────────────────────────────────────────────────────────────────
// 2) Jewelry Cart Logic
// ─────────────────────────────────────────────────────────────────────────────

let cart = [];

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}

function loadCart() {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCart();
    }
}

/**
 * addToCart: Adapted for Rings and Jewelry
 * @param {string} ringSize - Range 3 to 24
 */
function addToCart(name, price, ringSize, quantity, link = window.location.href) {
    const successMsg = document.getElementById("success-message");
    if (successMsg) successMsg.style.display = "none";

    // Buscar si el mismo anillo con la misma talla ya está en el carrito
    let existingItem = cart.find(item =>
        item.name === name &&
        item.ringSize === ringSize
    );

    if (existingItem) {
        existingItem.quantity += parseInt(quantity, 10);
    } else {
        cart.push({
            name,
            price: parseFloat(price),
            ringSize,
            quantity: parseInt(quantity, 10),
            link
        });
    }
    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function updateCart() {
    const cartItemsDiv     = document.getElementById("cart-items");
    const cartTotalSpan    = document.getElementById("cart-total");
    const cartShippingSpan = document.getElementById("cart-shipping");
    const finalTotalSpan   = document.getElementById("final-total");
    const cartCountSpan    = document.getElementById("cart-count");
    const paypalContainer  = document.getElementById("paypal-button-container");

    if (!cartItemsDiv) return;

    cartItemsDiv.innerHTML = "";
    let total = 0, cartCount = 0;

    cart.forEach((item, idx) => {
        total     += item.price * item.quantity;
        cartCount += item.quantity;

        cartItemsDiv.innerHTML += `
            <div class="cart-item">
                <span>
                    <a class="internal" href="${item.link}">
                        ${item.quantity} × ${item.name} (Size: ${item.ringSize})
                    </a>
                </span>
                <span class="price">${(item.price * item.quantity).toFixed(2)}€</span>
                <button onclick="removeFromCart(${idx})">Remove</button>
            </div>
        `;
    });

    const shippingCost = parseFloat(document.getElementById("shipping")?.value) || 0;
    
    if (cartTotalSpan) cartTotalSpan.innerText = total.toFixed(2);
    if (cartShippingSpan) cartShippingSpan.innerText = shippingCost.toFixed(2);
    if (finalTotalSpan) finalTotalSpan.innerText = (total + shippingCost).toFixed(2);
    if (cartCountSpan) cartCountSpan.innerText = `(${cartCount})`;

    const hasItems = cart.length > 0;
    if (paypalContainer) paypalContainer.classList.toggle("hidden", !hasItems);

    saveCart();
}

function clearCart() {
    cart = [];
    updateCart();
    localStorage.removeItem("cart");
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) PayPal Integration
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
    loadCart();
    
    if (typeof paypal !== "undefined") {
        paypal.Buttons({
            createOrder: function (data, actions) {
                const totalAmount = parseFloat(document.getElementById("final-total").innerText);
                const items = cart.map(item => ({
                    name: `${item.name} (Size: ${item.ringSize})`,
                    unit_amount: { currency_code: "EUR", value: item.price.toFixed(2) },
                    quantity: item.quantity
                }));

                return actions.order.create({
                    purchase_units: [{
                        amount: {
                            currency_code: "EUR",
                            value: totalAmount.toFixed(2),
                            breakdown: {
                                item_total: { 
                                    currency_code: "EUR", 
                                    value: (totalAmount - (parseFloat(document.getElementById("cart-shipping").innerText) || 0)).toFixed(2) 
                                },
                                shipping: { 
                                    currency_code: "EUR", 
                                    value: (parseFloat(document.getElementById("cart-shipping").innerText) || 0).toFixed(2) 
                                }
                            }
                        },
                        items: items
                    }]
                });
            },
            onApprove: function (data, actions) {
                return actions.order.capture().then(function (details) {
                    document.getElementById("success-message").style.display = "block";
                    
                    // Notificar al backend (Ajustar URL según tu proyecto)
                    fetch("https://tu-tienda-joyas.com/send-order-mail.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ cart: cart })
                    });
                    
                    clearCart();
                });
            }
        }).render("#paypal-button-container");
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) UI Effects: Flash Navigation & Slideshow
// ─────────────────────────────────────────────────────────────────────────────

$(document).ready(function () {

    // Manejo de navegación AJAX con efecto de "Screenshot Flash"
    let isFlashing = false;

    $(document).on('click', '.internal, .productteaser, a[href*="shop"]', async function(e) {
        e.preventDefault();
        if (isFlashing) return;
        isFlashing = true;

        const href = this.href;
        const clickX = e.pageX, clickY = e.pageY;

        try {
            const canvas = await html2canvas(document.documentElement, {
                scale: 0.75,
                useCORS: true
            });

            const url = canvas.toDataURL('image/png');
            const $div = $('<div class="screenshot">')
                .css({
                    'background-image': `url(${url})`,
                    'transform-origin': `${clickX}px ${clickY}px`
                })
                .appendTo('body');

            // Navegar mientras ocurre la animación
            history.pushState({ url: href }, '', href);
            $('#content').load(href + ' #content > *', function() {
                $div.animate({ scale: 0 }, {
                    duration: 750,
                    complete: () => {
                        $div.remove();
                        isFlashing = false;
                        updateCart(); // Refrescar UI tras carga AJAX
                    }
                });
            });
        } catch (err) {
            window.location.href = href; // Fallback si falla el efecto
        }
    });

    // Filtros de categoría (Anillos, Collares, etc.)
    $('.filter span').on('click', function(){
        const target = $(this).data('target');
        $('.filter span').removeClass('on').addClass('passive');
        $(this).addClass('on').removeClass('passive');
        
        if (target === 'all') {
            $('.productteaser').removeClass('hidden');
        } else {
            $('.productteaser').addClass('hidden');
            $('.' + target).removeClass('hidden');
        }
    });
});