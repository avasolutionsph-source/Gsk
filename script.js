(function () {
  "use strict";

  // ---------- Bundle preselect from URL query (?bundle=3+Boxes) ----------
  const bundleSelect = document.getElementById("bundle");
  const bundleMap = {
    "1 Box": "1 Box - ₱1,300",
    "2 Boxes": "2 Boxes - ₱2,400",
    "3 Boxes": "3 Boxes - ₱3,300",
  };

  if (bundleSelect) {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("bundle");
    const value = requested && bundleMap[requested];
    if (value) {
      bundleSelect.value = value;
      bundleSelect.classList.add("flash");
      setTimeout(() => bundleSelect.classList.remove("flash"), 800);
    }
  }

  // ---------- Order form handling ----------
  const form = document.getElementById("orderForm");
  const success = document.getElementById("formSuccess");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      const payload = {
        fullName: (data.get("fullName") || "").toString().trim(),
        contact: (data.get("contact") || "").toString().trim(),
        address: (data.get("address") || "").toString().trim(),
        bundle: (data.get("bundle") || "").toString(),
        payment: (data.get("payment") || "").toString(),
        submittedAt: new Date().toISOString(),
      };

      // Persist locally so the order isn't lost on a static page.
      try {
        const orders = JSON.parse(localStorage.getItem("gsk_orders") || "[]");
        orders.push(payload);
        localStorage.setItem("gsk_orders", JSON.stringify(orders));
      } catch (err) {
        // localStorage may be unavailable in some contexts — ignore.
      }

      // Reveal success state and scroll into view.
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Order Submitted ✓";
      }
      if (success) {
        success.hidden = false;
        success.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Reset after a delay so users can place another order if needed.
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Order GSK Dragonfruit Plus Now";
        }
      }, 6000);
    });
  }

  // ---------- Smooth scroll for anchor links (fallback for older browsers) ----------
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ---------- Header solid state on scroll ----------
  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const marqueeTop = document.querySelector(".marquee-top");
  if (header) {
    const updateHeaderState = () => {
      const isMobile = window.innerWidth <= 980;
      let past;
      if (isMobile) {
        past = window.scrollY > 40;
      } else if (hero) {
        past = hero.getBoundingClientRect().bottom < 80;
      } else {
        past = window.scrollY > 40;
      }
      header.classList.toggle("is-solid", past);

      if (marqueeTop) {
        const h = marqueeTop.offsetHeight;
        const offset = Math.max(0, h - window.scrollY);
        document.documentElement.style.setProperty("--header-top", offset + "px");
      }
    };
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    window.addEventListener("resize", updateHeaderState, { passive: true });
    updateHeaderState();
  }

  // ---------- Mobile nav toggle ----------
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks && header) {
    const closeNav = () => {
      header.classList.remove("is-open");
      document.body.classList.remove("nav-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    const openNav = () => {
      header.classList.add("is-open");
      document.body.classList.add("nav-open");
      navToggle.setAttribute("aria-expanded", "true");
    };
    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      header.classList.contains("is-open") ? closeNav() : openNav();
    });
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 980) closeNav();
    });
  }

  // ---------- Reviews "see more" toggle ----------
  const reviewsGrid = document.getElementById("reviewsGrid");
  const reviewsToggle = document.getElementById("reviewsToggle");
  if (reviewsGrid && reviewsToggle) {
    const cards = Array.from(reviewsGrid.querySelectorAll(".review-card"));
    const visible = parseInt(reviewsGrid.dataset.visible, 10) || 6;
    const toggleText = reviewsToggle.querySelector(".reviews-toggle-text");
    const hiddenCount = Math.max(0, cards.length - visible);

    if (hiddenCount === 0) {
      reviewsToggle.style.display = "none";
    } else {
      cards.forEach((card, i) => {
        if (i >= visible) card.classList.add("is-hidden");
      });
      if (toggleText) toggleText.textContent = `See more reviews (${hiddenCount})`;

      reviewsToggle.addEventListener("click", () => {
        const expanded = reviewsGrid.classList.toggle("is-expanded");
        reviewsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        if (toggleText) {
          toggleText.textContent = expanded ? "Show less" : `See more reviews (${hiddenCount})`;
        }
        if (!expanded) {
          // Scroll back to the reviews heading so the user isn't stranded down-page.
          const reviewsSection = reviewsGrid.closest(".reviews");
          if (reviewsSection) reviewsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }

  // ---------- Featured videos carousel ----------
  const carousel = document.getElementById("videoCarousel");
  if (carousel) {
    const cards = Array.from(carousel.querySelectorAll(".video-card"));
    const dots = Array.from(carousel.querySelectorAll(".vc-dot"));
    const prevBtn = carousel.querySelector(".vc-prev");
    const nextBtn = carousel.querySelector(".vc-next");
    let active = 0;

    const render = () => {
      const total = cards.length;
      cards.forEach((card, i) => {
        card.classList.remove("is-active", "is-prev", "is-next");
        const video = card.querySelector("video");
        if (i === active) {
          card.classList.add("is-active");
        } else if (i === (active - 1 + total) % total) {
          card.classList.add("is-prev");
          if (video && !video.paused) video.pause();
        } else if (i === (active + 1) % total) {
          card.classList.add("is-next");
          if (video && !video.paused) video.pause();
        } else if (video && !video.paused) {
          video.pause();
        }
      });
      dots.forEach((dot, i) => dot.classList.toggle("is-active", i === active));
    };

    const go = (i) => {
      const total = cards.length;
      active = ((i % total) + total) % total;
      render();
    };

    prevBtn && prevBtn.addEventListener("click", () => go(active - 1));
    nextBtn && nextBtn.addEventListener("click", () => go(active + 1));
    cards.forEach((card, i) => {
      card.addEventListener("click", (e) => {
        if (i === active) return;
        if (e.target.closest("video")) return;
        go(i);
      });
    });
    dots.forEach((dot, i) => dot.addEventListener("click", () => go(i)));

    // Touch swipe
    let touchStartX = null;
    carousel.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", (e) => {
      if (touchStartX == null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) go(dx < 0 ? active + 1 : active - 1);
      touchStartX = null;
    });

    render();
  }

  // ---------- Reveal-on-scroll animations ----------
  if ("IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {

    const tag = (selector, animClass, baseDelay = 0, stagger = 0) => {
      document.querySelectorAll(selector).forEach((el, i) => {
        el.classList.add(animClass);
        el.style.setProperty("--reveal-delay", `${baseDelay + i * stagger}s`);
      });
    };

    // Section-level fades
    tag(".section-head", "reveal");
    tag(".problem-copy", "reveal-left");
    tag(".intro-visual", "reveal-left");
    tag(".intro-copy", "reveal-right");
    tag(".final-copy", "reveal-left");
    tag(".order-form", "reveal-right");

    // Staggered card reveals
    tag(".problem-card", "reveal", 0, 0.08);
    tag(".price-card", "reveal-zoom", 0, 0.1);
    tag(".ing-card", "reveal", 0, 0.06);
    tag(".ben-card", "reveal", 0, 0.07);

    const allTargets = document.querySelectorAll(
      ".reveal, .reveal-left, .reveal-right, .reveal-zoom"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    allTargets.forEach((t) => io.observe(t));
  }
})();
