// ─────────────────────────────────────────────────────────────────────────────
// Video en vista (InView)
// ─────────────────────────────────────────────────────────────────────────────

InView.init({
    rootSelector: 'body',
    rootMargin: '200px 0px',
    threshold: 0,
    steps: 10,
    className: 'in-view',
    observePlainImgsToo: false // cambiar a true si también quieres clasificar imágenes <img> normales
  });

  // Registrar elementos presentes al inicio
  InView.observeWithin(document);


// ─────────────────────────────────────────────────────────────────────────────
// 1) Lógica del carrito y otros (se mantiene sin cambios)
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

// 1) addToCart: ahora con objeto de medidas (measurements)
// measurements debería verse así: { chest: 50, inseam: 80, ... }
function addToCart(name, price, size, quantity, measurements = {}, link = window.location.href) {
    document.getElementById("success-message").style.display = "none";
    let existingItem = cart.find(item =>
        item.name === name &&
        item.size === size &&
        JSON.stringify(item.measurements) === JSON.stringify(measurements)
    );
    if (existingItem) {
        existingItem.quantity += parseInt(quantity, 10);
    } else {
      cart.push({
        name,
        price,
        size,
        quantity: parseInt(quantity, 10),
        measurements,
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
  const checkoutBtn      = document.getElementById("checkout-btn");
  const clearCartBtn     = document.getElementById("clear-cart-btn");

  cartItemsDiv.innerHTML = "";
  let total = 0, cartCount = 0;

  cart.forEach((item, idx) => {
      total     += item.price * item.quantity;
      cartCount += item.quantity;

      // Formatear valores de medida: Clave → Title Case + <span>
      const measText = Object.entries(item.measurements)
          .map(([key, val]) => {
              // De "full_length" o "full-length" → "Full Length"
              const label = key
                  .replace(/[-_]/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());
              return `<span class="measurement-name">${label}</span>: ${val}cm`;
          })
          .join(', ');

      cartItemsDiv.innerHTML += `
          <div class="cart-item">
              <span>
                <a class="internal" href="${item.link}">
                  ${item.quantity} × ${item.name} (${item.size})
                </a>
              </span>
              <span class="price">${(item.price * item.quantity).toFixed(2)}€</span>
              <button onclick="removeFromCart(${idx})">Remove</button>
              ${measText ? `<small>${measText}</small>` : ''}
          </div>
      `;
  });

  const shippingCost    = parseFloat(document.getElementById("shipping").value) || 0;
  cartTotalSpan.innerText    = total.toFixed(2);
  cartShippingSpan.innerText = shippingCost.toFixed(2);
  finalTotalSpan.innerText   = (total + shippingCost).toFixed(2);
  cartCountSpan.innerText    = `(${cartCount})`;

  const hasItems = cart.length > 0;
  checkoutBtn.classList.toggle("hidden", !hasItems);
  clearCartBtn.classList.toggle("hidden", !hasItems);

  saveCart();
}

function clearCart() {
    cart = [];
    updateCart();
    localStorage.removeItem("cart");
}

document.addEventListener("DOMContentLoaded", function () {
    loadCart();
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) Bloque principal de jQuery con Slideshow y Navegación AJAX
// ─────────────────────────────────────────────────────────────────────────────

$(document).ready(function () {

    // ─────────────────────────────────────────────────────────────────────────
    // Pase de diapositivas (Slideshow)
    // ─────────────────────────────────────────────────────────────────────────

    function slideshow(){
        if ($(window).width() <= 800) {
          const $slideshow = $('.left'),
                $images    = $slideshow.find('img');
          let current = 0;

          // Construir navegación
          const $nav = $('<div class="slideshow-nav"></div>');
          $images.each((i) => {
            const num = (i + 1).toString().padStart(2, '0');
            $nav.append(`<span>${num}</span>`);
            if (i < $images.length - 1) $nav.append(document.createTextNode(', '));
          });
          $slideshow.append($nav);

          const $navItems = $nav.find('span');
          function showImage(i) {
            $images.removeClass('active').eq(i).addClass('active');
            $navItems.removeClass('active').eq(i).addClass('active');
            current = i;
          }
          showImage(0);

          // Clic para avanzar
          $images.on('click', () => showImage((current + 1) % $images.length));
          $nav.on('click', 'span', function(){
            showImage($(this).index());
          });

          // --- Manejo de gestos táctiles (swipe) ---
          let startX = 0, deltaX = 0;

          $slideshow.on('touchstart', function(e) {
            startX = e.originalEvent.touches[0].clientX;
          });

          $slideshow.on('touchmove', function(e) {
            deltaX = e.originalEvent.touches[0].clientX - startX;
          });

          $slideshow.on('touchend', function() {
            const threshold = 50; // píxeles necesarios para el deslizamiento
            if (deltaX > threshold) {
              // deslizamiento a la derecha → imagen anterior
              showImage((current - 1 + $images.length) % $images.length);
            } else if (deltaX < -threshold) {
              // deslizamiento a la izquierda → siguiente imagen
              showImage((current + 1) % $images.length);
            }
            // restablecer valores
            startX = deltaX = 0;
          });
        }
      }

      // Inicializar
      slideshow();

    // ─────────────────────────────────────────────────────────────────────────
    // Navegación AJAX
    // ─────────────────────────────────────────────────────────────────────────

    const origin      = window.location.origin + '/',
          originRegex = new RegExp(`${window.location.protocol}//(www\\.)?${window.location.host}/`, 'gm');

    function requestContent(data, target) {
        const url = data + '/ajax';
        $('#content').load(url, function(response, status) {
            if (status === "success") {
                afterContent(data, target);
                var dataScroll = $('body').attr('data-scroll');
                console.log(dataScroll)
                $('body:has(main[ndx--template="shop-ajax"]), body:has(main[ndx--template="shop"])').scrollTop(dataScroll)
                slideshow();
            } else {
                console.error("Error cargando el contenido:", status);
            }
        });
    }

    function afterContent(data, target) {
        const url   = window.location.href,
              title = $('main').attr('ndx--title') || document.title;

        $('html, body').scrollTop(0);
        $('body').attr('ndx--target-view', target || data || 'home');
        $('link[rel="canonical"]').attr('href', url);
        $('meta[property="og:url"]').attr('content', url);
        $('title').text(title);

        if ($('main[ndx--template*="shop"]').length) {
            $('.filter').removeClass('hidden');
            $('.filter span').removeClass('passive on');
        }
        if ($('main[ndx--template*="cart"]').length) {
            $('.maincart').removeClass('hidden');
        } else {
            $('.maincart').addClass('hidden');
        }

        getActive();
        InView.observeWithin(document.getElementById('content') || document);
    }

    window.addEventListener('popstate', function(e) {
      const state = e.state;
      if (state && state.url) {
        requestContent(state.url);
      } else {
        requestContent(origin + 'shop');
      }
    });

    function getActive() {
        const tv = $('body').attr('ndx--target-view');
        $('nav a:not(.language)').removeClass('active');
        $(`nav a[href$="${tv}"]`).addClass('active');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Obtener desplazamiento (scroll) de la página de inicio
    // ─────────────────────────────────────────────────────────────────────────

    var dataScroll = 0;

    $('body').on('scroll', function () {
      if ( $('main[ndx--template="shop-ajax"], main[ndx--template="shop"]').length ) {
        var scrollTop = $(this).scrollTop();
        $('body').attr('data-scroll', scrollTop);
      }
    });

    // Nueva navegación simple sin efectos visuales
    $(document).on('click', '.internal, .productteaser, .product button, a[href*="your-order"]', function(e) {
        const href = this.href;
        if (href) {
            e.preventDefault();
            // Cambia la URL en la barra del navegador
            history.pushState({ url: href }, '', href);
            // Carga el contenido nuevo inmediatamente
            requestContent(href);
        }
    });    

    // ─────────────────────────────────────────────────────────────────────────
    // Resto del código (Filtros, Banner de cookies, etc.)
    // ─────────────────────────────────────────────────────────────────────────

    if (!localStorage.getItem('bannerClosed')) {
        $('.cookie').addClass('banneropen');
    }

    $(document).on('click', '.cta_banner', function(){
        $('.cookie').removeClass('banneropen');
        localStorage.setItem('bannerClosed','true');
    });

    $('.filter span').on('click', function(){
        const $that  = $(this);
        const target = $that.data('target');
        if (!$that.hasClass('on')) {
            $that.addClass('on').removeClass('passive');
            $('.filter span').not($that).addClass('passive').removeClass('on');
            $('.productteaser').not($that).addClass('hidden');
            $('.' + target).removeClass('hidden');
        } else {
            $that.removeClass('on');
            $('.productteaser, .filter span').not($that).removeClass('on passive');
            $('.productteaser').removeClass('hidden');
        }
    });

});