// ─────────────────────────────────────────────────────────────────────────────
// Video en vista (InView)
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
// Contador del carrito (solo el número en el nav, sin lógica de carrito)
// ─────────────────────────────────────────────────────────────────────────────

function updateCartCountNav() {
  const cart  = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('#cart-count').forEach(el => el.textContent = `(${total})`);
}

document.addEventListener('DOMContentLoaded', updateCartCountNav);


// ─────────────────────────────────────────────────────────────────────────────
// jQuery
// ─────────────────────────────────────────────────────────────────────────────

$(document).ready(function () {

  // ───────────────────────────────────────────────────────────────────────────
  // Slideshow (solo en móvil ≤800px)
  // ───────────────────────────────────────────────────────────────────────────

  function slideshow() {
    if ($(window).width() <= 800) {
      const $slideshow = $('.left'),
            $images    = $slideshow.find('img');
      let current = 0;

      // Construir navegación numérica
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

      // Clic sobre imagen para avanzar
      $images.on('click', () => showImage((current + 1) % $images.length));

      // Clic en número de navegación
      $nav.on('click', 'span', function () {
        showImage($(this).index());
      });

      // Swipe táctil
      let startX = 0, deltaX = 0;

      $slideshow.on('touchstart', function (e) {
        startX = e.originalEvent.touches[0].clientX;
      });

      $slideshow.on('touchmove', function (e) {
        deltaX = e.originalEvent.touches[0].clientX - startX;
      });

      $slideshow.on('touchend', function () {
        if (deltaX > 50) {
          showImage((current - 1 + $images.length) % $images.length); // swipe derecha → anterior
        } else if (deltaX < -50) {
          showImage((current + 1) % $images.length);                  // swipe izquierda → siguiente
        }
        startX = deltaX = 0;
      });
    }
  }

  slideshow();

  // ───────────────────────────────────────────────────────────────────────────
  // Navegación AJAX
  // ───────────────────────────────────────────────────────────────────────────

  const origin = window.location.origin + '/';

  function requestContent(data, target) {
    const url = data + '/ajax';
    $('#content').load(url, function (response, status) {
      if (status === 'success') {
        afterContent(data, target);
        const dataScroll = $('body').attr('data-scroll');
        $('body:has(main[ndx--template="shop-ajax"]), body:has(main[ndx--template="shop"])').scrollTop(dataScroll);
        slideshow();
      } else {
        console.error('Error cargando el contenido:', status);
      }
    });
  }

  function afterContent(data, target) {
    const title = $('main').attr('ndx--title') || document.title;

    $('html, body').scrollTop(0);
    $('body').attr('ndx--target-view', target || data || 'home');
    $('link[rel="canonical"]').attr('href', window.location.href);
    $('meta[property="og:url"]').attr('content', window.location.href);
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
    updateCartCountNav();
    InView.observeWithin(document.getElementById('content') || document);
  }

  window.addEventListener('popstate', function (e) {
    const state = e.state;
    requestContent(state && state.url ? state.url : origin + 'shop');
  });

  function getActive() {
    const tv = $('body').attr('ndx--target-view');
    $('nav a:not(.language)').removeClass('active');
    $(`nav a[href$="${tv}"]`).addClass('active');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Guardar posición de scroll en la shop
  // ───────────────────────────────────────────────────────────────────────────

  $('body').on('scroll', function () {
    if ($('main[ndx--template="shop-ajax"], main[ndx--template="shop"]').length) {
      $('body').attr('data-scroll', $(this).scrollTop());
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Click handler: navegación interna sin recarga
  // ───────────────────────────────────────────────────────────────────────────

  $(document).on('click', '.internal, .productteaser, .product button, a[href*="your-order"]', function (e) {
    const href = this.href;
    if (href) {
      e.preventDefault();
      history.pushState({ url: href }, '', href);
      requestContent(href);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Banner de cookies
  // ───────────────────────────────────────────────────────────────────────────

  if (!localStorage.getItem('bannerClosed')) {
    $('.cookie').addClass('banneropen');
  }

  $(document).on('click', '.cta_banner', function () {
    $('.cookie').removeClass('banneropen');
    localStorage.setItem('bannerClosed', 'true');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Filtros de productos
  // ───────────────────────────────────────────────────────────────────────────

  $('.filter span').on('click', function () {
    const $that  = $(this);
    const target = $that.data('target');

    if (!$that.hasClass('on')) {
      $that.addClass('on').removeClass('passive');
      $('.filter span').not($that).addClass('passive').removeClass('on');
      $('.productteaser').addClass('hidden');
      $('.' + target).removeClass('hidden');
    } else {
      $that.removeClass('on');
      $('.productteaser, .filter span').not($that).removeClass('on passive');
      $('.productteaser').removeClass('hidden');
    }
  });

});
